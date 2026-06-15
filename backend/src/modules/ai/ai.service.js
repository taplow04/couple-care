const User = require("../users/user.model");
const Couple = require("../couples/couple.model");
const Mood = require("../moods/mood.model");
const History = require("../histories/history.model");
const Memory = require("../memories/memory.model");
const Message = require("../chat/message.model");

const {
  buildWeeklySummaryPrompt,
  buildMoodAnalysisPrompt,
  buildMemoryRecapPrompt,
  buildRelationshipInsightsPrompt,
} = require("./ai.prompts");

const { generateAIResponse } = require("./ai.engine");

const getUserData = async (userId) => {
  const user = await User.findById(userId);

  if (!user.currentCoupleId) {
    throw new Error("No active relationship");
  }

  const couple = await Couple.findById(user.currentCoupleId);

  const moods = await Mood.find({
    userId,
  })
    .sort({ createdAt: -1 })
    .limit(30);

  const histories = await History.find({
    userId,
  });

  const memories = await Memory.find({
    coupleId: user.currentCoupleId,
  })
    .sort({ memoryDate: -1 })
    .limit(30);

  const messages = await Message.countDocuments({
    coupleId: user.currentCoupleId,
  });

  return {
    user,
    couple,
    moods,
    histories,
    memories,
    messages,
  };
};

const generateWeeklySummary = async (userId) => {
  const data = await getUserData(userId);

  const prompt = buildWeeklySummaryPrompt({
    moods: data.moods,
    memories: data.memories,
    histories: data.histories,
    relationshipStatus: data.couple.relationshipStatus,
    daysTogether: Math.floor(
      (Date.now() - new Date(data.couple.relationshipStartedAt)) /
        (1000 * 60 * 60 * 24),
    ),
  });

  return await generateAIResponse(prompt);
};

const generateHealthScore = async (userId) => {
  const data = await getUserData(userId);

  let score = 50;

  data.moods.forEach((mood) => {
    if (["happy", "loved", "excited"].includes(mood.moodType)) {
      score += 2;
    }

    if (["sad", "angry", "stressed", "anxious"].includes(mood.moodType)) {
      score -= 2;
    }
  });

  score += Math.min(data.memories.length, 20);

  score += Math.min(Math.floor(data.messages / 20), 20);

  score = Math.max(0, Math.min(score, 100));

  let level = "Needs Attention";

  if (score >= 90) level = "Excellent";
  else if (score >= 75) level = "Healthy";
  else if (score >= 50) level = "Moderate";

  return {
    score,
    level,
  };
};

const generateMoodAnalysis = async (userId) => {
  const data = await getUserData(userId);

  const prompt = buildMoodAnalysisPrompt({
    moods: data.moods,
  });

  return await generateAIResponse(prompt);
};

const generateMemoryRecap = async (userId) => {
  const data = await getUserData(userId);

  const prompt = buildMemoryRecapPrompt({
    memories: data.memories,
  });

  return await generateAIResponse(prompt);
};

const generateRelationshipInsights = async (userId) => {
  const data = await getUserData(userId);

  const health = await generateHealthScore(userId);

  const prompt = buildRelationshipInsightsPrompt({
    moods: data.moods,
    memories: data.memories,
    histories: data.histories,
    healthScore: health.score,
  });

  return await generateAIResponse(prompt);
};

module.exports = {
  generateWeeklySummary,
  generateHealthScore,
  generateMoodAnalysis,
  generateMemoryRecap,
  generateRelationshipInsights,
};
