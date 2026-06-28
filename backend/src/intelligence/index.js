/**
 * CCIE facade — the single public entry point the rest of the app calls. It
 * orchestrates: gather features → score (pure engine) → attach self-history trend
 * → persist a daily snapshot. Engines never touch the DB directly; this layer and
 * lib/features do.
 *
 * Phase A implements getHealth (what couples/health.service delegates to). The
 * other domain facades (emotion/trust/growth/memory) are wired in Phases C/D; the
 * pure engines are already exported for unit tests.
 */
const { getConfig } = require("./config");
const { dayKey } = require("./lib/normalize");
const features = require("./lib/features");
const learning = require("./meta/learning.engine");

const healthEngine = require("./engines/relationshipHealth.engine");
const emotionEngine = require("./engines/emotion.engine");
const trustEngine = require("./engines/trust.engine");
const growthEngine = require("./engines/growth.engine");
const memoryEngine = require("./engines/memory.engine");

/**
 * Relationship Health for a couple — deterministic, identical for both partners.
 * Returns { score, level, breakdown, confidence, context, factors, reasons, trend }.
 */
const getHealth = async (coupleId, now = Date.now()) => {
  const feats = await features.gatherHealthFeatures(coupleId, now);

  const history = await learning.getHistory(coupleId, "relationshipHealth", 14);
  feats.historyDays = history.length;
  const prevBreakdown = history[0]?.breakdown || null;

  const result = healthEngine.score(feats, getConfig(), prevBreakdown);

  const historyScores = history.map((h) => h.score).filter((n) => typeof n === "number");
  result.trend = learning.trend(result.score, historyScores);

  // Persist today's snapshot (best-effort; never blocks the response).
  learning.recordSnapshot("couple", coupleId, "relationshipHealth", dayKey(now), result);

  return result;
};

// Trust & Growth reuse the health gather (it already builds their feature sets),
// then run their own engines + history trend + snapshot.
const getTrust = async (coupleId, now = Date.now()) => {
  const feats = await features.gatherHealthFeatures(coupleId, now);
  const history = await learning.getHistory(coupleId, "trust", 14);
  feats.trustFeatures.historyDays = history.length;
  const result = trustEngine.score(feats.trustFeatures, getConfig(), history[0]?.breakdown || null);
  result.trend = learning.trend(result.score, history.map((h) => h.score).filter((n) => typeof n === "number"));
  learning.recordSnapshot("couple", coupleId, "trust", dayKey(now), result);
  return result;
};

const getGrowth = async (coupleId, now = Date.now()) => {
  const feats = await features.gatherHealthFeatures(coupleId, now);
  const history = await learning.getHistory(coupleId, "growth", 14);
  feats.growthFeatures.historyDays = history.length;
  const result = growthEngine.score(feats.growthFeatures, getConfig(), history[0]?.breakdown || null);
  result.trend = learning.trend(result.score, history.map((h) => h.score).filter((n) => typeof n === "number"));
  result.velocity = result.trend.velocity;
  learning.recordSnapshot("couple", coupleId, "growth", dayKey(now), result);
  return result;
};

// Emotional trend for a USER (each partner has their own). Weekly/monthly
// summaries come from the user's own emotion snapshots (self-history).
const getEmotion = async (userId, now = Date.now()) => {
  const feats = await features.gatherEmotionFeatures(userId, now);
  const history = await learning.getHistory(userId, "emotion", 30);
  feats.historyDays = history.length;

  const result = emotionEngine.score(feats, getConfig());
  const scores = history.map((h) => h.score).filter((n) => typeof n === "number");
  result.trendDetail = learning.trend(result.score, scores);

  const avg = (arr) => (arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null);
  result.weeklySummary = { average: avg(scores.slice(0, 7)), direction: result.trendDetail.direction };
  result.monthlySummary = { average: avg(scores.slice(0, 30)), direction: result.trendDetail.direction };

  learning.recordSnapshot("user", userId, "emotion", dayKey(now), result);
  return result;
};

module.exports = {
  getHealth,
  getTrust,
  getGrowth,
  getEmotion,
  // pure engines (for tests / future facades)
  engines: {
    health: healthEngine,
    emotion: emotionEngine,
    trust: trustEngine,
    growth: growthEngine,
    memory: memoryEngine,
  },
  getConfig,
};
