const asyncHandler = require("../../utils/asyncHandler");
const service = require("./dailyMoment.service");

const today = asyncHandler(async (req, res) => {
  const data = await service.getToday(req.user._id);
  res.status(200).json({ success: true, data });
});

const timeline = asyncHandler(async (req, res) => {
  const data = await service.getTimeline(req.user._id, {
    limit: req.query.limit,
    before: req.query.before,
  });
  res.status(200).json({ success: true, data });
});

const byDay = asyncHandler(async (req, res) => {
  const data = await service.getByDay(req.user._id, req.params.day);
  res.status(200).json({ success: true, data });
});

const byId = asyncHandler(async (req, res) => {
  const data = await service.getById(req.user._id, req.params.id);
  res.status(200).json({ success: true, data });
});

const monthlyReplay = asyncHandler(async (req, res) => {
  const now = new Date();
  const year = Number(req.query.year) || now.getUTCFullYear();
  const month = Number(req.query.month) || now.getUTCMonth() + 1;
  const data = await service.getMonthlyReplay(req.user._id, year, month);
  res.status(200).json({ success: true, data });
});

const yearlyReplay = asyncHandler(async (req, res) => {
  const year = Number(req.query.year) || new Date().getUTCFullYear();
  const data = await service.getYearlyReplay(req.user._id, year);
  res.status(200).json({ success: true, data });
});

module.exports = { today, timeline, byDay, byId, monthlyReplay, yearlyReplay };
