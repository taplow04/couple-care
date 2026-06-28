/**
 * Engagement service — the shared backbone of CoupleCare V2.0.
 *
 * Every metric here is a COUPLE metric (identical for both partners), and is
 * designed to reward MUTUAL participation:
 *   • XP    — earned per DAY: a day where BOTH partners were active is worth
 *             DAILY_XP_BOTH; a day where only one was is worth DAILY_XP_ONE.
 *             Derived deterministically from ActivityLog, so it never drifts.
 *   • Streak — counts consecutive MUTUAL days (both partners active), with a
 *             small grace window so one missed day isn't a harsh reset.
 *   • Level  — derived from total XP.
 *
 * Every feature funnels through ONE entry point, recordActivity(), which logs
 * the action, recomputes streak + XP, evaluates achievements, and pushes a live
 * `engagement:update` to BOTH partners. It NEVER throws.
 */
const mongoose = require("mongoose");
const Engagement = require("./engagement.model");
const ActivityLog = require("./activityLog.model");
const Achievement = require("./achievement.model");
const Couple = require("../couples/couple.model");
const User = require("../users/user.model");
const { emitToUser } = require("../../utils/realtime");
const { createNotification } = require("../notifications/notification.service");
const {
  ACTIVITY_TYPE_LIST,
  STREAK_MILESTONES,
  DAILY_XP_BOTH,
  DAILY_XP_ONE,
  STREAK_GRACE_DAYS,
  levelForXP,
} = require("./engagement.constants");
const { ACHIEVEMENTS, ACHIEVEMENT_MAP } = require("./achievements.catalog");

// ─── date helpers (UTC) ──────────────────────────────────────────────────────
const dayKey = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
const dayToDate = (key) => new Date(`${key}T00:00:00.000Z`);
const daysBetweenKeys = (a, b) =>
  Math.round((dayToDate(b) - dayToDate(a)) / 86400000);

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
    eng = await Engagement.findOneAndUpdate(
      { coupleId },
      { $setOnInsert: { coupleId } },
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
  }
  return eng;
};

const getPartnerIds = async (coupleId) => {
  const couple = await Couple.findById(coupleId).select("partnerOneId partnerTwoId");
  if (!couple) return { couple: null, partnerIds: [] };
  const partnerIds = [couple.partnerOneId, couple.partnerTwoId]
    .filter(Boolean)
    .map(String);
  return { couple, partnerIds };
};

const emitToCouple = (couple, event, payload) => {
  if (!couple) return;
  [couple.partnerOneId, couple.partnerTwoId]
    .filter(Boolean)
    .forEach((id) => emitToUser(id, event, payload));
};

// Distinct userIds who were active today (couple-scoped).
const activeUsersOn = async (coupleId, day) =>
  (await ActivityLog.distinct("userId", { coupleId, day })).map(String);

/**
 * Recompute total XP from the full ActivityLog — couple-level and mutual-aware.
 * Each day is worth DAILY_XP_BOTH if BOTH partners were active, else
 * DAILY_XP_ONE. Deterministic (pure function of the log), so XP never drifts and
 * is identical for both partners.
 */
const recomputeXp = async (coupleId, partnerIds) => {
  const grouped = await ActivityLog.aggregate([
    { $match: { coupleId: new mongoose.Types.ObjectId(String(coupleId)) } },
    { $group: { _id: "$day", users: { $addToSet: "$userId" } } },
  ]);

  const thisWeek = weekKey();
  let totalXP = 0;
  let xpThisWeek = 0;

  for (const g of grouped) {
    const dayUsers = g.users.map(String);
    const bothActive =
      partnerIds.length === 2 && partnerIds.every((id) => dayUsers.includes(id));
    const dayXP = bothActive ? DAILY_XP_BOTH : DAILY_XP_ONE;
    totalXP += dayXP;
    if (weekKey(dayToDate(g._id)) === thisWeek) xpThisWeek += dayXP;
  }

  return { totalXP, xpThisWeek, level: levelForXP(totalXP).level };
};

/**
 * Advance the shared streak. It only moves on a MUTUAL day (both partners
 * active). A grace window (STREAK_GRACE_DAYS) means a single missed day doesn't
 * reset it. Returns a milestone number if one was just reached.
 */
const updateMutualStreak = (eng, bothActiveToday, today) => {
  if (!bothActiveToday) return null; // not mutual yet — streak waits
  if (eng.lastMutualDay === today) return null; // already counted today

  if (!eng.lastMutualDay) {
    eng.currentStreak = 1;
  } else {
    const gap = daysBetweenKeys(eng.lastMutualDay, today);
    eng.currentStreak = gap <= STREAK_GRACE_DAYS ? eng.currentStreak + 1 : 1;
  }
  eng.lastMutualDay = today;
  if (eng.currentStreak > eng.longestStreak) eng.longestStreak = eng.currentStreak;

  return STREAK_MILESTONES.includes(eng.currentStreak) ? eng.currentStreak : null;
};

// Public couple-level snapshot. `extra` carries today's participation facts.
const buildSummary = (eng, extra = {}) => {
  const lvl = levelForXP(eng.totalXP);
  return {
    currentStreak: eng.currentStreak,
    longestStreak: eng.longestStreak,
    lastActiveDay: eng.lastActiveDay,
    lastMutualDay: eng.lastMutualDay,
    totalXP: eng.totalXP,
    xpThisWeek: eng.xpThisWeek,
    level: lvl.level,
    currentLevelXp: lvl.currentLevelXp,
    nextLevelXp: lvl.nextLevelXp,
    levelProgress: lvl.progress,
    bothActiveToday: extra.bothActiveToday ?? false,
    activeTodayCount: extra.activeTodayCount ?? 0,
  };
};

// Stats object for achievement evaluation (lifetime per-type counts).
const buildStats = async (coupleId, eng) => {
  const grouped = await ActivityLog.aggregate([
    { $match: { coupleId: eng.coupleId } },
    { $group: { _id: "$type", n: { $sum: 1 } } },
  ]);
  const counts = ACTIVITY_TYPE_LIST.reduce((acc, t) => ((acc[t] = 0), acc), {});
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
      /* unique-index race — already inserted */
    }
  }
  return newlyUnlocked;
};

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

/**
 * Record one engagement activity. Fire-and-forget from callers. Recomputes the
 * couple's shared streak + XP and broadcasts to both partners. Never throws.
 */
const recordActivity = async (coupleId, userId, type, meta = {}) => {
  if (!coupleId || !userId || !ACTIVITY_TYPE_LIST.includes(type)) return null;

  try {
    const day = dayKey();
    await ActivityLog.create({ coupleId, userId, type, day, meta });

    const eng = await getOrCreateEngagement(coupleId);
    const { couple, partnerIds } = await getPartnerIds(coupleId);

    const todayUsers = await activeUsersOn(coupleId, day);
    const bothActiveToday =
      partnerIds.length === 2 && partnerIds.every((id) => todayUsers.includes(id));

    eng.lastActiveDay = day;
    const milestone = updateMutualStreak(eng, bothActiveToday, day);

    const xp = await recomputeXp(coupleId, partnerIds);
    eng.totalXP = xp.totalXP;
    eng.xpThisWeek = xp.xpThisWeek;
    eng.level = xp.level;

    await eng.save();

    const newlyUnlocked = await evaluateAchievements(coupleId, eng);

    const summary = buildSummary(eng, {
      bothActiveToday,
      activeTodayCount: todayUsers.length,
    });
    emitToCouple(couple, "engagement:update", summary);

    // CCIE — publish a couple-activity event so the intelligence engines
    // recompute incrementally (debounced). Lazy-required + best-effort: the brain
    // must never break the action that triggered it.
    try {
      require("../../intelligence/events/bus").publish("COUPLE_ACTIVITY", {
        coupleId,
        type,
      });
    } catch {
      /* intelligence optional */
    }

    if (milestone) {
      await notifyBoth(couple, {
        title: `🔥 ${milestone}-day streak!`,
        message: `You and your partner kept it going together for ${milestone} days. Keep the love alive!`,
        type: "streak_milestone",
        metadata: { streak: milestone },
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

// ─── read API ────────────────────────────────────────────────────────────────

/**
 * Couple-level engagement summary + today's participation (couple-scoped, same
 * for both partners). Returns todayUsers/partnerIds so callers can derive the
 * per-user "did you / did your partner act today" flags.
 */
const getEngagementSummary = async (coupleId) => {
  const eng = await getOrCreateEngagement(coupleId);
  const day = dayKey();
  const [todayUsers, { partnerIds }] = await Promise.all([
    activeUsersOn(coupleId, day),
    getPartnerIds(coupleId),
  ]);
  const bothActiveToday =
    partnerIds.length === 2 && partnerIds.every((id) => todayUsers.includes(id));
  const summary = buildSummary(eng, {
    bothActiveToday,
    activeTodayCount: todayUsers.length,
  });
  return { summary, todayUsers, partnerIds };
};

const getEngagementForUser = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user || !user.currentCoupleId) throw new Error("No active relationship");
  const coupleId = user.currentCoupleId;

  const { summary, todayUsers, partnerIds } = await getEngagementSummary(coupleId);
  const youActiveToday = todayUsers.includes(String(userId));
  const partnerId = partnerIds.find((id) => id !== String(userId)) || null;
  const partnerActiveToday = partnerId ? todayUsers.includes(partnerId) : false;

  const unlocked = await Achievement.find({ coupleId })
    .sort({ unlockedAt: -1 })
    .select("key unlockedAt");
  const have = new Set(unlocked.map((a) => a.key));
  const unlockedAt = unlocked.reduce((acc, a) => ((acc[a.key] = a.unlockedAt), acc), {});

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
    youActiveToday,
    partnerActiveToday,
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
  getEngagementSummary,
  getOrCreateEngagement,
  buildSummary,
  dayKey,
  ACHIEVEMENT_MAP,
};
