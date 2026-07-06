/**
 * Relationship Behaviour Intelligence engine (COUPLE — identical for both
 * partners; all inputs are couple-symmetric).
 *
 * Two outputs from one deterministic pass over existing CoupleCare data:
 *
 *  1. INDICATORS — healthy communication, emotional support, mutual effort,
 *     consistency, engagement, conflict pressure (inverted frequency) and
 *     emotional closeness (inverted distance). Each is 0..100 with a
 *     confidence-hedged insight sentence. NO absolute claims — every insight
 *     says "suggest/indicate", never "is".
 *
 *  2. PATTERN MODEL — estimates which behavioural pattern currently shows the
 *     strongest indicators: Attraction (novelty/intensity), Attachment
 *     (routine/reliance) or Growing Love (trust/recovery/shared growth). The
 *     three are reported as a distribution with hedged language ("our
 *     behavioural model currently detects stronger indicators of…"), never as
 *     a fact about anyone's feelings.
 *
 * Reuses gatherHealthFeatures — zero extra queries. Weights live ONLY in
 * config (weights.behavior / weights.behaviorPatterns).
 */
const {
  clamp,
  saturate,
  levelFor,
  piecewise,
  distinctDays,
  DAY_MS,
} = require("../lib/normalize");
const confidenceEngine = require("../meta/confidence.engine");
const trustEngine = require("./trust.engine");

const NEGATIVE = new Set(["sad", "angry", "stressed", "anxious"]);

// Weighted average over the signals a couple actually has (null = skipped).
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

// ── indicator sub-scores ──

const healthyCommunication = (messages, now, t) => {
  if (!messages.length) return null;
  const counts = {};
  for (const m of messages) counts[String(m.senderId)] = (counts[String(m.senderId)] || 0) + 1;
  const sides = Object.values(counts);
  const a = sides[0] || 0;
  const b = sides[1] || 0;
  const balance = a + b > 0 ? (1 - Math.abs(a - b) / (a + b)) * 100 : 0;
  const regularity = Math.min((distinctDays(messages) / t.windows.primary) * 100 * 1.6, 100);
  const volume = saturate(messages.length, t.saturation.messages);
  return clamp(0.4 * balance + 0.35 * regularity + 0.25 * volume);
};

const mutualEffort = (features) => {
  const { moodsA = [], moodsB = [], messages = [], partnerIds = [] } = features;
  if (!messages.length && !moodsA.length && !moodsB.length) return null;
  const contributors = new Set([
    ...messages.map((m) => String(m.senderId)),
    ...moodsA.map((m) => String(m.userId)),
    ...moodsB.map((m) => String(m.userId)),
  ]);
  const bothPresent = partnerIds.length === 2 && partnerIds.every((id) => contributors.has(String(id)));
  const moodBalance =
    moodsA.length + moodsB.length > 0
      ? (1 - Math.abs(moodsA.length - moodsB.length) / (moodsA.length + moodsB.length)) * 100
      : null;
  const parts = [bothPresent ? 100 : 40];
  if (moodBalance != null) parts.push(moodBalance);
  return clamp(parts.reduce((x, y) => x + y, 0) / parts.length);
};

// Conflict pressure INVERTED: higher = calmer window. Intensity-weighted share
// of negative moods across both partners.
const conflictPressure = (moods) => {
  if (!moods.length) return null;
  let neg = 0;
  let total = 0;
  for (const m of moods) {
    const w = m.intensity || 1;
    total += w;
    if (NEGATIVE.has(m.moodType)) neg += w;
  }
  if (total === 0) return null;
  return clamp((1 - neg / total) * 100);
};

// Emotional closeness INVERTED distance: recent contact + steady activity vs
// the couple's own baseline + emotional sharing.
const emotionalCloseness = (features, now) => {
  const { messages = [], moods = [], storyCount = 0 } = features;
  const lastAt = Math.max(
    0,
    ...messages.map((m) => new Date(m.createdAt).getTime()),
    ...moods.map((m) => new Date(m.createdAt).getTime()),
  );
  if (lastAt === 0) return null;
  const daysSince = (now - lastAt) / DAY_MS;
  const recency = clamp(100 - Math.max(daysSince - 1, 0) * 12);
  const baseline = features.activityVsBaseline;
  const steadiness = baseline == null ? null : clamp(Math.min(baseline, 1.2) * (100 / 1.2));
  const sharing = clamp(saturate(moods.length + storyCount, 24));
  const parts = [recency, sharing];
  if (steadiness != null) parts.push(steadiness);
  return clamp(parts.reduce((a, b) => a + b, 0) / parts.length);
};

// ── hedged insight copy (deterministic templates) ──
const INSIGHT = {
  healthyCommunication: {
    high: "Recent exchanges suggest balanced, healthy communication between you.",
    low: "Recent patterns suggest communication has been quieter or one-sided lately.",
  },
  emotionalSupport: {
    high: "Recent interactions suggest increased emotional support between partners.",
    low: "Signals of emotional support have been less visible recently.",
  },
  mutualEffort: {
    high: "Both partners appear to be putting in mutual effort.",
    low: "Effort signals look uneven lately — one side may be carrying more.",
  },
  consistency: {
    high: "Your shared habits look steady and consistent.",
    low: "Day-to-day consistency has dipped compared with what's typical for you.",
  },
  engagement: {
    high: "Engagement with shared activities looks strong.",
    low: "Engagement with shared activities has been lighter than usual.",
  },
  conflictPressure: {
    high: "The recent period looks calm, with few signs of tension.",
    low: "Recent mood patterns suggest more frequent tense moments than usual.",
  },
  emotionalCloseness: {
    high: "Recent activity suggests you're staying emotionally close.",
    low: "Recent patterns may indicate some emotional distance creeping in.",
  },
};

const PATTERN_LABELS = {
  attraction: "Attraction",
  attachment: "Attachment",
  growingLove: "Growing Love",
};

const patternStatement = (dominant, distribution, confidence) => {
  if (!dominant) {
    return "There isn't enough recent activity for the behavioural model to detect a clear pattern yet — that's completely normal for a quiet stretch.";
  }
  const phrases = {
    attraction:
      "Our behavioural model currently detects stronger indicators of early-stage attraction — excitement, intensity and novelty — than of settled long-term patterns.",
    attachment:
      "Our behavioural model currently detects stronger indicators of comfortable attachment — routine, reliance and daily habits — than of early-stage intensity.",
    growingLove:
      "Our behavioural model currently detects stronger indicators of long-term commitment — trust, consistency and mutual care — than of short-term attraction.",
  };
  return `${phrases[dominant]} This is an estimate from observable activity (${confidence}% confidence), not a statement about how either of you feels.`;
};

/**
 * Pure scoring core over gatherHealthFeatures output.
 * @returns {{ score, level, indicators, pattern, confidence, statement }}
 */
const score = (features, cfg) => {
  const t = cfg.thresholds;
  const bt = t.behavior;
  const w = cfg.weights.behavior;
  const pw = cfg.weights.behaviorPatterns;
  const now = features.now ?? Date.now();
  const { moods = [], messages = [], daysTogether = 0 } = features;

  // ── indicators ──
  const raw = {
    healthyCommunication: healthyCommunication(messages, now, t),
    emotionalSupport: features.supportRatio != null ? clamp(features.supportRatio * 100) : null,
    mutualEffort: mutualEffort(features),
    consistency:
      features.trustFeatures && (features.trustFeatures.streak > 0 || features.trustFeatures.longest > 0)
        ? clamp(saturate(features.trustFeatures.streak, 14) * 0.6 + saturate(features.trustFeatures.longest, 30) * 0.4)
        : null,
    engagement:
      moods.length + messages.length + (features.memories || []).length > 0
        ? clamp(saturate(moods.length + messages.length + (features.memories || []).length, t.saturation.engagementActivity * 2))
        : null,
    conflictPressure: conflictPressure(moods),
    emotionalCloseness: emotionalCloseness(features, now),
  };

  const indicators = {};
  for (const [k, v] of Object.entries(raw)) {
    if (v == null || Number.isNaN(v)) continue;
    const rounded = Math.round(clamp(v));
    indicators[k] = {
      score: rounded,
      insight: rounded >= 60 ? INSIGHT[k].high : INSIGHT[k].low,
    };
  }

  const overall = weightedAvg(
    Object.fromEntries(Object.entries(indicators).map(([k, v]) => [k, v.score])),
    w,
  );
  const value = overall == null ? t.neutralBaseline : Math.round(overall);
  const level = levelFor(value, t.levels);

  // ── pattern model signals (all couple-symmetric) ──
  const activeMsgDays = distinctDays(messages) || 1;
  const msgsPerActiveDay = messages.length / activeMsgDays;
  const excited = moods.filter((m) => m.moodType === "excited").length;

  const signals = {
    attraction: {
      messageIntensity: messages.length ? clamp((msgsPerActiveDay / bt.intensityMessagesPerDay) * 100) : null,
      novelty: piecewise(daysTogether, bt.noveltyAnchors),
      excitementMoods: moods.length ? clamp((excited / moods.length) * (100 / 0.35)) : null,
      mediaPlayfulness:
        (features.voiceCount || 0) + (features.videoCount || 0) + (features.storyCount || 0) > 0
          ? clamp(saturate((features.voiceCount || 0) + (features.videoCount || 0) + (features.storyCount || 0), 15))
          : null,
    },
    attachment: {
      routine: messages.length
        ? clamp((distinctDays(messages) / t.windows.primary / bt.routineFullShare) * 100)
        : null,
      streakHabit: features.trustFeatures?.streak > 0 ? clamp(saturate(features.trustFeatures.streak, 21)) : null,
      responsiveness: features.responsiveness,
      dailyRituals:
        (features.dailyMomentsCount || 0) > 0 ? clamp(saturate(features.dailyMomentsCount, 20)) : null,
    },
    growingLove: {
      trust:
        features.trustFeatures && features.trustFeatures.myMsgs + features.trustFeatures.partnerMsgs > 0
          ? trustEngine.score(features.trustFeatures, cfg).score
          : null,
      conflictRecovery: features.conflictRecoveryPct,
      longevity: piecewise(daysTogether, t.longevityAnchors),
      mutualEffort: raw.mutualEffort,
      sharedGrowth:
        (features.bucketCompleted || 0) + (features.achievementCount || 0) > 0
          ? clamp(saturate((features.bucketCompleted || 0) + (features.achievementCount || 0), 15))
          : null,
      supportiveness: features.supportRatio != null ? clamp(features.supportRatio * 100) : null,
    },
  };

  const patternRaw = {
    attraction: weightedAvg(signals.attraction, pw.attraction),
    attachment: weightedAvg(signals.attachment, pw.attachment),
    growingLove: weightedAvg(signals.growingLove, pw.growingLove),
  };

  const dataPoints = moods.length + messages.length + (features.memories || []).length;
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

  // Distribution over the three patterns (sums to ~100 when signal exists).
  const present = Object.entries(patternRaw).filter(([, v]) => v != null);
  const sum = present.reduce((a, [, v]) => a + v, 0);
  const distribution = {};
  for (const [k, v] of present) distribution[k] = sum > 0 ? Math.round((v / sum) * 100) : 0;

  const enoughSignal = dataPoints >= bt.patternMinDataPoints && present.length >= 2;
  const dominant = enoughSignal
    ? present.sort((a, b) => b[1] - a[1])[0][0]
    : null;

  return {
    score: value,
    level,
    indicators,
    pattern: {
      distribution,
      dominant,
      dominantLabel: dominant ? PATTERN_LABELS[dominant] : null,
      statement: patternStatement(dominant, distribution, confidence.value),
    },
    breakdown: Object.fromEntries(Object.entries(indicators).map(([k, v]) => [k, v.score])),
    confidence: confidence.value,
    confidenceLevel: confidence.level,
    statement: `Behavioural signals over the last ${t.windows.primary} days suggest an overall pattern score of ${value}/100 (${confidence.value}% confidence). These are indicators from observable activity, not facts about feelings.`,
  };
};

module.exports = { score };
