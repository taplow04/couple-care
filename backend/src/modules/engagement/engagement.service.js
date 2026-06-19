/**
 * Engagement service — the shared backbone of CoupleCare V2.0.
 *
 * Every feature funnels through ONE entry point, recordActivity(), mirroring the
 * existing health.service.recomputeAndBroadcast pattern. It logs the activity,
 * updates the couple's Streak + XP, evaluates Achievements, and pushes a live
 * `engagement:update` (and `achievement:unlocked`) to BOTH partners. It NEVER
 * throws — engagement must never break the action that triggered it.
 */
const Engagement = require("./engagement.model");
const ActivityLog = require("./activityLog.model");
const Achievement = require("./achievement.model");
const Couple = require("../couples/couple.model");
const User = require("../users/user.model");
const { emitToUser } = require("../../utils/realtime");
const { createNotification } = require("../notifications/notification.service");
const {
  ACTIVITY_TYPE_LIST,
  XP_VALUES,
  STREAK_MILESTONES,
  levelForXP,
} = require("./engagement.constants");
const { ACHIEVEMENTS, ACHIEVEMENT_MAP } = require("./achievements.catalog");

// ─── date helpers (UTC, consistent with health.service) ──────────────────────
const dayKey = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
const yesterdayKey = () => dayKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

// ISO-8601 week key, e.g. "2026-W25".
const weekKey = (d = new Date()) => {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(date.getUTCFullYear(), 0, 4));
  const week =
    1 +
    Math.round(
      ((date - firstThursday) / 86400000 -
        3 +
        ((firstThursday.getUTCDay() + 6) % 7)) /
        7,
    );
  return `${date.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

// ─── couple-scoped helpers ───────────────────────────────────────────────────

const getOrCreateEngagement = async (coupleId) => {
  let eng = await Engagement.findOne({ coupleId });
  if (!eng) {
    // Upsert is race-safe (unique index on coupleId).
    eng = await Engagement.findOneAndUpdate(
      { coupleId },
      { $setOnInsert: { coupleId } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }
  return eng;
};

const emitToCouple = (couple, event, payload) => {
  if (!couple) return;
  [couple.partnerOneId, couple.partnerTwoId]
    .filter(Boolean)
    .forEach((id) => emitToUser(id, event, payload));
};

// Public-facing snapshot of the couple's engagement state.
const buildSummary = (eng) => {
  const lvl = levelForXP(eng.totalXP);
  return {
    currentStreak: eng.currentStreak,
    longestStreak: eng.longestStreak,
    lastActiveDay: eng.lastActiveDay,
    activeToday: eng.lastActiveDay === dayKey(),
    totalXP: eng.totalXP,
    xpThisWeek: eng.xpThisWeek,
    level: lvl.level,
    currentLevelXp: lvl.currentLevelXp,
    nextLevelXp: lvl.nextLevelXp,
    levelProgress: lvl.progress,
  };
};

// Build the stats object the achievement catalog evaluates against.
const buildStats = async (coupleId, eng) => {
  const grouped = await ActivityLog.aggregate([
    { $match: { coupleId: eng.coupleId } },
    { $group: { _id: "$type", n: { $sum: 1 } } },
  ]);
  const counts = ACTIVITY_TYPE_LIST.reduce((acc, t) => {
    acc[t] = 0;
    return acc;
  }, {});
  let totalActivities = 0;
  for (const g of grouped) {
    if (g._id in counts) counts[g._id] = g.n;
    totalActivities += g.n;
  }
  return {
    totalXP: eng.totalXP,
    level: eng.level,
    currentStreak: eng.currentStreak,
    longestStreak: eng.longestStreak,
    totalActivities,
    counts,
  };
};

// Evaluate the catalog; insert any newly satisfied badges. Returns the new defs.
const evaluateAchievements = async (coupleId, eng) => {
  const already = await Achievement.find({ coupleId }).select("key");
  const have = new Set(already.map((a) => a.key));
  const candidates = ACHIEVEMENTS.filter((a) => !have.has(a.key));
  if (candidates.length === 0) return [];

  const stats = await buildStats(coupleId, eng);
  const newlyUnlocked = [];

  for (const def of candidates) {
    let ok = false;
    try {
      ok = def.check(stats);
    } catch {
      ok = false;
    }
    if (!ok) continue;
    try {
      await Achievement.create({ coupleId, key: def.key });
      newlyUnlocked.push(def);
    } catch {
      // Unique-index race — another write already inserted it; ignore.
    }
  }
  return newlyUnlocked;
};

/**
 * Record one engagement activity for a couple. Fire-and-forget from callers.
 * @param {ObjectId|string} coupleId
 * @param {ObjectId|string} userId   who performed it
 * @param {string} type              one of ACTIVITY_TYPES
 * @param {object} [meta]            optional context for the timeline
 * @returns {Promise<object|null>}   the engagement summary, or null on failure
 */
const recordActivity = async (coupleId, userId, type, meta = {}) => {
  if (!coupleId || !userId || !ACTIVITY_TYPE_LIST.includes(type)) return null;

  try {
    const day = dayKey();

    // Is this the couple's first activity today, and the first of THIS type today?
    const [anyToday, typeToday] = await Promise.all([
      ActivityLog.countDocuments({ coupleId, day }),
      ActivityLog.countDocuments({ coupleId, type, day }),
    ]);
    const firstActivityToday = anyToday === 0;
    const firstOfTypeToday = typeToday === 0;
    const xp = firstOfTypeToday ? XP_VALUES[type] || 0 : 0;

    await ActivityLog.create({ coupleId, userId, type, day, xpAwarded: xp, meta });

    const eng = await getOrCreateEngagement(coupleId);

    // ── Streak: updated once per day, on the first activity of any type. ──
    let streakMilestone = null;
    if (firstActivityToday && eng.lastActiveDay !== day) {
      if (eng.lastActiveDay === yesterdayKey()) eng.currentStreak += 1;
      else eng.currentStreak = 1;
      eng.lastActiveDay = day;
      if (eng.currentStreak > eng.longestStreak) {
        eng.longestStreak = eng.currentStreak;
      }
      if (STREAK_MILESTONES.includes(eng.currentStreak)) {
        streakMilestone = eng.currentStreak;
      }
    }

    // ── XP + weekly bucket ──
    if (xp > 0) {
      const wk = weekKey();
      if (eng.weekKey !== wk) {
        eng.weekKey = wk;
        eng.xpThisWeek = 0;
      }
      eng.totalXP += xp;
      eng.xpThisWeek += xp;
      eng.level = levelForXP(eng.totalXP).level;
    }

    await eng.save();

    // ── Achievements ──
    const newlyUnlocked = await evaluateAchievements(coupleId, eng);

    // ── Broadcast + notify ──
    const couple = await Couple.findById(coupleId).select(
      "partnerOneId partnerTwoId",
    );
    const summary = buildSummary(eng);
    emitToCouple(couple, "engagement:update", summary);

    if (streakMilestone) {
      await notifyBoth(couple, {
        title: `🔥 ${streakMilestone}-day streak!`,
        message: `You and your partner kept it going for ${streakMilestone} days straight. Keep the love alive!`,
        type: "streak_milestone",
        metadata: { streak: streakMilestone },
      });
    }

    for (const def of newlyUnlocked) {
      emitToCouple(couple, "achievement:unlocked", {
        key: def.key,
        title: def.title,
        emoji: def.emoji,
        description: def.description,
      });
      await notifyBoth(couple, {
        title: `${def.emoji} Achievement unlocked!`,
        message: `${def.title} — ${def.description}`,
        type: "achievement_unlocked",
        metadata: { key: def.key },
      });
    }

    return summary;
  } catch (e) {
    console.error("[engagement] recordActivity failed:", e.message);
    return null;
  }
};

// Send the same notification to both partners (best-effort).
const notifyBoth = async (couple, payload) => {
  if (!couple) return;
  const ids = [couple.partnerOneId, couple.partnerTwoId].filter(Boolean);
  for (const id of ids) {
    try {
      await createNotification({ ...payload, userId: id });
    } catch {
      /* notification failure must not break engagement */
    }
  }
};

// ─── read API (controller) ───────────────────────────────────────────────────

const getEngagementForUser = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user || !user.currentCoupleId) {
    throw new Error("No active relationship");
  }
  const eng = await getOrCreateEngagement(user.currentCoupleId);
  const summary = buildSummary(eng);

  const unlocked = await Achievement.find({ coupleId: user.currentCoupleId })
    .sort({ unlockedAt: -1 })
    .select("key unlockedAt");
  const have = new Set(unlocked.map((a) => a.key));
  const unlockedAt = unlocked.reduce((acc, a) => {
    acc[a.key] = a.unlockedAt;
    return acc;
  }, {});

  // Full catalog with locked/unlocked state (for the achievements grid).
  const achievements = ACHIEVEMENTS.map((def) => ({
    key: def.key,
    title: def.title,
    emoji: def.emoji,
    description: def.description,
    unlocked: have.has(def.key),
    unlockedAt: unlockedAt[def.key] || null,
  }));

  return {
    ...summary,
    achievementsUnlocked: have.size,
    achievementsTotal: ACHIEVEMENTS.length,
    achievements,
  };
};

const getAchievementsForUser = async (userId) => {
  const data = await getEngagementForUser(userId);
  return data.achievements;
};

module.exports = {
  recordActivity,
  getEngagementForUser,
  getAchievementsForUser,
  getOrCreateEngagement,
  buildSummary,
  // exported for reuse/testing
  dayKey,
  ACHIEVEMENT_MAP,
};
