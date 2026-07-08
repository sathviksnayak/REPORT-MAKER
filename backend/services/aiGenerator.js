  const Groq = require("groq-sdk");

let groqClient;

function getGroqClient() {
  if (!groqClient) {
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  return groqClient;
}

function parseSectionResponse(content, expectedParagraphCount) {
  if (!content || typeof content !== "string") {
    throw new Error("Empty AI response");
  }

  const trimmed = content.trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;
  const jsonStart = candidate.indexOf("{");
  const jsonEnd = candidate.lastIndexOf("}");
  const payload = jsonStart >= 0 && jsonEnd > jsonStart
    ? candidate.slice(jsonStart, jsonEnd + 1)
    : candidate;

  const parsed = JSON.parse(payload);

  if (!parsed || !Array.isArray(parsed.paragraphs)) {
    throw new Error("AI response did not contain a paragraphs array");
  }

  return parsed.paragraphs
    .filter((paragraph) => typeof paragraph === "string" && paragraph.trim())
    .slice(0, expectedParagraphCount);
}

async function generateContent(title, topic, paragraphInputs) {
  
  const normalizedParagraphs = (Array.isArray(paragraphInputs) ? paragraphInputs : [paragraphInputs]).map((paragraph) => {
    if (typeof paragraph === "string") {
      return { text: paragraph };
    }

    return {
      text: paragraph?.text || "",
    };
  });

  if (normalizedParagraphs.length === 0) {
    return [];
  }

  const paragraphOrder = normalizedParagraphs
    .map((paragraph, index) => `Paragraph ${index + 1}:\n${paragraph.text}`)
    .join("\n\n");

  const prompt = `
You are rewriting each paragraph in the "${title}" section of an academic report on "${topic}".

Important rules:
- Rewrite EACH paragraph independently.
- Preserve the original meaning.
- Use a formal academic tone.
- Preserve the same number of paragraphs.
- Do NOT merge paragraphs.
- Do NOT split paragraphs.
- Do NOT add new facts.
- Return ONLY valid JSON in this exact format:
{"paragraphs":["rewritten paragraph 1","rewritten paragraph 2"]}
No markdown.
No explanation.
No code fences.

Section title: ${title}
Report topic: ${topic}

Paragraph order:
${paragraphOrder}
`;

  try {
    const response = await getGroqClient().chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const aiContent = response.choices?.[0]?.message?.content?.trim() || "";
    return parseSectionResponse(aiContent, normalizedParagraphs.length);
  } catch (err) {
    console.error(`AI section rewrite failed for "${title}". Reusing original paragraphs.`, err);
    return normalizedParagraphs.map((paragraph) => paragraph.text);
  }
}

module.exports = { generateContent, parseSectionResponse };