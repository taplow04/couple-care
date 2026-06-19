const User = require("../users/user.model");
const Couple = require("../couples/couple.model");
const Mood = require("../moods/mood.model");
const { getMoodAnalytics } = require("../moods/mood.service");
const History = require("../histories/history.model");
const { getDaysTogether, getRelationshipStart } = require("../couples/couple.helpers");
const { computeCoupleHealth } = require("../couples/health.service");
const {
  getOrCreateEngagement,
  buildSummary,
} = require("../engagement/engagement.service");

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
  let health = null;
  try {
    const { score, level } = await computeCoupleHealth(couple._id);
    health = { score, level };
  } catch (e) {
    console.error("[dashboard] health compute failed:", e.message);
  }

  // Shared engagement (streak + XP + level) — same for both partners. Included
  // here so the dashboard StreakCard / LoveMeter render from one fetch. Never
  // let an engagement failure break the dashboard.
  let engagement = null;
  try {
    const eng = await getOrCreateEngagement(couple._id);
    engagement = buildSummary(eng);
  } catch (e) {
    console.error("[dashboard] engagement load failed:", e.message);
  }

  return {
    partner,

    relationship: {
      status: couple.relationshipStatus,

      daysTogether,

      startDate: getRelationshipStart(couple),
    },

    health,

    engagement,

    moodAnalytics,

    recentMoods,

    recentHistories,
  };
};

module.exports = {
  getDashboardData,
};
