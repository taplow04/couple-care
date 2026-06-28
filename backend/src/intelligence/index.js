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

module.exports = {
  getHealth,
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
