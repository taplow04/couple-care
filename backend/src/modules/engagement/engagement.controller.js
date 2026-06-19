const asyncHandler = require("../../utils/asyncHandler");

const {
  getEngagementForUser,
  getAchievementsForUser,
} = require("./engagement.service");

const getEngagement = asyncHandler(async (req, res) => {
  const data = await getEngagementForUser(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});

const getAchievements = asyncHandler(async (req, res) => {
  const data = await getAchievementsForUser(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getEngagement,
  getAchievements,
};
