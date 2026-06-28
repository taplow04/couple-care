/**
 * Learning engine — adaptation WITHOUT machine-learning training. It compares a
 * subject (couple/user) against its OWN historical snapshots (never against other
 * couples) to derive a trend + a personal baseline. Deterministic.
 *
 * Split into a pure core (`trend`) that is unit-tested with fixtures, and thin
 * DB helpers (`recordSnapshot`/`getHistory`) over IntelSnapshot.
 */
const IntelSnapshot = require("../intelSnapshot.model");

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/**
 * Pure trend computation.
 * @param {number} current current score
 * @param {number[]} historyScores prior scores, most-recent-first
 * @returns {{ direction, delta, baseline, velocity }}
 *   direction: "improving" | "declining" | "stable"
 *   baseline:  mean of the subject's own recent history
 *   velocity:  score change per day (recent vs older half)
 */
const trend = (current, historyScores = []) => {
  if (current == null || historyScores.length === 0) {
    return { direction: "stable", delta: 0, baseline: current ?? null, velocity: 0 };
  }
  const baseline = mean(historyScores);
  const delta = Math.round((current - baseline) * 10) / 10;
  const direction = delta >= 3 ? "improving" : delta <= -3 ? "declining" : "stable";

  // Velocity: recent-half mean vs older-half mean, per snapshot step.
  const half = Math.floor(historyScores.length / 2) || 1;
  const recentMean = mean(historyScores.slice(0, half));
  const olderMean = mean(historyScores.slice(half)) ?? recentMean;
  const velocity = Math.round(((recentMean - olderMean) || 0) * 10) / 10;

  return { direction, delta, baseline: Math.round(baseline), velocity };
};

// ── DB layer (best-effort; never throws) ──
const recordSnapshot = async (scope, subjectId, engine, day, payload) => {
  try {
    await IntelSnapshot.updateOne(
      { subjectId, engine, day },
      {
        $set: {
          scope,
          score: payload.score ?? null,
          confidence: payload.confidence ?? null,
          level: payload.level ?? null,
          breakdown: payload.breakdown ?? null,
          factors: payload.factors ?? null,
          context: payload.context ?? null,
        },
      },
      { upsert: true },
    );
  } catch (e) {
    console.error("[ccie:learning] snapshot write failed:", e.message);
  }
};

const getHistory = async (subjectId, engine, limit = 14) => {
  try {
    const rows = await IntelSnapshot.find({ subjectId, engine })
      .sort({ createdAt: -1 })
      .limit(limit)
      .select("score day createdAt");
    return rows;
  } catch (e) {
    console.error("[ccie:learning] history read failed:", e.message);
    return [];
  }
};

module.exports = { trend, recordSnapshot, getHistory };
