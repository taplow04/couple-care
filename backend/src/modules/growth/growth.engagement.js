/**
 * Personal (solo) engagement — the user-scoped mirror of engagement.service.
 *
 * The couple engagement system is coupleId-keyed and can't track a partner-less
 * user, so Stage 1 (Preparing) and Stage 3 (Healing) progress lives on the User
 * doc: `personalXp`, `growthStreak`, `growthAchievements`. It REUSES the couple
 * leveling math (levelForXP) so the bars behave identically.
 *
 * recordGrowthActivity() is the single entry point: it awards XP (once per type
 * per day), advances the day-based growth streak, evaluates personal
 * achievements, and emits `growth:update` to the user. It NEVER throws.
 */
const User = require("../users/user.model");
const GrowthJournal = require("./growth.model").GrowthJournal;
const { GrowthChallenge } = require("./growth.model");
const { emitToUser } = require("../../utils/realtime");
const { createNotification } = require("../notifications/notification.service");
const { levelForXP } = require("../engagement/engagement.constants");
const {
  GROWTH_ACTIVITY_LIST,
  GROWTH_XP,
  GROWTH_STREAK_MILESTONES,
} = require("./growth.constants");
const { GROWTH_ACHIEVEMENTS } = require("./growth.achievements.catalog");

const dayKey = (d = new Date()) => new Date(d).toISOString().slice(0, 10);
const dayToDate = (key) => new Date(`${key}T00:00:00.000Z`);
const daysBetween = (a, b) => Math.round((dayToDate(b) - dayToDate(a)) / 86400000);

// Lifetime per-type counts for achievement checks.
const buildGrowthStats = async (user) => {
  const userId = user._id;
  const [journal, reflection, gratitude, challengeDone] = await Promise.all([
    GrowthJournal.countDocuments({ userId, type: "journal" }),
    GrowthJournal.countDocuments({ userId, type: "reflection" }),
    GrowthJournal.countDocuments({ userId, type: "gratitude" }),
    GrowthChallenge.countDocuments({ userId, completed: true }),
  ]);
  const lvl = levelForXP(user.personalXp || 0);
  return {
    personalXp: user.personalXp || 0,
    level: lvl.level,
    currentStreak: user.growthStreak?.current || 0,
    longestStreak: user.growthStreak?.longest || 0,
    totalEntries: journal + reflection + gratitude,
    counts: {
      journal,
      reflection,
      gratitude,
      challenge: challengeDone,
      quiz: 0,
      coach: 0,
      mood: 0,
    },
    readinessScore: user.readinessScore || 0,
    hasLoveLanguage: !!user.loveLanguage,
    hasAttachment: !!user.attachmentStyle,
  };
};

const buildGrowthSummary = (user) => {
  const xp = user.personalXp || 0;
  const lvl = levelForXP(xp);
  const have = new Set(user.growthAchievements || []);
  return {
    personalXp: xp,
    level: lvl.level,
    currentLevelXp: lvl.currentLevelXp,
    nextLevelXp: lvl.nextLevelXp,
    levelProgress: lvl.progress,
    currentStreak: user.growthStreak?.current || 0,
    longestStreak: user.growthStreak?.longest || 0,
    lastActiveDay: user.growthStreak?.lastActiveDay || null,
    readinessScore: user.readinessScore ?? null,
    loveLanguage: user.loveLanguage || null,
    attachmentStyle: user.attachmentStyle || null,
    achievementsUnlocked: have.size,
    achievementsTotal: GROWTH_ACHIEVEMENTS.length,
    achievements: GROWTH_ACHIEVEMENTS.map((a) => ({
      key: a.key,
      title: a.title,
      emoji: a.emoji,
      description: a.description,
      unlocked: have.has(a.key),
    })),
  };
};

/**
 * Record one solo growth activity. Fire-and-forget from callers. Never throws.
 * Returns the fresh growth summary (or null on failure).
 *
 * XP is "once per type per day": the CALLER decides via meta.awardXp (it knows
 * whether this is the first occurrence today — e.g. a freshly created reflection
 * vs an edit of today's existing one). Defaults to true. The day-based streak is
 * always kept alive regardless.
 */
const recordGrowthActivity = async (userId, type, meta = {}) => {
  if (!userId || !GROWTH_ACTIVITY_LIST.includes(type)) return null;

  try {
    const user = await User.findById(userId);
    if (!user) return null;

    const day = dayKey();

    // ── XP: once per type per day (caller-gated) ──
    if (meta.awardXp !== false) {
      user.personalXp = (user.personalXp || 0) + (GROWTH_XP[type] || 0);
    }

    // ── Day-based growth streak (non-punishing; any activity keeps it alive) ──
    const last = user.growthStreak?.lastActiveDay || null;
    if (last !== day) {
      if (!last) {
        user.growthStreak.current = 1;
      } else {
        const gap = daysBetween(last, day);
        user.growthStreak.current = gap === 1 ? (user.growthStreak.current || 0) + 1 : 1;
      }
      user.growthStreak.lastActiveDay = day;
      if (user.growthStreak.current > (user.growthStreak.longest || 0)) {
        user.growthStreak.longest = user.growthStreak.current;
      }
    }

    // ── Achievements ──
    const stats = await buildGrowthStats(user);
    const have = new Set(user.growthAchievements || []);
    const newlyUnlocked = [];
    for (const def of GROWTH_ACHIEVEMENTS) {
      if (have.has(def.key)) continue;
      let ok = false;
      try {
        ok = def.check(stats);
      } catch {
        ok = false;
      }
      if (ok) {
        have.add(def.key);
        newlyUnlocked.push(def);
      }
    }
    user.growthAchievements = [...have];

    await user.save();

    const summary = buildGrowthSummary(user);

    // Live update for the personal XP bar / streak.
    try {
      emitToUser(userId, "growth:update", summary);
    } catch {
      /* offline */
    }

    // Streak milestone celebration.
    const streak = user.growthStreak.current;
    if (last !== day && GROWTH_STREAK_MILESTONES.includes(streak)) {
      try {
        await createNotification({
          userId,
          title: `🔥 ${streak}-day growth streak!`,
          message: `You've shown up for yourself ${streak} days in a row. Keep growing.`,
          type: "growth_reminder",
          metadata: { streak },
        });
      } catch {
        /* non-fatal */
      }
    }

    for (const def of newlyUnlocked) {
      try {
        emitToUser(userId, "growth:achievement", {
          key: def.key,
          title: def.title,
          emoji: def.emoji,
          description: def.description,
        });
        await createNotification({
          userId,
          title: `${def.emoji} Achievement unlocked!`,
          message: `${def.title} — ${def.description}`,
          type: "achievement_unlocked",
          metadata: { key: def.key, personal: true },
        });
      } catch {
        /* non-fatal */
      }
    }

    return summary;
  } catch (e) {
    console.error("[growth] recordGrowthActivity failed:", e.message);
    return null;
  }
};

module.exports = {
  recordGrowthActivity,
  buildGrowthSummary,
  buildGrowthStats,
  dayKey,
};
