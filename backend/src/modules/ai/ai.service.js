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
const { getDaysTogether } = require("../couples/couple.helpers");
const { getCoupleHealthForUser } = require("../couples/health.service");

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
    daysTogether: getDaysTogether(data.couple),
  });

  return await generateAIResponse(prompt);
};

// Relationship Health is a COUPLE metric — identical for both partners. The
// real computation lives in couples/health.service (deterministic, couple-wide).
// This delegates so the AI endpoint returns the same score as the dashboard.
const generateHealthScore = async (userId) => {
  return await getCoupleHealthForUser(userId);
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
