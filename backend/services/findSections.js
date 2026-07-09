const SKIP_SECTIONS = [
  "certificate",
  "declaration",
  "acknowledgment",
  "acknowledgement",
  "table of contents",
  "list of figures",
  "list of tables",
  "list of abbreviations",
  "references",
  "bibliography",
];

const MIN_PARAGRAPH_LENGTH = 100;

function getRunText(r) {
  const t = r["w:t"]?.[0];
  if (t === undefined) return "";
  return typeof t === "string" ? t : (t._ || "");
}

function getParagraphText(p) {
  return (p["w:r"] || []).map(getRunText).join("").trim();
}

function getHeadingLevel(p) {
  const style = p["w:pPr"]?.[0]?.["w:pStyle"]?.[0]?.$?.["w:val"];
  if (!style) return 0;

  const match = style.match(/^Heading(\d+)/i);
  return match ? Number(match[1]) : 0;
}

function isCaption(text) {
  return /^(figure|table|chart)\s+\d+/i.test(text);
}

function shouldSkip(text) {
  const t = text.toLowerCase();
  return SKIP_SECTIONS.some(s => t.includes(s));
}

function isMajorHeading(p, text) {
  // Heading1 always wins
  if (getHeadingLevel(p) === 1) return true;

  // 1.Introduction
  // 1. Introduction
  // 2 Conclusion
  if (/^\d+\.?\s*[A-Za-z]/.test(text) && !/^\d+\.\d+/.test(text))
    return true;

  return false;
}

function looksLikeHeading(p) {
  return getHeadingLevel(p) >= 2;
}

function hasRealParagraph(section) {
  return section.content.some(
    x =>
      x.type === "paragraph" &&
      x.originalText.length >= MIN_PARAGRAPH_LENGTH
  );
}

function findSections(paragraphs, ignoreCoverPage = false) {

  let start = 0;

  // Skip everything until first numbered chapter / Heading1
  if (ignoreCoverPage) {
    for (let i = 0; i < paragraphs.length; i++) {
      const text = getParagraphText(paragraphs[i]);

      if (!text) continue;

      if (isMajorHeading(paragraphs[i], text)) {
        start = i;
        break;
      }
    }
  }

  const sections = [];
  let current = null;

  for (let i = start; i < paragraphs.length; i++) {

    const p = paragraphs[i];
    const text = getParagraphText(p);

    if (!text) continue;
    if (isCaption(text)) continue;

    if (shouldSkip(text)) {
      current = null;
      continue;
    }

    if (isMajorHeading(p, text)) {

      current = {
        title: text,
        content: [],
      };

      sections.push(current);
      continue;
    }

    if (!current) continue;

    if (looksLikeHeading(p)) {
      current.content.push({
        type: "heading",
        node: p,
        originalText: text,
      });
    } else {
      current.content.push({
        type: "paragraph",
        node: p,
        originalText: text,
      });
    }
  }

  return sections.filter(hasRealParagraph);
}

module.exports = { findSections };