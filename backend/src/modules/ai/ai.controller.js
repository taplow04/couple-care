const asyncHandler = require("../../utils/asyncHandler");

const {
  generateWeeklySummary,
  generateHealthScore,
  generateMoodAnalysis,
  generateMemoryRecap,
  generateRelationshipInsights,
} = require("./ai.service");

const weeklySummary = asyncHandler(async (req, res) => {
  const summary = await generateWeeklySummary(req.user._id);

  res.json({
    success: true,
    data: { summary },
  });
});

const healthScore = asyncHandler(async (req, res) => {
  const data = await generateHealthScore(req.user._id);

  res.json({
    success: true,
    data,
  });
});

const moodAnalysis = asyncHandler(async (req, res) => {
  const analysis = await generateMoodAnalysis(req.user._id);

  res.json({
    success: true,
    data: { analysis },
  });
});

const memoryRecap = asyncHandler(async (req, res) => {
  const recap = await generateMemoryRecap(req.user._id);

  res.json({
    success: true,
    data: { recap },
  });
});

const relationshipInsights = asyncHandler(async (req, res) => {
  const insights = await generateRelationshipInsights(req.user._id);

  res.json({
    success: true,
    data: { insights },
  });
});

module.exports = {
  weeklySummary,
  healthScore,
  moodAnalysis,
  memoryRecap,
  relationshipInsights,
};
