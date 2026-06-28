/**
 * Trust & Transparency engine (couple — deterministic, CoupleCare-activity ONLY,
 * never surveillance).
 *
 * Ports the existing Trust Center sub-scores VERBATIM (communication /
 * participation / consistency / transparency) so the Phase C delegation keeps
 * those numbers, and ADDS supportiveness + an overall weighted Trust score
 * (the "new model"). Every metric is explained.
 */
const { clamp, levelFor } = require("../lib/normalize");
const confidenceEngine = require("../meta/confidence.engine");
const explainEngine = require("../meta/explainability.engine");

/**
 * @param {object} features
 *   myMsgs, partnerMsgs, streak, longest, bothActiveToday, transparencyPct,
 *   supportRatio (0..1 positive/supportive interaction ratio | null), daysTogether
 */
const score = (features, cfg, prevBreakdown = null) => {
  const w = cfg.weights.trust;
  const t = cfg.thresholds;
  const {
    myMsgs = 0,
    partnerMsgs = 0,
    streak = 0,
    longest = 0,
    bothActiveToday = false,
    transparencyPct = 0,
    supportRatio = null,
  } = features;

  const totalMsgs = myMsgs + partnerMsgs;
  const volumeScore = clamp((totalMsgs / 200) * 60);
  const balance = totalMsgs === 0 ? 0 : 1 - Math.abs(myMsgs - partnerMsgs) / totalMsgs;

  const breakdown = {
    communication: Math.round(clamp(volumeScore + balance * 40)),
    participation: Math.round(clamp(Math.min(streak, 14) * 4 + (bothActiveToday ? 20 : 0) + 24)),
    consistency: Math.round(clamp(Math.min(longest, 30) * 3 + (streak > 0 ? 10 : 0))),
    supportiveness: Math.round(clamp((supportRatio ?? 0.6) * 100)),
    transparency: Math.round(clamp(transparencyPct)),
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
  const level = levelFor(value, t.levels);

  const confidence = confidenceEngine.compute(
    { dataPoints: totalMsgs + Math.min(longest, 30), bothPartners: myMsgs > 0 && partnerMsgs > 0, historyDays: features.historyDays || 0 },
    cfg,
  );
  const explain = explainEngine.build(breakdown, w, prevBreakdown);

  return {
    score: value,
    level,
    breakdown,
    confidence: confidence.value,
    confidenceLevel: confidence.level,
    factors: { topPositives: explain.topPositives, areasForImprovement: explain.areasForImprovement },
    reasons: explain.reasons,
    suggestions: explain.suggestions,
  };
};

module.exports = { score };
