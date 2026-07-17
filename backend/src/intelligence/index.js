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
const { deriveCurrentMood } = require("./lib/currentMood");

const healthEngine = require("./engines/relationshipHealth.engine");
const emotionEngine = require("./engines/emotion.engine");
const trustEngine = require("./engines/trust.engine");
const growthEngine = require("./engines/growth.engine");
const memoryEngine = require("./engines/memory.engine");
const maturityEngine = require("./engines/maturity.engine");
const behaviorEngine = require("./engines/behavior.engine");
const healingEngine = require("./engines/healing.engine");
const pulseEngine = require("./engines/pulse.engine");
const changeDetection = require("./meta/changeDetection.engine");

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

/**
 * AI Current Mood for a USER — the friendly, honest estimate the chat header and
 * Mood page render. Reuses the emotion engine + self-history, then derives a mood
 * label/emoji/confidence/stability/reasons. Deterministic; always an estimate.
 * Returns null-safe shape even with zero data (low confidence).
 */
const getCurrentMood = async (userId, now = Date.now()) => {
  const feats = await features.gatherEmotionFeatures(userId, now);
  const history = await learning.getHistory(userId, "emotion", 30);
  feats.historyDays = history.length;

  const result = emotionEngine.score(feats, getConfig());
  const historyScores = history.map((h) => h.score).filter((n) => typeof n === "number");
  const trendDetail = learning.trend(result.score, historyScores);

  const mood = deriveCurrentMood({
    score: result.score,
    confidence: result.confidence,
    trend: result.trend,
    direction: trendDetail.direction,
    signalsMeta: feats.signalsMeta || {},
    historyScores,
    signals: result.signals || [],
  });

  // Persist today's emotion snapshot so trend/stability stay fresh (best-effort).
  learning.recordSnapshot("user", userId, "emotion", dayKey(now), result);

  // Mood-change timeline: recent daily snapshots → {day, score, mood label}.
  const timeline = history
    .slice(0, 14)
    .map((h) => ({ day: h.day, score: h.score, confidence: h.confidence }))
    .reverse();

  return {
    ...mood,
    weeklyAverage: historyScores.slice(0, 7).length
      ? Math.round(historyScores.slice(0, 7).reduce((a, b) => a + b, 0) / Math.min(7, historyScores.length))
      : result.score,
    updatedAt: new Date(now).toISOString(),
    timeline,
  };
};

/**
 * Relationship Maturity for a USER — continuously evolving, behaviour-based
 * (never a personality test). Works in every lifecycle stage; couple-only
 * dimensions simply degrade for solo users.
 */
const getMaturity = async (userId, now = Date.now()) => {
  const feats = await features.gatherMaturityFeatures(userId, now);
  const history = await learning.getHistory(userId, "maturity", 30);
  feats.historyDays = history.length;

  const result = maturityEngine.score(feats, getConfig(), history[0]?.breakdown || null);
  result.trend = learning.trend(result.score, history.map((h) => h.score).filter((n) => typeof n === "number"));

  learning.recordSnapshot("user", userId, "maturity", dayKey(now), result);
  return result;
};

/**
 * Behaviour Intelligence for a COUPLE — confidence-hedged indicators plus the
 * Attraction / Attachment / Growing-Love pattern estimate. Identical for both
 * partners (couple-symmetric inputs only).
 */
const getBehavior = async (coupleId, now = Date.now()) => {
  const feats = await features.gatherHealthFeatures(coupleId, now);
  const history = await learning.getHistory(coupleId, "behavior", 14);
  feats.historyDays = history.length;

  const result = behaviorEngine.score(feats, getConfig());
  result.trend = learning.trend(result.score, history.map((h) => h.score).filter((n) => typeof n === "number"));

  learning.recordSnapshot("couple", coupleId, "behavior", dayKey(now), result);
  return result;
};

/**
 * Healing Progress for a USER (Stage 3) — engagement with recovery activities,
 * never emotional worth. Includes gentle, non-clinical behavioural insights.
 */
const getHealing = async (userId, now = Date.now()) => {
  const feats = await features.gatherHealingFeatures(userId, now);
  const history = await learning.getHistory(userId, "healing", 30);
  feats.historyDays = history.length;

  const result = healingEngine.score(feats, getConfig(), history[0]?.breakdown || null);
  result.trend = learning.trend(result.score, history.map((h) => h.score).filter((n) => typeof n === "number"));

  learning.recordSnapshot("user", userId, "healing", dayKey(now), result);
  return result;
};

/**
 * Relationship Pulse for a COUPLE — the continuous seven-signal reading the
 * dashboard renders (Communication / Consistency / Engagement / Support /
 * Activity / Growth / Connection → overall Pulse). Deterministic, identical
 * for both partners; reuses the health feature gather (zero extra queries).
 */
const getPulse = async (coupleId, now = Date.now()) => {
  const feats = await features.gatherHealthFeatures(coupleId, now);
  const history = await learning.getHistory(coupleId, "pulse", 30);
  feats.historyDays = history.length;

  const result = pulseEngine.score(feats, getConfig());
  result.trend = learning.trend(result.score, history.map((h) => h.score).filter((n) => typeof n === "number"));

  learning.recordSnapshot("couple", coupleId, "pulse", dayKey(now), result);
  return result;
};

/**
 * Relationship Change Detection for a COUPLE — hedged observations comparing
 * the recent 7 days with the couple's OWN prior 3-week baseline. Observations,
 * never accusations; positive shifts are surfaced too. Deterministic.
 */
const getChangeObservations = async (coupleId, now = Date.now()) => {
  const feats = await features.gatherChangeFeatures(coupleId, now);
  return {
    observations: changeDetection.detect(feats),
    windows: { recentDays: 7, baselineDays: 21 },
    basis: "Computed only from actions performed inside CoupleCare — never from other apps or device data.",
  };
};

/**
 * Personality Timeline for a USER — behavioural + self-reported trends over
 * time. NOT personality prediction: it visualises how observable dimensions
 * (emotion / maturity / couple engines when paired) and the user's own daily
 * reflections move week to week. Assembled purely from IntelSnapshot history +
 * DailyReflection rows.
 */
const getPersonalityTimeline = async (userId, coupleId = null, days = 30, now = Date.now()) => {
  const span = Math.min(Math.max(days, 7), 365);
  const [emotion, maturity, reflections] = await Promise.all([
    getHistorySeries(userId, "emotion", span),
    getHistorySeries(userId, "maturity", span),
    features.gatherReflectionSeries(userId, span, now),
  ]);

  let couple = null;
  if (coupleId) {
    const [health, trust, behavior, pulse] = await Promise.all([
      getHistorySeries(coupleId, "relationshipHealth", span),
      getHistorySeries(coupleId, "trust", span),
      getHistorySeries(coupleId, "behavior", span),
      getHistorySeries(coupleId, "pulse", span),
    ]);
    couple = { relationshipHealth: health, trust, behavior, pulse };
  }

  // Period comparison: mean of the most recent half vs the prior half of each
  // engine series — deterministic "vs previous period" deltas for the UI.
  const halves = (series) => {
    const scores = series.map((s) => s.score).filter((n) => typeof n === "number");
    if (scores.length < 4) return null;
    const mid = Math.floor(scores.length / 2);
    const avg = (arr) => arr.reduce((a, b) => a + b, 0) / arr.length;
    const prev = avg(scores.slice(0, mid));
    const cur = avg(scores.slice(mid));
    return { previous: Math.round(prev), current: Math.round(cur), delta: Math.round(cur - prev) };
  };

  return {
    days: span,
    user: { emotion, maturity },
    couple,
    reflections,
    comparison: {
      emotion: halves(emotion),
      maturity: halves(maturity),
      relationshipHealth: couple ? halves(couple.relationshipHealth) : null,
      pulse: couple ? halves(couple.pulse) : null,
    },
    basis:
      "Trends are visualised from your own in-app behaviour and the reflections you chose to log — this is not a personality test or prediction.",
  };
};

// Self-history timeline for trend charts: [{day, score, confidence}] oldest-first.
const getHistorySeries = async (subjectId, engine, days = 30) => {
  const rows = await learning.getHistory(subjectId, engine, Math.min(Math.max(days, 1), 365));
  return rows
    .map((r) => ({ day: r.day, score: r.score }))
    .reverse();
};

// Relationship recap/timeline for a period (daily|weekly|monthly|yearly).
// Deterministic assembly of existing sources; no LLM in the structure.
const getMemory = async (coupleId, period = "weekly", now = Date.now()) => {
  const feats = await features.gatherMemoryFeatures(coupleId, period, now);
  return memoryEngine.assemble(feats, period);
};

module.exports = {
  getHealth,
  getTrust,
  getGrowth,
  getEmotion,
  getCurrentMood,
  getMemory,
  getMaturity,
  getBehavior,
  getHealing,
  getPulse,
  getChangeObservations,
  getPersonalityTimeline,
  getHistorySeries,
  // pure engines (for tests / future facades)
  engines: {
    health: healthEngine,
    emotion: emotionEngine,
    trust: trustEngine,
    growth: growthEngine,
    memory: memoryEngine,
    maturity: maturityEngine,
    behavior: behaviorEngine,
    healing: healingEngine,
    pulse: pulseEngine,
    changeDetection,
  },
  getConfig,
};
