/**
 * Emotional Intelligence engine (PER-USER — each partner has their own trend).
 *
 * Phase A: a working-but-thin estimate from mood history + chat sentiment
 * (deterministic lexicon). Phase C deepens it with message tempo, story
 * reactions, journal, sleep, and weekly/monthly summaries. It NEVER claims
 * certainty — every output carries a confidence.
 */
const { clamp, positivityRatio, levelFor } = require("../lib/normalize");
const { positivityOf } = require("../lib/sentiment");
const confidenceEngine = require("../meta/confidence.engine");

const TREND_LABEL = (s) =>
  s >= 70 ? "positive" : s >= 45 ? "balanced" : "low";

/**
 * @param {object} features { moods, sentMessages, now }
 * @returns standard CCIE result (per-user emotional trend)
 */
const score = (features, cfg) => {
  const w = cfg.weights.emotion;
  const { moods = [], sentMessages = [] } = features;

  const moodRatio = positivityRatio(moods); // 0..1 | null
  const chat = positivityOf(sentMessages); // { ratio, pos, neg }

  const components = {};
  if (moodRatio != null) components.moodHistory = clamp(moodRatio * 100);
  if (chat.ratio != null) components.chatSentiment = clamp(chat.ratio * 100);

  // Weighted blend over available signals (graceful degrade).
  let weighted = 0;
  let active = 0;
  for (const [k, v] of Object.entries(components)) {
    const cw = w[k] || 0;
    if (cw <= 0) continue;
    weighted += v * cw;
    active += cw;
  }
  const value = active > 0 ? clamp(Math.round(weighted / active)) : cfg.thresholds.neutralBaseline;
  const level = levelFor(value, cfg.thresholds.levels);

  const dataPoints = moods.length + sentMessages.length;
  const confidence = confidenceEngine.compute(
    { dataPoints, bothPartners: false, historyDays: features.historyDays || 0 },
    cfg,
  );

  return {
    score: value,
    level,
    trend: TREND_LABEL(value),
    breakdown: Object.fromEntries(Object.entries(components).map(([k, v]) => [k, Math.round(v)])),
    confidence: confidence.value,
    confidenceLevel: confidence.level,
    // Honest framing — we estimate, never assert.
    statement: `Estimated emotional trend: ${TREND_LABEL(value)} (${confidence.value}% confidence)`,
  };
};

module.exports = { score };
