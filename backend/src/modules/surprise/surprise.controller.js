const asyncHandler = require("../../utils/asyncHandler");

const { getToday, openToday } = require("./surprise.service");

const today = asyncHandler(async (req, res) => {
  const data = await getToday(req.user._id);
  res.status(200).json({ success: true, data });
});

const open = asyncHandler(async (req, res) => {
  const data = await openToday(req.user._id);
  res.status(200).json({ success: true, data });
});

module.exports = { today, open };
