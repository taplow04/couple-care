const User = require("../users/user.model");
const Couple = require("../couples/couple.model");
const Mood = require("../moods/mood.model");
const { getMoodAnalytics } = require("../moods/mood.service");
const History = require("../histories/history.model");
const { getDaysTogether, getRelationshipStart } = require("../couples/couple.helpers");
const { getCachedHealth } = require("../couples/health.service");
const { getEngagementSummary } = require("../engagement/engagement.service");

// The Love Meter is a single COUPLE value: cached health (couple metric) lifted
// slightly by the shared streak. Pure function of couple-level inputs, so both
// partners and every surface show EXACTLY the same number.
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const computeLoveMeter = (healthScore, streak) => {
  if (healthScore == null) return null;
  return clamp(Math.round(healthScore * 0.9 + Math.min(streak || 0, 30) * 0.4));
};

const getDashboardData = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.currentCoupleId) {
    throw new Error("No active relationship");
  }

  const couple = await Couple.findById(user.currentCoupleId)
    .populate("partnerOneId", "name email profilePhoto birthday")
    .populate("partnerTwoId", "name email profilePhoto birthday");

  let partner;

  if (couple.partnerOneId._id.toString() === userId.toString()) {
    partner = couple.partnerTwoId;
  } else {
    partner = couple.partnerOneId;
  }

  const recentMoods = await Mood.find({
    userId,
  })
    .sort({
      createdAt: -1,
    })
    .limit(5);

  const recentHistories = await History.find({
    userId,
  })
    .sort({
      createdAt: -1,
    })
    .limit(5);

  const moodAnalytics = await getMoodAnalytics(userId);

  const daysTogether = getDaysTogether(couple);

  // Couple-level health (identical for both partners). Computed here so the
  // dashboard card shows the shared score immediately, without waiting on the
  // separate AI endpoint. Never let a health failure break the dashboard.
  // Couple health — read the CACHED value (identical for both partners). Reads
  // never recompute (that caused divergent scores); writes keep the cache fresh.
  let health = null;
  try {
    const { score, level } = await getCachedHealth(couple._id);
    health = { score, level };
  } catch (e) {
    console.error("[dashboard] health read failed:", e.message);
  }

  // Shared engagement (streak + XP + level) — same for both partners. Included
  // here so the dashboard StreakCard / LoveMeter render from one fetch. Never
  // let an engagement failure break the dashboard.
  let engagement = null;
  try {
    const { summary, todayUsers, partnerIds } = await getEngagementSummary(couple._id);
    const partnerId = partnerIds.find((id) => id !== String(userId)) || null;
    engagement = {
      ...summary,
      youActiveToday: todayUsers.includes(String(userId)),
      partnerActiveToday: partnerId ? todayUsers.includes(partnerId) : false,
    };
  } catch (e) {
    console.error("[dashboard] engagement load failed:", e.message);
  }

  // Single couple-level Love Meter value (same everywhere).
  const loveMeter = computeLoveMeter(health?.score ?? null, engagement?.currentStreak ?? 0);

  return {
    partner,

    relationship: {
      status: couple.relationshipStatus,

      daysTogether,

      startDate: getRelationshipStart(couple),
    },

    health,

    engagement,

    loveMeter,

    moodAnalytics,

    recentMoods,

    recentHistories,
  };
};

module.exports = {
  getDashboardData,
};
