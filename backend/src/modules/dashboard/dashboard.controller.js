const asyncHandler = require("../../utils/asyncHandler");

const { getDashboardData } = require("./dashboard.service");

const getDashboard = asyncHandler(async (req, res) => {
  const data = await getDashboardData(req.user._id);

  res.status(200).json({
    success: true,
    data,
  });
});

module.exports = {
  getDashboard,
};
