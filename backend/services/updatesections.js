const { generateContent } = require("./aiGenerator");

async function updateSections(sections, topic) {
  const updatedSections = [];

  for (const sec of sections) {
    const rewrittenParagraphs = [];

    const originalParagraphs = sec.paragraphs.map((paragraph) => ({
      xmlIndex: paragraph.xmlIndex,
      text: paragraph.text,
    }));

    const rewrittenTexts = await generateContent(
      sec.title,
      topic,
      originalParagraphs
    );

    for (let index = 0; index < originalParagraphs.length; index++) {
      const paragraph = originalParagraphs[index];
      const rewrittenText = rewrittenTexts[index] || paragraph.text;

      rewrittenParagraphs.push({
        xmlIndex: paragraph.xmlIndex,
        text: rewrittenText,
      });
    }

    updatedSections.push({
      ...sec,
      paragraphs: rewrittenParagraphs,
    });
  }

  return updatedSections;
}

module.exports = { updateSections };