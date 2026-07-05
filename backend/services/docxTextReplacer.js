/**
 * Replace the text content of an original docx paragraph (xml2js-parsed
 * <w:p> object) with new text, WITHOUT touching run properties (rPr),
 * paragraph properties (pPr), or any other XML structure.
 *
 * Strategy: a paragraph can have multiple <w:r> runs (e.g. different
 * formatting mid-sentence). We redistribute the new text across the
 * EXISTING runs proportionally to each run's original text length, so
 * runs that were bold/italic/etc. keep roughly the same relative content
 * instead of dumping everything into the first run and blanking the rest.
 *
 * This is a heuristic, not a perfect mapping — if a run boundary fell
 * mid-word originally, the new boundary might too, but sentence/word
 * structure is preserved and no formatting runs are deleted.
 */

function getRunText(r) {
  const t = r["w:t"]?.[0];
  if (t === undefined) return "";
  return typeof t === "string" ? t : (t._ || "");
}

/**
 * Given a target character index, snap it to the nearest word boundary
 * (space) so a run split never lands in the middle of a word. This fixes
 * a confirmed bug where proportional character-based splitting could
 * produce visible artifacts like "**Import**ant:" when a paragraph mixes
 * bold and plain runs.
 */
function findNearestWordBoundary(text, targetIndex) {
  if (targetIndex <= 0) return 0;
  if (targetIndex >= text.length) return text.length;

  let left = targetIndex;
  while (left > 0 && text[left] !== " ") left--;

  let right = targetIndex;
  while (right < text.length && text[right] !== " ") right++;

  if (text[left] !== " ") return right;
  if (text[right] !== " ") return left;

  return (targetIndex - left <= right - targetIndex) ? left : right;
}

function setRunText(r, newText) {
  // Preserve xml:space="preserve" behavior by always setting it when
  // the text has leading/trailing whitespace, so Word doesn't collapse it.
  const needsPreserve = /^\s|\s$/.test(newText);
  r["w:t"] = [
    needsPreserve ? { _: newText, $: { "xml:space": "preserve" } } : newText,
  ];
}

function replaceParagraphText(paragraph, newText) {
  const runs = paragraph["w:r"] || [];

  if (runs.length === 0) {
    // No runs to put text into (e.g. an empty paragraph) — nothing to do.
    return;
  }

  if (runs.length === 1) {
    setRunText(runs[0], newText);
    return;
  }

  // Multiple runs: redistribute proportionally by original run length.
  const originalLengths = runs.map((r) => getRunText(r).length);
  const totalOriginalLength = originalLengths.reduce((a, b) => a + b, 0);

  if (totalOriginalLength === 0) {
    // All runs were empty (e.g. just formatting marks) — put everything
    // in the first run to avoid losing text.
    setRunText(runs[0], newText);
    for (let i = 1; i < runs.length; i++) setRunText(runs[i], "");
    return;
  }

  let cursor = 0;
  runs.forEach((run, i) => {
    const isLast = i === runs.length - 1;
    if (isLast) {
      setRunText(run, newText.slice(cursor));
      return;
    }
    const proportion = originalLengths[i] / totalOriginalLength;
    const rawSliceEnd = cursor + Math.round(newText.length * proportion);
    let sliceEnd = findNearestWordBoundary(newText, rawSliceEnd);
    // include the trailing space in THIS run so it isn't lost between runs
    if (newText[sliceEnd] === " ") sliceEnd++;
    setRunText(run, newText.slice(cursor, sliceEnd));
    cursor = sliceEnd;
  });
}

/**
 * Replace text across a list of paragraphs given a parallel list of
 * replacement strings (same length and order as paragraphs).
 */
function replaceParagraphsText(paragraphs, replacementTexts) {
  if (paragraphs.length !== replacementTexts.length) {
    throw new Error(
      `Paragraph count (${paragraphs.length}) does not match replacement count (${replacementTexts.length}) — cannot safely map text back.`
    );
  }
  paragraphs.forEach((p, i) => replaceParagraphText(p, replacementTexts[i]));
}

module.exports = { replaceParagraphText, replaceParagraphsText, getRunText };