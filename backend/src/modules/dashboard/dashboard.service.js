const User = require("../users/user.model");
const Couple = require("../couples/couple.model");
const Mood = require("../moods/mood.model");
const { getMoodAnalytics } = require("../moods/mood.service");
const History = require("../histories/history.model");

const getDashboardData = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.currentCoupleId) {
    throw new Error("No active relationship");
  }

  const couple = await Couple.findById(user.currentCoupleId)
    .populate("partnerOneId", "name email profilePhoto")
    .populate("partnerTwoId", "name email profilePhoto");

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

  const daysTogether = Math.floor(
    (Date.now() - new Date(couple.relationshipStartedAt)) /
      (1000 * 60 * 60 * 24),
  );

  return {
    partner,

    relationship: {
      status: couple.relationshipStatus,

      daysTogether,
    },

    moodAnalytics,

    recentMoods,

    recentHistories,
  };
};

module.exports = {
  getDashboardData,
};
