/**
 * Emotional Intelligence engine (PER-USER — each partner has their own trend).
 *
 * Infers an emotional trend from multiple deterministic signals (never relying on
 * manual mood logs alone): mood history, chat sentiment (lexicon), message tempo
 * (length + response delay), journal sentiment, sleep wellbeing, and story
 * reactions. Each signal degrades gracefully (skipped when absent). It NEVER
 * claims certainty — every output carries a confidence and is framed as an
 * estimate. Weekly/monthly trend come from the self-history (facade).
 */
const { clamp, positivityRatio, levelFor } = require("../lib/normalize");
const { positivityOf } = require("../lib/sentiment");
const confidenceEngine = require("../meta/confidence.engine");

const TREND_LABEL = (s) => (s >= 70 ? "positive" : s >= 45 ? "balanced" : "low");

/**
 * @param {object} features
 *   moods            user's recent moods
 *   sentMessages     user's sent messages (with text)
 *   journal          user's journal entries (with content)
 *   tempoScore       0..100 from message length + response delay (null if n/a)
 *   sleepWellbeing   0..100 from avg sleep quality/hours (null if n/a)
 *   storyReactionScore 0..100 from positive reactions exchanged (null if n/a)
 */
const score = (features, cfg) => {
  const w = cfg.weights.emotion;
  const { moods = [], sentMessages = [], journal = [] } = features;

  const components = {};
  const moodRatio = positivityRatio(moods);
  if (moodRatio != null) components.moodHistory = clamp(moodRatio * 100);
  const chat = positivityOf(sentMessages);
  if (chat.ratio != null) components.chatSentiment = clamp(chat.ratio * 100);
  const j = positivityOf(journal, "content");
  if (j.ratio != null) components.journal = clamp(j.ratio * 100);
  if (features.tempoScore != null) components.messageTempo = clamp(features.tempoScore);
  if (features.sleepWellbeing != null) components.sleep = clamp(features.sleepWellbeing);
  if (features.storyReactionScore != null) components.storyReactions = clamp(features.storyReactionScore);

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

  const dataPoints = moods.length + sentMessages.length + journal.length;
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
    signals: Object.keys(components),
    // Honest framing — we estimate, never assert.
    statement: `Estimated emotional trend: ${TREND_LABEL(value)} (${confidence.value}% confidence)`,
  };
};

module.exports = { score };
