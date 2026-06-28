/**
 * Relationship Health engine (couple — identical for both partners).
 *
 * Phase A ports the ORIGINAL couples/health.service formula VERBATIM so
 * delegation is byte-for-byte regression-free: the 7 classic components, the
 * same math, the same weights (from config, defaults = original). New CCIE inputs
 * are weight-0 (config) and join in Phase B. Confidence / context / reasons are
 * ADDITIVE metadata computed from the same features — they never change the score.
 *
 * Determinism + identity: all inputs are couple-symmetric and the math is pure;
 * `now` is injected so it's reproducible in tests.
 */
const {
  clamp,
  daysAgo,
  positivityRatio,
  distinctDays,
  saturate,
  levelFor,
  piecewise,
  POSITIVE_MOODS,
  NEGATIVE_MOODS,
  dayKey,
  DAY_MS,
} = require("../lib/normalize");
const confidenceEngine = require("../meta/confidence.engine");
const contextEngine = require("../meta/context.engine");
const explainEngine = require("../meta/explainability.engine");

// ── component sub-scores (each 0–100) — identical to the original service ──

const moodHealthScore = (moods, now, t) => {
  if (moods.length === 0) return t.neutralBaseline;
  const positivity = (positivityRatio(moods) ?? 0.5) * 100;
  const recent = moods.filter((m) => new Date(m.createdAt).getTime() >= daysAgo(now, t.windows.recent));
  const consistency = (distinctDays(recent) / t.windows.recent) * 100;
  const frequency = saturate(moods.length, t.saturation.moods);
  return clamp(0.6 * positivity + 0.25 * consistency + 0.15 * frequency);
};

const communicationScore = (messages, now, t) => {
  if (messages.length === 0) return t.neutralBaseline;
  const counts = {};
  let lastAt = 0;
  for (const m of messages) {
    const s = String(m.senderId);
    counts[s] = (counts[s] || 0) + 1;
    lastAt = Math.max(lastAt, new Date(m.createdAt).getTime());
  }
  const volume = saturate(messages.length, t.saturation.messages);
  const sides = Object.values(counts);
  const a = sides[0] || 0;
  const b = sides[1] || 0;
  const twoWay = a + b > 0 ? (1 - Math.abs(a - b) / (a + b)) * 100 : 0;
  const recent = messages.filter((m) => new Date(m.createdAt).getTime() >= daysAgo(now, t.windows.recent));
  const activeDays = (distinctDays(recent) / t.windows.recent) * 100;
  const daysSinceLast = (now - lastAt) / DAY_MS;
  const inactivityPenalty = Math.min(Math.max(daysSinceLast - 1, 0) * 5, 40);
  return clamp(0.4 * volume + 0.3 * twoWay + 0.3 * activeDays - inactivityPenalty);
};

const memoryScore = (memories, now, t) => {
  if (memories.length === 0) return t.neutralBaseline;
  const volume = saturate(memories.length, t.saturation.memories);
  const lastDate = memories.reduce((acc, m) => {
    const tt = new Date(m.memoryDate || m.createdAt).getTime();
    return Math.max(acc, tt);
  }, 0);
  const daysSinceLast = (now - lastDate) / DAY_MS;
  const recency = clamp(100 - daysSinceLast * 2);
  const types = new Set(memories.map((m) => m.memoryType || "other"));
  const diversity = saturate(types.size, 7);
  return clamp(0.5 * volume + 0.25 * recency + 0.25 * diversity);
};

const longevityScore = (days, t) => {
  const daysScore = piecewise(days, t.longevityAnchors);
  const milestoneRatio = t.milestones.filter((m) => days >= m).length / t.milestones.length;
  return clamp(0.85 * daysScore + 0.15 * milestoneRatio * 100);
};

const compatibilityScore = (moodsA, moodsB, now, t) => {
  const posA = positivityRatio(moodsA);
  const posB = positivityRatio(moodsB);
  if (posA === null || posB === null) return t.neutralBaseline;
  const sync = 1 - Math.abs(posA - posB);
  const valence = (moods) => {
    const map = {};
    for (const m of moods) {
      if (new Date(m.createdAt).getTime() < daysAgo(now, t.windows.recent)) continue;
      const k = dayKey(m.createdAt);
      const v = POSITIVE_MOODS.has(m.moodType) ? 1 : NEGATIVE_MOODS.has(m.moodType) ? -1 : 0;
      map[k] = (map[k] || 0) + v;
    }
    return map;
  };
  const va = valence(moodsA);
  const vb = valence(moodsB);
  const sharedDays = Object.keys(va).filter((k) => k in vb);
  let overlap = sync;
  if (sharedDays.length > 0) {
    const matches = sharedDays.filter((k) => Math.sign(va[k]) === Math.sign(vb[k])).length;
    overlap = matches / sharedDays.length;
  }
  return clamp((0.7 * sync + 0.3 * overlap) * 100);
};

const engagementScore = (moods, memories, messages, partnerIds, now, t) => {
  const w = t.windows.recent;
  const within = (i, field) => new Date(i[field] || i.createdAt).getTime() >= daysAgo(now, w);
  const m14 = moods.filter((m) => within(m, "createdAt"));
  const mem14 = memories.filter((m) => within(m, "createdAt"));
  const msg14 = messages.filter((m) => within(m, "createdAt"));
  const activity = m14.length + mem14.length + msg14.length;
  if (activity === 0) return 30;
  const base = saturate(activity, t.saturation.engagementActivity);
  const contributors = new Set([
    ...m14.map((m) => String(m.userId)),
    ...msg14.map((m) => String(m.senderId)),
  ]);
  const bothActive = partnerIds.every((id) => contributors.has(String(id)));
  return clamp(base * (bothActive ? 1 : 0.7));
};

const aiTrendScore = (moods, memories, messages, now) => {
  const windowComposite = (start, end) => {
    const inWin = (i, field) => {
      const tt = new Date(i[field] || i.createdAt).getTime();
      return tt >= daysAgo(now, start) && tt < daysAgo(now, end);
    };
    const wm = moods.filter((m) => inWin(m, "createdAt"));
    const wmsg = messages.filter((m) => inWin(m, "createdAt"));
    const wmem = memories.filter((m) => inWin(m, "createdAt"));
    if (wm.length + wmsg.length + wmem.length === 0) return null;
    const positivity = positivityRatio(wm) ?? 0.5;
    return positivity * 0.5 + Math.min(wmsg.length / 50, 1) * 0.3 + Math.min(wmem.length / 3, 1) * 0.2;
  };
  const recent = windowComposite(7, 0);
  const prior = windowComposite(14, 7);
  if (recent === null && prior === null) return 60;
  const delta = (recent ?? 0.5) - (prior ?? 0.5);
  return clamp(70 + delta * 100);
};

/**
 * Pure scoring core. `features` is DB-free → unit-testable + deterministic.
 * @returns {{ score, level, breakdown, confidence, context, factors }}
 */
const score = (features, cfg, prevBreakdown = null) => {
  const t = cfg.thresholds;
  const w = cfg.weights.relationshipHealth;
  const now = features.now ?? Date.now();
  const { moods = [], memories = [], messages = [], moodsA = [], moodsB = [], partnerIds = [], daysTogether = 0 } = features;

  const breakdown = {
    moodHealth: Math.round(moodHealthScore(moods, now, t)),
    communication: Math.round(communicationScore(messages, now, t)),
    memory: Math.round(memoryScore(memories, now, t)),
    longevity: Math.round(longevityScore(daysTogether, t)),
    compatibility: Math.round(compatibilityScore(moodsA, moodsB, now, t)),
    engagement: Math.round(engagementScore(moods, memories, messages, partnerIds, now, t)),
    aiAnalysis: Math.round(aiTrendScore(moods, memories, messages, now)),
  };

  // Weighted sum, normalised by the sum of the weights of components in play
  // (Phase A: the 7 classic, whose weights sum to 1.0 → identical to original).
  let weighted = 0;
  let activeWeight = 0;
  for (const [k, sub] of Object.entries(breakdown)) {
    const cw = w[k] || 0;
    if (cw <= 0) continue;
    weighted += sub * cw;
    activeWeight += cw;
  }
  const finalScore = clamp(Math.round(weighted / (activeWeight || 1)));
  const level = levelFor(finalScore, t.levels);

  // ── additive metadata (does NOT affect finalScore) ──
  const dataPoints = moods.length + messages.length + memories.length;
  const bothPartners =
    partnerIds.length === 2 &&
    partnerIds.every(
      (id) =>
        moods.some((m) => String(m.userId) === String(id)) ||
        messages.some((m) => String(m.senderId) === String(id)),
    );
  const confidence = confidenceEngine.compute(
    { dataPoints, bothPartners, historyDays: features.historyDays || 0 },
    cfg,
  );

  const positivity = positivityRatio(moods);
  const context = contextEngine.detect({
    daysTogether,
    memoryCount: memories.length,
    callCount: features.callCount || 0,
    videoCount: features.videoCount || 0,
    positivity: positivity ?? null,
    activityVsBaseline: features.activityVsBaseline ?? null,
    memoryCount7: memories.filter((m) => new Date(m.memoryDate || m.createdAt).getTime() >= daysAgo(now, 7)).length,
  });

  const explain = explainEngine.build(breakdown, w, prevBreakdown);

  return {
    score: finalScore,
    level,
    breakdown,
    confidence: confidence.value,
    confidenceLevel: confidence.level,
    context: { tags: context.tags, labels: context.labels },
    factors: {
      topPositives: explain.topPositives,
      areasForImprovement: explain.areasForImprovement,
    },
    reasons: explain.reasons,
    suggestions: explain.suggestions,
  };
};

module.exports = { score, _components: { moodHealthScore, communicationScore, memoryScore, longevityScore, compatibilityScore, engagementScore, aiTrendScore } };
