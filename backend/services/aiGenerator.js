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

  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch {
    // Fallback if the model wraps JSON in extra text
    const match = content.match(/\{[\s\S]*\}/);

    if (!match) {
      throw new Error("No JSON object found in AI response");
    }

    parsed = JSON.parse(match[0]);
  }

  if (!Array.isArray(parsed.paragraphs)) {
    throw new Error("AI response missing paragraphs array");
  }

  return parsed.paragraphs
    .filter(p => typeof p === "string" && p.trim())
    .slice(0, expectedParagraphCount);
}

async function generateContent(title, topic, paragraphInputs) {

  const normalizedParagraphs = (
    Array.isArray(paragraphInputs)
      ? paragraphInputs
      : [paragraphInputs]
  ).map(p => ({
    text: typeof p === "string" ? p : (p?.text || "")
  }));

  if (normalizedParagraphs.length === 0) {
    return [];
  }

  const paragraphOrder = normalizedParagraphs
    .map((p, i) => `Paragraph ${i + 1}:\n${p.text}`)
    .join("\n\n");

  const expectedCount = normalizedParagraphs.length;

  const prompt = `
Rewrite the following academic report section.

Section Title:
${title}

Report Topic:
${topic}

Rules:
- Rewrite every paragraph independently.
- Preserve meaning.
- Preserve academic tone.
- Do NOT merge paragraphs.
- Do NOT split paragraphs.
- Do NOT add new facts.
- Return EXACTLY ${expectedCount} paragraphs.
- Return ONLY valid JSON.

Return this exact structure:

{
  "paragraphs": [
    "...",
    "...",
    "..."
  ]
}

The array MUST contain exactly ${expectedCount} strings.

${paragraphOrder}
`;

  try {

    const response = await getGroqClient().chat.completions.create({
      model: "llama-3.1-8b-instant",

      response_format: {
        type: "json_object",
      },

      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const aiContent =
      response.choices?.[0]?.message?.content?.trim() || "";

    return parseSectionResponse(aiContent, expectedCount);

  } catch (err) {

    console.error(`AI section rewrite failed for "${title}"`);

    if (err instanceof SyntaxError) {
      console.log("\n========== RAW AI RESPONSE ==========");
      console.log(err.message);
      console.log("=====================================\n");
    }

    console.error(err);

    return normalizedParagraphs.map(p => p.text);
  }
}

module.exports = {
  generateContent,
  parseSectionResponse,
};