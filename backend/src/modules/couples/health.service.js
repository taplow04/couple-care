/**
 * Relationship Health — a COUPLE metric.
 *
 * The score belongs to the couple, not the individual: User A and User B of the
 * same couple MUST always get the identical number. To guarantee that, every
 * input here is couple-symmetric (both partners' moods, couple memories, couple
 * messages, days together) and the computation is fully DETERMINISTIC — same
 * couple state on the same day always yields the same score. Nothing depends on
 * which partner asked.
 *
 * Official weighting (each sub-score is 0–100, then weighted):
 *   Mood Health            25%
 *   Communication Health   20%
 *   Memory Creation        15%
 *   Relationship Longevity 10%
 *   Mood Compatibility     10%
 *   Engagement             10%
 *   AI Relationship Trend  10%   (deterministic trend math — NOT an LLM call,
 *                                 which would break the "identical" rule)
 */
const Couple = require("./couple.model");
const Mood = require("../moods/mood.model");
const Memory = require("../memories/memory.model");
const Message = require("../chat/message.model");
const User = require("../users/user.model");
const { getDaysTogether } = require("./couple.helpers");
const { emitToUser } = require("../../utils/realtime");

const POSITIVE = new Set(["happy", "loved", "excited"]);
const NEGATIVE = new Set(["sad", "angry", "stressed", "anxious"]);

const WEIGHTS = {
  moodHealth: 0.25,
  communication: 0.2,
  memory: 0.15,
  longevity: 0.1,
  compatibility: 0.1,
  engagement: 0.1,
  aiAnalysis: 0.1,
};

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const daysAgo = (n) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const dayKey = (d) => new Date(d).toISOString().slice(0, 10); // UTC YYYY-MM-DD

// Intensity-weighted positivity ratio (0..1) for a set of moods. null if empty.
const positivityRatio = (moods) => {
  let pos = 0;
  let neg = 0;
  for (const m of moods) {
    const w = m.intensity || 1;
    if (POSITIVE.has(m.moodType)) pos += w;
    else if (NEGATIVE.has(m.moodType)) neg += w;
  }
  if (pos + neg === 0) return null;
  return pos / (pos + neg);
};

// Count of distinct calendar days (within `windowMoods`) that have any entry.
const distinctDays = (items) => new Set(items.map((i) => dayKey(i.createdAt))).size;

// ─── Component sub-scores (each 0–100) ───────────────────────────────────────

// Mood Health (25%): positivity + consistency + frequency over BOTH partners.
const moodHealthScore = (moods) => {
  if (moods.length === 0) return 50; // neutral baseline — no data
  const positivity = (positivityRatio(moods) ?? 0.5) * 100;
  const recent = moods.filter((m) => new Date(m.createdAt) >= daysAgo(14));
  const consistency = (distinctDays(recent) / 14) * 100;
  const frequency = Math.min(moods.length / 28, 1) * 100;
  return clamp(0.6 * positivity + 0.25 * consistency + 0.15 * frequency);
};

// Communication Health (20%): volume + two-way balance + active days − inactivity.
const communicationScore = (messages) => {
  if (messages.length === 0) return 50; // neutral baseline — no data
  const counts = {};
  let lastAt = 0;
  for (const m of messages) {
    const s = String(m.senderId);
    counts[s] = (counts[s] || 0) + 1;
    lastAt = Math.max(lastAt, new Date(m.createdAt).getTime());
  }
  const volume = Math.min(messages.length / 200, 1) * 100;

  const sides = Object.values(counts);
  const a = sides[0] || 0;
  const b = sides[1] || 0;
  const twoWay = a + b > 0 ? (1 - Math.abs(a - b) / (a + b)) * 100 : 0;

  const recent = messages.filter((m) => new Date(m.createdAt) >= daysAgo(14));
  const activeDays = (distinctDays(recent) / 14) * 100;

  const daysSinceLast = (Date.now() - lastAt) / (24 * 60 * 60 * 1000);
  const inactivityPenalty = Math.min(Math.max(daysSinceLast - 1, 0) * 5, 40);

  return clamp(0.4 * volume + 0.3 * twoWay + 0.3 * activeDays - inactivityPenalty);
};

// Memory Creation (15%): volume + recency + diversity of couple memories.
const memoryScore = (memories) => {
  if (memories.length === 0) return 50; // neutral baseline — no data
  const volume = Math.min(memories.length / 12, 1) * 100;

  const lastDate = memories.reduce((acc, m) => {
    const t = new Date(m.memoryDate || m.createdAt).getTime();
    return Math.max(acc, t);
  }, 0);
  const daysSinceLast = (Date.now() - lastDate) / (24 * 60 * 60 * 1000);
  const recency = clamp(100 - daysSinceLast * 2);

  const types = new Set(memories.map((m) => m.memoryType || "other"));
  const diversity = Math.min(types.size / 7, 1) * 100;

  return clamp(0.5 * volume + 0.25 * recency + 0.25 * diversity);
};

// Relationship Longevity (10%): days together + milestones reached.
const MILESTONES = [30, 180, 365, 730, 1825]; // 1mo, 6mo, 1y, 2y, 5y
const longevityScore = (days) => {
  // Piecewise-linear anchors: starting out still earns credit.
  const anchors = [
    [0, 40],
    [30, 55],
    [180, 70],
    [365, 80],
    [730, 90],
    [1825, 100],
  ];
  let daysScore = 100;
  for (let i = 0; i < anchors.length - 1; i++) {
    const [d0, s0] = anchors[i];
    const [d1, s1] = anchors[i + 1];
    if (days <= d1) {
      const t = d1 === d0 ? 0 : (days - d0) / (d1 - d0);
      daysScore = s0 + t * (s1 - s0);
      break;
    }
  }
  const milestoneRatio = MILESTONES.filter((m) => days >= m).length / MILESTONES.length;
  return clamp(0.85 * daysScore + 0.15 * milestoneRatio * 100);
};

// Mood Compatibility (10%): emotional alignment between the two partners.
const compatibilityScore = (moodsA, moodsB) => {
  const posA = positivityRatio(moodsA);
  const posB = positivityRatio(moodsB);
  if (posA === null || posB === null) return 50; // need both partners' moods
  const sync = 1 - Math.abs(posA - posB);

  // Day-level valence overlap over the last 14 days.
  const valence = (moods) => {
    const map = {};
    for (const m of moods) {
      if (new Date(m.createdAt) < daysAgo(14)) continue;
      const k = dayKey(m.createdAt);
      const v = POSITIVE.has(m.moodType) ? 1 : NEGATIVE.has(m.moodType) ? -1 : 0;
      map[k] = (map[k] || 0) + v;
    }
    return map;
  };
  const va = valence(moodsA);
  const vb = valence(moodsB);
  const sharedDays = Object.keys(va).filter((k) => k in vb);
  let overlap = sync; // fallback when they never logged on the same day
  if (sharedDays.length > 0) {
    const matches = sharedDays.filter(
      (k) => Math.sign(va[k]) === Math.sign(vb[k]),
    ).length;
    overlap = matches / sharedDays.length;
  }
  return clamp((0.7 * sync + 0.3 * overlap) * 100);
};

// Engagement (10%): combined recent activity, rewarding BOTH partners active.
const engagementScore = (moods, memories, messages, partnerIds) => {
  const within14 = (i, field) => new Date(i[field] || i.createdAt) >= daysAgo(14);
  const m14 = moods.filter((m) => within14(m, "createdAt"));
  const mem14 = memories.filter((m) => within14(m, "createdAt"));
  const msg14 = messages.filter((m) => within14(m, "createdAt"));
  const activity = m14.length + mem14.length + msg14.length;
  if (activity === 0) return 30; // both quiet

  const base = Math.min(activity / 40, 1) * 100;

  // Did BOTH partners contribute anything (a mood or a message) in the window?
  const contributors = new Set([
    ...m14.map((m) => String(m.userId)),
    ...msg14.map((m) => String(m.senderId)),
  ]);
  const bothActive = partnerIds.every((id) => contributors.has(String(id)));
  return clamp(base * (bothActive ? 1 : 0.7));
};

// AI Relationship Trend (10%): deterministic last-7 vs prior-7 momentum.
const aiTrendScore = (moods, memories, messages) => {
  const windowComposite = (start, end) => {
    const inWin = (i, field) => {
      const t = new Date(i[field] || i.createdAt).getTime();
      return t >= daysAgo(start).getTime() && t < daysAgo(end).getTime();
    };
    const wm = moods.filter((m) => inWin(m, "createdAt"));
    const wmsg = messages.filter((m) => inWin(m, "createdAt"));
    const wmem = memories.filter((m) => inWin(m, "createdAt"));
    if (wm.length + wmsg.length + wmem.length === 0) return null;
    const positivity = positivityRatio(wm) ?? 0.5;
    return (
      positivity * 0.5 +
      Math.min(wmsg.length / 50, 1) * 0.3 +
      Math.min(wmem.length / 3, 1) * 0.2
    );
  };
  const recent = windowComposite(7, 0);
  const prior = windowComposite(14, 7);
  if (recent === null && prior === null) return 60; // not enough signal
  const delta = (recent ?? 0.5) - (prior ?? 0.5);
  return clamp(70 + delta * 100);
};

const levelFor = (score) => {
  if (score >= 90) return "Excellent";
  if (score >= 75) return "Healthy";
  if (score >= 50) return "Moderate";
  return "Needs Attention";
};

/**
 * Compute (and cache) the couple's Relationship Health. Deterministic and
 * identical for both partners. Returns { score, level, breakdown }.
 */
const computeCoupleHealth = async (coupleId) => {
  const couple = await Couple.findById(coupleId);
  if (!couple) throw new Error("Couple not found");

  const partnerIds = [couple.partnerOneId, couple.partnerTwoId].filter(Boolean);

  const since = daysAgo(30);
  const [moods, memories, messages] = await Promise.all([
    Mood.find({ coupleId, createdAt: { $gte: since } }).select(
      "moodType intensity userId createdAt",
    ),
    Memory.find({ coupleId }).select("memoryType memoryDate createdAt"),
    Message.find({ coupleId, createdAt: { $gte: since } }).select(
      "senderId createdAt",
    ),
  ]);

  const moodsA = moods.filter(
    (m) => String(m.userId) === String(couple.partnerOneId),
  );
  const moodsB = moods.filter(
    (m) => String(m.userId) === String(couple.partnerTwoId),
  );

  const breakdown = {
    moodHealth: Math.round(moodHealthScore(moods)),
    communication: Math.round(communicationScore(messages)),
    memory: Math.round(memoryScore(memories)),
    longevity: Math.round(longevityScore(getDaysTogether(couple))),
    compatibility: Math.round(compatibilityScore(moodsA, moodsB)),
    engagement: Math.round(engagementScore(moods, memories, messages, partnerIds)),
    aiAnalysis: Math.round(aiTrendScore(moods, memories, messages)),
  };

  const score = clamp(
    Math.round(
      breakdown.moodHealth * WEIGHTS.moodHealth +
        breakdown.communication * WEIGHTS.communication +
        breakdown.memory * WEIGHTS.memory +
        breakdown.longevity * WEIGHTS.longevity +
        breakdown.compatibility * WEIGHTS.compatibility +
        breakdown.engagement * WEIGHTS.engagement +
        breakdown.aiAnalysis * WEIGHTS.aiAnalysis,
    ),
  );
  const level = levelFor(score);

  // Persist the cache on the couple (best-effort — never block the response).
  try {
    await Couple.updateOne(
      { _id: coupleId },
      {
        $set: {
          healthScore: score,
          healthLevel: level,
          healthBreakdown: breakdown,
          healthUpdatedAt: new Date(),
        },
      },
    );
  } catch (e) {
    console.error("[health] cache write failed:", e.message);
  }

  return { score, level, breakdown };
};

// Resolve the caller's couple then compute. Used by the AI/dashboard layers.
const getCoupleHealthForUser = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user || !user.currentCoupleId) {
    throw new Error("No active relationship");
  }
  return computeCoupleHealth(user.currentCoupleId);
};

// Push a couple-scoped event to BOTH partners (no room-join required).
const emitToCouple = (couple, event, payload) => {
  if (!couple) return;
  [couple.partnerOneId, couple.partnerTwoId].filter(Boolean).forEach((id) => {
    emitToUser(id, event, payload);
  });
};

// Recompute health for a couple and broadcast it live to both partners. Used
// by mood/memory writes for real-time propagation. Never throws.
const recomputeAndBroadcast = async (coupleId, activityType) => {
  try {
    const couple = await Couple.findById(coupleId).select(
      "partnerOneId partnerTwoId",
    );
    if (!couple) return;
    const health = await computeCoupleHealth(coupleId);
    emitToCouple(couple, "health:update", health);
    emitToCouple(couple, "couple:activity", {
      type: activityType,
      at: Date.now(),
    });
  } catch (e) {
    console.error("[health] recomputeAndBroadcast failed:", e.message);
  }
};

module.exports = {
  computeCoupleHealth,
  getCoupleHealthForUser,
  recomputeAndBroadcast,
  emitToCouple,
};
