const SKIP_SECTIONS = [
  "certificate", "declaration", "acknowledgment", "acknowledgement",
  "table of contents", "list of figures", "list of tables",
  "list of abbreviations", "references", "bibliography",
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

function isBoldParagraph(p) {
  const runs = p["w:r"] || [];
  let total = 0, bold = 0;
  for (const run of runs) {
    const text = getRunText(run);
    if (!text.trim()) continue;
    total++;
    if (run["w:rPr"]?.[0]?.["w:b"]) bold++;
  }
  return total > 0 && bold >= total / 2;
}

function isCentered(p) {
  const jc = p["w:pPr"]?.[0]?.["w:jc"]?.[0]?.$?.["w:val"];
  return jc === "center";
}

function getHeadingLevel(p) {
  const style = p["w:pPr"]?.[0]?.["w:pStyle"]?.[0]?.$?.["w:val"];
  if (typeof style === "string") {
    const match = style.match(/^Heading(\d)/i);
    if (match) return parseInt(match[1], 10);
  }
  return 0;
}

function isCaption(text) {
  return /^(figure|table|chart)\s+\d+/i.test(text);
}

function shouldSkip(text) {
  const t = text.toLowerCase().trim();
  return SKIP_SECTIONS.some(skip => t.includes(skip));
}

function isSingleLevelNumbered(text) {
  return /^\d+\.?\s*[A-Za-z]/.test(text) && !/^\d+\.\d+/.test(text);
}

function getLeadingNumber(text) {
  const m = text.match(/^(\d+)/);
  return m ? parseInt(m[1], 10) : null;
}

function hasRealParagraph(content) {
  return content.some(
    item => item.type === "paragraph" && item.originalText.length >= MIN_PARAGRAPH_LENGTH
  );
}

function looksLikeHeading(p, text) {
  if (getHeadingLevel(p) >= 1) return true;
  return (isBoldParagraph(p) || isCentered(p)) &&
    text.length <= 70 &&
    !/[.!?]$/.test(text);
}

function findSections(paragraphs) {
  const candidates = [];
  let current = null;

  // Whether current section already has real prose paragraphs.
  // This is the key signal: a numbered line appearing AFTER real prose
  // inside a section is a list item, not a new chapter.
  let currentHasProse = false;

  // Track last opened chapter number so "1.Introduction" → "1. Increased..."
  // (same number) is blocked even before prose appears.
  let lastChapterNum = null;

  for (let i = 0; i < paragraphs.length; i++) {
    const p = paragraphs[i];
    const text = getParagraphText(p);
    if (!text) continue;
    if (isCaption(text)) continue;

    if (shouldSkip(text) && looksLikeHeading(p, text)) {
      current = null;
      currentHasProse = false;
      lastChapterNum = null;
      continue;
    }

    const level = getHeadingLevel(p);
    const numbered = isSingleLevelNumbered(text);
    const num = numbered ? getLeadingNumber(text) : null;

    let isMajor = false;

    if (numbered) {
      const sameNumberAsCurrent = num === lastChapterNum;
      const listContext = currentHasProse; // numbered line after prose = list item

      if (!sameNumberAsCurrent && !listContext) {
        isMajor = true;
      }
    } else if (level === 1) {
      isMajor = true;
    }

    if (isMajor) {
      current = { title: text, content: [] };
      candidates.push(current);
      currentHasProse = false;
      lastChapterNum = num;
      continue;
    }

    if (!current) continue;

    if (text.length >= MIN_PARAGRAPH_LENGTH) {
      currentHasProse = true;
    }

    if (looksLikeHeading(p, text)) {
      current.content.push({ type: "heading", node: p, originalText: text });
    } else {
      current.content.push({ type: "paragraph", node: p, originalText: text });
    }
  }

  return candidates.filter(s => hasRealParagraph(s.content));
}

module.exports = { findSections };