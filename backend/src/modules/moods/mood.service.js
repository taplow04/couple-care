const Mood = require("./mood.model");
const User = require("../users/user.model");
const Couple = require("../couples/couple.model");

const createMood = async (userId, data) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (!user.currentCoupleId) {
    throw new Error("Must be in a relationship to log mood");
  }

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const count = await Mood.countDocuments({
    userId,
    createdAt: {
      $gte: todayStart,
    },
  });

  if (count >= 3) {
    throw new Error("Daily mood limit reached");
  }

  const mood = await Mood.create({
    ...data,
    userId,
    coupleId: user.currentCoupleId,
  });

  return mood;
};

const getMyMoods = async (userId) => {
  return await Mood.find({ userId }).sort({ createdAt: -1 });
};

const deleteMood = async (userId, moodId) => {
  const mood = await Mood.findById(moodId);

  if (!mood) {
    throw new Error("Mood not found");
  }

  if (mood.userId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  await mood.deleteOne();

  return true;
};

const getPartnerMoods = async (userId) => {
  const user = await User.findById(userId);

  if (!user.currentCoupleId) {
    throw new Error("No active relationship");
  }

  const couple = await Couple.findById(user.currentCoupleId);

  let partnerId;

  if (couple.partnerOneId.toString() === userId.toString()) {
    partnerId = couple.partnerTwoId;
  } else {
    partnerId = couple.partnerOneId;
  }

  return await Mood.find({
    userId: partnerId,
    visibility: "partner_only",
  }).sort({
    createdAt: -1,
  });
};

const getMoodAnalytics = async (userId) => {
  const moods = await Mood.find({ userId });

  const analytics = {
    happy: 0,
    sad: 0,
    angry: 0,
    stressed: 0,
    loved: 0,
    excited: 0,
    anxious: 0,
    averageIntensity: 0,
  };

  let totalIntensity = 0;

  moods.forEach((mood) => {
    analytics[mood.moodType]++;
    totalIntensity += mood.intensity;
  });

  analytics.averageIntensity =
    moods.length > 0 ? Number((totalIntensity / moods.length).toFixed(2)) : 0;

  return analytics;
};

module.exports = {
  createMood,
  getMyMoods,
  deleteMood,
  getPartnerMoods,
  getMoodAnalytics,
};
