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

function getRunText(run) {
  const textNodes = run.getElementsByTagName("w:t");

  let text = "";

  for (let i = 0; i < textNodes.length; i++) {
    text += textNodes[i].textContent;
  }

  return text;
}

function getParagraphText(paragraph) {
  const runs = paragraph.getElementsByTagName("w:r");

  let text = "";

  for (let i = 0; i < runs.length; i++) {
    text += getRunText(runs[i]);
  }

  return text.trim();
}

function getHeadingLevel(paragraph) {
  const styles = paragraph.getElementsByTagName("w:pStyle");

  if (styles.length === 0) return 0;

  const style = styles[0].getAttribute("w:val");

  if (!style) return 0;

  const match = style.match(/^Heading(\d+)$/i);

  return match ? Number(match[1]) : 0;
}

function isCaption(text) {
  return /^(figure|table|chart)\s+\d+/i.test(text);
}

function shouldSkip(text) {
  const t = text.toLowerCase();

  return SKIP_SECTIONS.some(s => t.includes(s));
}

function isMajorHeading(paragraph, text) {
  if (getHeadingLevel(paragraph) === 1) return true;

  return /^\d+\.?\s*[A-Za-z]/.test(text) &&
         !/^\d+\.\d+/.test(text);
}

function looksLikeHeading(paragraph) {
  return getHeadingLevel(paragraph) >= 2;
}

function hasRealParagraph(section) {
  return section.content.some(
    item =>
      item.type === "paragraph" &&
      item.originalText.length >= MIN_PARAGRAPH_LENGTH
  );
}

function findSections(paragraphs, ignoreCoverPage = false) {

  let start = 0;

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

    const paragraph = paragraphs[i];
    const text = getParagraphText(paragraph);

    if (!text) continue;
    if (isCaption(text)) continue;

    if (shouldSkip(text)) {
      current = null;
      continue;
    }

    if (isMajorHeading(paragraph, text)) {

      current = {
        title: text,
        content: [],
      };
 
      sections.push(current);
      continue;
    }

         if (!current) continue;

    current.content.push({
      type: looksLikeHeading(paragraph) ? "heading" : "paragraph",
      node: paragraph,
      originalText: text,
    });
  }

  return sections.filter(hasRealParagraph);
}

module.exports = { findSections };