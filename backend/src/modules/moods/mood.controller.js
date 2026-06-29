const asyncHandler = require("../../utils/asyncHandler");

const {
  createMood,
  getMyMoods,
  deleteMood,
  getPartnerMoods,
  getMoodAnalytics,
} = require("./mood.service");

const aiMoodService = require("./aiMood.service");

const create = asyncHandler(async (req, res) => {
  const mood = await createMood(req.user._id, req.body);

  res.status(201).json({
    success: true,
    data: mood,
  });
});

const getMine = asyncHandler(async (req, res) => {
  const moods = await getMyMoods(req.user._id);

  res.status(200).json({
    success: true,
    data: moods,
  });
});

const remove = asyncHandler(async (req, res) => {
  await deleteMood(req.user._id, req.params.id);

  res.status(200).json({
    success: true,
    message: "Mood deleted",
  });
});

const getPartner = asyncHandler(async (req, res) => {
  const moods = await getPartnerMoods(req.user._id);

  res.status(200).json({
    success: true,
    data: moods,
  });
});

const analytics = asyncHandler(async (req, res) => {
  const data = await getMoodAnalytics(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});

// ── AI Current Mood (the estimated emotional state — third mood concept) ──
const aiMood = asyncHandler(async (req, res) => {
  const data = await aiMoodService.getAiMood(req.user._id);
  res.status(200).json({ success: true, data });
});

const partnerAiMood = asyncHandler(async (req, res) => {
  const data = await aiMoodService.getPartnerAiMood(req.user._id);
  res.status(200).json({ success: true, data });
});

module.exports = {
  create,
  getMine,
  remove,
  getPartner,
  analytics,
  aiMood,
  partnerAiMood,
};
