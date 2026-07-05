/**
 * Small utility for measuring paragraph text and deriving rewrite limits
 * that get fed into the AI prompt, so rewritten text stays close enough
 * in length/shape to be redistributed back into the original docx runs.
 */

function countWords(text) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

function countCharacters(text) {
  return text.trim().length;
}

/**
 * Sentence counting is inherently approximate (abbreviations like "Dr."
 * or "U.S." will over-count). Treat this as a soft signal for prompting,
 * NOT a value you structurally depend on for reconstruction.
 */
function countSentences(text) {
  const ABBREVIATIONS = ["mr", "mrs", "ms", "dr", "prof", "sr", "jr", "vs", "etc", "e.g", "i.e", "u.s", "u.k"];

  // Temporarily mask periods that are part of known abbreviations so they
  // don't get treated as sentence boundaries.
  let masked = text;
  ABBREVIATIONS.forEach((abbr) => {
    const regex = new RegExp(`\\b${abbr.replace(".", "\\.")}\\.`, "gi");
    masked = masked.replace(regex, (m) => m.replace(".", "§"));
  });

  const matches = masked.trim().match(/[^.!?]+[.!?]+/g);
  if (matches) return matches.length;
  return masked.trim().length > 0 ? 1 : 0;
}

/**
 * calculateLimits(text) -> the rewrite constraints to hand to the AI prompt.
 * Percentages are deliberately generous (soft targets), since forcing an
 * AI to hit an exact word/character count degrades output quality.
 */
function calculateLimits(text, options = {}) {
  const {
    wordTolerance = 0.15,   // ±15%
    charTolerance = 0.10,   // ±10%
  } = options;

  const words = countWords(text);
  const characters = countCharacters(text);
  const sentences = countSentences(text);

  return {
    original: { words, characters, sentences },
    limits: {
      minWords: Math.round(words * (1 - wordTolerance)),
      maxWords: Math.round(words * (1 + wordTolerance)),
      minCharacters: Math.round(characters * (1 - charTolerance)),
      maxCharacters: Math.round(characters * (1 + charTolerance)),
      targetSentences: sentences, // soft guideline only, see note above
    },
  };
}

module.exports = {
  countWords,
  countCharacters,
  countSentences,
  calculateLimits,
};