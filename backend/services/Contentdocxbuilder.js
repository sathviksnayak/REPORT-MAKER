const { Document, Packer, Paragraph, HeadingLevel } = require("docx");

/**
 * Build a plain, editable .docx from AI-rewritten sections.
 * Each section becomes a Heading1 + body paragraph(s).
 *
 * sections: [{ title: string, content: string }]
 * content is expected to be plain text or simple <p>...</p> HTML from
 * updateSections — we strip tags since docx paragraphs don't need HTML.
 */
function stripHtml(html) {
  return html
    .replace(/<\/p>\s*<p>/gi, "\n\n")
    .replace(/<\/?[^>]+>/g, "")
    .trim();
}

async function buildContentDocx(sections) {
  const children = [];

  sections.forEach((sec) => {
    children.push(
      new Paragraph({
        text: sec.title,
        heading: HeadingLevel.HEADING_1,
      })
    );

    const plainText = stripHtml(sec.content);
    const paragraphs = plainText.split(/\n\n+/).filter(Boolean);

    paragraphs.forEach((para) => {
      children.push(new Paragraph({ text: para }));
    });
  });

  const doc = new Document({
    sections: [{ children }],
  });

  return await Packer.toBuffer(doc);
}

module.exports = { buildContentDocx };