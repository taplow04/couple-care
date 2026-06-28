/**
 * Deterministic lexicon sentiment — no ML, fully reproducible. Scores text by
 * counting positive/negative lexicon words + emoji valence. Returns a 0..1
 * positivity ratio (null when no signal) plus the raw counts.
 */
const { POSITIVE_WORDS, NEGATIVE_WORDS, EMOJI_VALENCE } = require("../config/rules");

const POS = new Set(POSITIVE_WORDS);
const NEG = new Set(NEGATIVE_WORDS);

// Split into emoji code points + word tokens.
const EMOJI_RE = /\p{Extended_Pictographic}/u;

const scoreText = (text) => {
  let pos = 0;
  let neg = 0;
  if (!text) return { pos, neg };

  // Emoji valence (per character — handles sequences well enough for scoring).
  for (const ch of Array.from(text)) {
    if (EMOJI_RE.test(ch)) {
      const v = EMOJI_VALENCE[ch];
      if (v > 0) pos += 1;
      else if (v < 0) neg += 1;
    }
  }

  // Word tokens.
  const words = text.toLowerCase().replace(/[^a-z'\s]/g, " ").split(/\s+/);
  for (const w of words) {
    if (!w) continue;
    if (POS.has(w)) pos += 1;
    else if (NEG.has(w)) neg += 1;
  }
  return { pos, neg };
};

// Aggregate positivity over a list of {text}. null when there's no signal.
const positivityOf = (items, field = "text") => {
  let pos = 0;
  let neg = 0;
  for (const it of items) {
    const { pos: p, neg: n } = scoreText(it[field] || "");
    pos += p;
    neg += n;
  }
  if (pos + neg === 0) return { ratio: null, pos, neg };
  return { ratio: pos / (pos + neg), pos, neg };
};

module.exports = { scoreText, positivityOf };
