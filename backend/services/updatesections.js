const { generateContent } = require("./aiGenerator");
const { calculateLimits } = require("./paragraphMetrics");

const shouldReplace = (title) => {
  const t = title.toLowerCase().trim();

  const keywords = [
    "objective",
    "introduction",
    "abstract",
    "conclusion",
    "summary",
    "discussion",
    "methodology",
    "methods",
    "future work",
    "limitations",
    "literature review",
    "problem statement",
    "objectives",
    "scope",
    "observations",
    "block definition",
    "block diagram",
    "implementation",
    "results",
    "analysis",
    "appendix",
    "application",
    "use case",
    "case study",
  ];

  return keywords.some((k) => t.includes(k));
};

async function updateSections(sections, topic) {
  const updatedSections = [];

  for (const sec of sections) {
    if (!shouldReplace(sec.title)) {
      updatedSections.push(sec);
      continue;
    }

    const rewrittenParagraphs = [];

    for (const paragraph of sec.paragraphs) {
      // Skip paragraphs that never matched an XML index (e.g. from the
      // xmlIndex: -1 fallback) — rewriting text we can't place back into
      // the document is pointless and risks a downstream crash.
      if (paragraph.xmlIndex === -1) {
        rewrittenParagraphs.push(paragraph);
        continue;
      }

      // FIX: calculateLimits expects a string, not the {xmlIndex, text} object
      const metrics = calculateLimits(paragraph.text);

      const rewritten = await generateContent(
        sec.title,
        topic,
        paragraph.text,
        metrics.limits
      );

      // Preserve xmlIndex — this is the whole point of the change.
      rewrittenParagraphs.push({
        xmlIndex: paragraph.xmlIndex,
        text: rewritten,
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