const Mood = require("./mood.model");
const User = require("../users/user.model");
const Couple = require("../couples/couple.model");
const { getPartnerId } = require("../chat/chat.helpers");
const { createNotification } = require("../notifications/notification.service");

// Negative moods that should proactively alert the partner so they can offer
// support. Maps mood type -> the phrase used in the notification copy.
const SUPPORT_MOODS = {
  sad: "feeling sad",
  stressed: "feeling stressed",
  angry: "feeling angry",
  anxious: "feeling anxious",
};

// Fire-and-forget: never let a notification failure break mood logging.
const maybeAlertPartner = async (userId, mood) => {
  const phrase = SUPPORT_MOODS[mood.moodType];
  // Respect privacy — a mood the user marked private must not alert anyone.
  if (!phrase || mood.visibility === "private") return;

  try {
    const partnerId = await getPartnerId(userId);
    if (!partnerId) return;

    await createNotification({
      userId: partnerId,
      title: "Your partner needs you 💗",
      message: `Your partner is ${phrase} today ❤️ They may need some support.`,
      type: "partner_mood_alert",
      metadata: { moodId: mood._id, moodType: mood.moodType },
    });
  } catch (e) {
    console.error("partner mood alert error:", e.message);
  }
};

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

  // Proactively alert the partner on negative moods (non-blocking).
  await maybeAlertPartner(userId, mood);

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

  if (!partnerId) return [];

  // Respect the partner's global mood-visibility privacy setting.
  const partner = await User.findById(partnerId).select("privacy");
  if (partner?.privacy?.moodVisibility === "private") {
    return [];
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
