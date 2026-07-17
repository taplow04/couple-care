/**
 * Relationship Pulse engine (COUPLE — identical for both partners; all inputs
 * are couple-symmetric).
 *
 * The continuous "how is the relationship doing right now" reading: seven
 * observable sub-scores — Communication, Consistency, Engagement, Support,
 * Activity, Growth, Connection — blended into ONE overall Pulse (0..100).
 *
 * Everything is computed from actions performed INSIDE CoupleCare (chat, calls,
 * moods, stories, memories, goals, reflections…) — never from anything outside
 * the app. Deterministic: same couple state + same day ⇒ same Pulse. Weights
 * live ONLY in config (weights.pulse); a sub-score without data degrades to
 * null and is skipped (the engine normalises by the active-weight sum).
 *
 * Reuses gatherHealthFeatures — zero extra queries.
 */
const {
  clamp,
  saturate,
  levelFor,
  distinctDays,
  DAY_MS,
} = require("../lib/normalize");
const confidenceEngine = require("../meta/confidence.engine");

// Weighted average over the sub-scores a couple actually has (null = skipped).
const weightedAvg = (signals, weights) => {
  let weighted = 0;
  let active = 0;
  for (const [k, v] of Object.entries(signals)) {
    const cw = weights[k] || 0;
    if (cw <= 0 || v == null || Number.isNaN(v)) continue;
    weighted += clamp(v) * cw;
    active += cw;
  }
  return active > 0 ? clamp(weighted / active) : null;
};

// ── sub-scores (each null when the couple has no data for it) ──

// Communication: volume + two-sided balance + day coverage + reply speed.
const communication = (features, t) => {
  const { messages = [] } = features;
  if (!messages.length) return null;
  const counts = {};
  for (const m of messages) counts[String(m.senderId)] = (counts[String(m.senderId)] || 0) + 1;
  const sides = Object.values(counts);
  const a = sides[0] || 0;
  const b = sides[1] || 0;
  const balance = a + b > 0 ? (1 - Math.abs(a - b) / (a + b)) * 100 : 0;
  const regularity = Math.min((distinctDays(messages) / t.windows.primary) * 100 * 1.6, 100);
  const volume = saturate(messages.length, t.saturation.messages);
  const parts = [0.3 * balance + 0.35 * regularity + 0.35 * volume];
  if (features.responsiveness != null) {
    return clamp(0.8 * parts[0] + 0.2 * clamp(features.responsiveness));
  }
  return clamp(parts[0]);
};

// Consistency: live streak + longest streak + steadiness vs the couple's OWN
// recent baseline (never compared to other couples).
const consistency = (features) => {
  const streak = features.trustFeatures?.streak ?? 0;
  const longest = features.trustFeatures?.longest ?? 0;
  const baseline = features.activityVsBaseline;
  const parts = [];
  if (streak > 0 || longest > 0) {
    parts.push(saturate(streak, 14) * 0.6 + saturate(longest, 30) * 0.4);
  }
  if (baseline != null) {
    parts.push(clamp(Math.min(baseline, 1.2) * (100 / 1.2)));
  }
  if (!parts.length) return null;
  return clamp(parts.reduce((x, y) => x + y, 0) / parts.length);
};

// Engagement: breadth of shared in-app activity (moods + messages + memories
// + stories), saturating so spam doesn't inflate it.
const engagementScore = (features, t) => {
  const { moods = [], messages = [], memories = [] } = features;
  const total = moods.length + messages.length + memories.length + (features.storyCount || 0);
  if (total === 0) return null;
  return clamp(saturate(total, t.saturation.engagementActivity * 2));
};

// Support: positive-interaction ratio + recovery after tense stretches.
const support = (features) => {
  const parts = [];
  if (features.supportRatio != null) parts.push(clamp(features.supportRatio * 100));
  if (features.conflictRecoveryPct != null) parts.push(clamp(features.conflictRecoveryPct));
  if (!parts.length) return null;
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length);
};

// Activity: how much the couple DOES together beyond chat — calls, video,
// voice notes, stories, completed goals, daily rituals.
const activity = (features, t) => {
  const kinds = [
    saturate(features.callCount || 0, t.saturation.calls),
    saturate(features.videoCount || 0, t.saturation.videoCalls),
    saturate(features.voiceCount || 0, t.saturation.voiceNotes),
    saturate(features.storyCount || 0, t.saturation.stories),
    saturate(features.bucketCompleted || 0, t.saturation.bucketCompleted),
    saturate(features.dailyMomentsCount || 0, t.saturation.dailyMoments),
  ];
  const present = kinds.filter((v) => v > 0);
  if (!present.length) return null;
  // Breadth matters: doing several KINDS of things counts more than volume in one.
  const breadth = (present.length / kinds.length) * 100;
  const depth = present.reduce((a, b) => a + b, 0) / present.length;
  return clamp(0.4 * breadth + 0.6 * depth);
};

// Growth: lifetime accomplishments trajectory (achievements, goals, milestones).
const growth = (features, t) => {
  const g = features.growthFeatures || {};
  const parts = [];
  if (g.achievements > 0) parts.push(saturate(g.achievements, t.saturation.achievements));
  if (g.bucketCompleted > 0) parts.push(saturate(g.bucketCompleted, t.saturation.bucketCompleted));
  if (g.journeyProgress > 0) parts.push(clamp(g.journeyProgress));
  if (g.memories > 0) parts.push(saturate(g.memories, t.saturation.memories));
  if (!parts.length) return null;
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length);
};

// Connection: how recently and how directly the couple touched base — last
// interaction recency, calls, daily couple rituals.
const connection = (features, t, now) => {
  const { messages = [], moods = [] } = features;
  const lastAt = Math.max(
    0,
    ...messages.map((m) => new Date(m.createdAt).getTime()),
    ...moods.map((m) => new Date(m.createdAt).getTime()),
  );
  const parts = [];
  if (lastAt > 0) {
    const daysSince = (now - lastAt) / DAY_MS;
    parts.push(clamp(100 - Math.max(daysSince - 1, 0) * 12));
  }
  if ((features.callCount || 0) + (features.videoCount || 0) > 0) {
    parts.push(saturate((features.callCount || 0) + (features.videoCount || 0), t.saturation.calls));
  }
  if ((features.dailyMomentsCount || 0) > 0) {
    parts.push(saturate(features.dailyMomentsCount, 20));
  }
  if (!parts.length) return null;
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length);
};

// Human-readable labels for reasons/factors.
const LABELS = {
  communication: "Communication",
  consistency: "Consistency",
  engagement: "Engagement",
  support: "Support",
  activity: "Activity",
  growth: "Growth",
  connection: "Connection",
};

/**
 * Pure scoring core over gatherHealthFeatures output.
 * @returns {{ score, level, breakdown, factors, reasons, confidence, statement }}
 */
const score = (features, cfg) => {
  const t = cfg.thresholds;
  const w = cfg.weights.pulse;
  const now = features.now ?? Date.now();
  const { moods = [], messages = [], memories = [] } = features;

  const raw = {
    communication: communication(features, t),
    consistency: consistency(features),
    engagement: engagementScore(features, t),
    support: support(features),
    activity: activity(features, t),
    growth: growth(features, t),
    connection: connection(features, t, now),
  };

  const breakdown = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v == null || Number.isNaN(v)) continue;
    breakdown[k] = Math.round(clamp(v));
  }

  const overall = weightedAvg(breakdown, w);
  const value = overall == null ? t.neutralBaseline : Math.round(overall);
  const level = levelFor(value, t.levels);

  // Factors: every observed sub-score with its label + weight (transparency).
  const factors = Object.entries(breakdown).map(([k, v]) => ({
    key: k,
    label: LABELS[k],
    score: v,
    weight: w[k] || 0,
  }));

  // Reasons: strongest + weakest observed components, in hedged wording.
  const sorted = [...factors].sort((a, b) => b.score - a.score);
  const reasons = [];
  if (sorted.length) {
    reasons.push(`${sorted[0].label} looks like your strongest signal right now (${sorted[0].score}/100).`);
    const weakest = sorted[sorted.length - 1];
    if (sorted.length > 1 && weakest.score < 60) {
      reasons.push(`${weakest.label} has the most room to grow (${weakest.score}/100).`);
    }
  }
  if (!sorted.length) {
    reasons.push("Not enough recent in-app activity to read a pulse yet — that's completely normal early on.");
  }

  const dataPoints = moods.length + messages.length + memories.length;
  const confidence = confidenceEngine.compute(
    {
      dataPoints,
      bothPartners:
        (features.partnerIds || []).length === 2 &&
        features.partnerIds.every(
          (id) =>
            moods.some((m) => String(m.userId) === String(id)) ||
            messages.some((m) => String(m.senderId) === String(id)),
        ),
      historyDays: features.historyDays || 0,
    },
    cfg,
  );

  return {
    score: value,
    level,
    breakdown,
    factors,
    reasons,
    confidence: confidence.value,
    confidenceLevel: confidence.level,
    statement: `Your Relationship Pulse is ${value}/100 (${level}) — read only from what you both do inside CoupleCare over the last ${t.windows.primary} days (${confidence.value}% confidence).`,
  };
};

module.exports = { score };
