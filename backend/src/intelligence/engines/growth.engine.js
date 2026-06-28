/**
 * Relationship Growth engine (couple). Measures long-term growth from lifetime
 * CoupleCare accomplishments, weighted via config and normalised by saturating
 * denominators. Growth VELOCITY (Δ vs the couple's own history) is layered by the
 * facade through the learning engine. Deterministic.
 */
const { clamp, saturate, levelFor } = require("../lib/normalize");
const confidenceEngine = require("../meta/confidence.engine");
const explainEngine = require("../meta/explainability.engine");

/**
 * @param {object} features lifetime counts:
 *   achievements, bucketCompleted, journeyProgress (0..100), memories, stories,
 *   challenges, dailyMoments, loveLetters, aiSessions, xp, level
 */
const score = (features, cfg, prevBreakdown = null) => {
  const w = cfg.weights.growth;
  const s = cfg.thresholds.saturation;
  const f = features;

  const breakdown = {
    achievements: Math.round(saturate(f.achievements, s.achievements)),
    bucket: Math.round(saturate(f.bucketCompleted, s.bucketCompleted)),
    journey: Math.round(clamp(f.journeyProgress ?? 0)),
    memories: Math.round(saturate(f.memories, s.memories)),
    stories: Math.round(saturate(f.stories, s.stories)),
    challenges: Math.round(saturate(f.challenges, s.challenges)),
    dailyMoments: Math.round(saturate(f.dailyMoments, s.dailyMoments)),
    loveLetters: Math.round(saturate(f.loveLetters, s.loveLetters)),
    aiSessions: Math.round(saturate(f.aiSessions, s.aiSessions)),
  };

  let weighted = 0;
  let active = 0;
  for (const [k, sub] of Object.entries(breakdown)) {
    const cw = w[k] || 0;
    if (cw <= 0) continue;
    weighted += sub * cw;
    active += cw;
  }
  const value = clamp(Math.round(weighted / (active || 1)));
  const level = levelFor(value, cfg.thresholds.levels);

  const dataPoints =
    (f.achievements || 0) + (f.memories || 0) + (f.stories || 0) + (f.bucketCompleted || 0);
  const confidence = confidenceEngine.compute(
    { dataPoints, bothPartners: true, historyDays: features.historyDays || 0 },
    cfg,
  );
  const explain = explainEngine.build(breakdown, w, prevBreakdown);

  return {
    score: value,
    level,
    breakdown,
    confidence: confidence.value,
    confidenceLevel: confidence.level,
    xp: f.xp ?? 0,
    relationshipLevel: f.level ?? 1,
    factors: { topPositives: explain.topPositives, areasForImprovement: explain.areasForImprovement },
    reasons: explain.reasons,
    suggestions: explain.suggestions,
  };
};

module.exports = { score };
