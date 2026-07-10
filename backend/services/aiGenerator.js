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
You are rewriting one section of an academic report.

Original Section Title:
${title}

New Report Topic:
${topic}

Your task is to rewrite EVERY paragraph so that the entire section is about the NEW report topic.

Rules:

1. The original report topic has changed to "${topic}".

2. Rewrite every paragraph so it is specifically about "${topic}".

3. Preserve the PURPOSE of each paragraph.
   Examples:
   - An introduction should remain an introduction.
   - A conclusion should remain a conclusion.
   - A benefits section should still discuss benefits.
   - An experience section should still describe an experience.
   - A feedback section should still describe feedback.

4. Do NOT simply replace words.
   Rewrite the paragraph naturally.

5. Do NOT mention or refer to the original topic.

6. Every paragraph MUST clearly relate to "${topic}".
   Do NOT drift into unrelated topics.

7. Replace old examples with equivalent examples that fit "${topic}".

8. Keep the same number of paragraphs.

9. Keep approximately the same paragraph length.

10. Maintain a formal academic writing style.

11. Do not include introductions, explanations, markdown, or code fences.

Return ONLY valid JSON in exactly this format:

{
  "paragraphs": [
    "...",
    "...",
    "..."
  ]
}

The array MUST contain exactly ${expectedCount} paragraphs.

Original paragraphs:

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