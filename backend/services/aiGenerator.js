const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function generateContent(
  title,
  topic,
  originalParagraph,
  limits
) {
  const {
    minWords,
    maxWords,
    minCharacters,
    maxCharacters,
  } = limits;

  const prompt = `
You are rewriting ONE paragraph from the "${title}" section of an academic report on "${topic}".

Original paragraph:
"""
${originalParagraph}
"""

Rewrite this paragraph.

Requirements:
- Preserve the original meaning.
- Use a formal academic tone.
- Return EXACTLY ONE paragraph.
- Keep between ${minWords} and ${maxWords} words.
- Keep between ${minCharacters} and ${maxCharacters} characters.
- Do NOT add new facts.
- Do NOT use markdown.
- Do NOT use bullet points.
- Return ONLY the rewritten paragraph.
`;

  try {
    const response = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    return response.choices[0].message.content.trim();

  } catch (err) {
    console.error(err);

    // If AI fails, preserve original paragraph.
    return originalParagraph;
  }
}

module.exports = { generateContent };