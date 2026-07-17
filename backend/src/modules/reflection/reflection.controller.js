const asyncHandler = require("../../utils/asyncHandler");
const reflectionService = require("./reflection.service");

// POST /reflection — create or update TODAY's reflection (idempotent).
const saveToday = asyncHandler(async (req, res) => {
  const reflection = await reflectionService.saveToday(req.user._id, req.body);
  res.status(200).json({ success: true, data: reflection });
});

// GET /reflection/today
const getToday = asyncHandler(async (req, res) => {
  const reflection = await reflectionService.getToday(req.user._id);
  res.status(200).json({ success: true, data: reflection });
});

// GET /reflection?days=30
const getHistory = asyncHandler(async (req, res) => {
  const history = await reflectionService.getHistory(req.user._id, req.query.days);
  res.status(200).json({ success: true, data: history });
});

// GET /reflection/report/:period — weekly | monthly
const getReport = asyncHandler(async (req, res) => {
  const period = req.params.period === "monthly" ? "monthly" : "weekly";
  const report = await reflectionService.getReport(req.user._id, period);
  res.status(200).json({ success: true, data: report });
});

module.exports = { saveToday, getToday, getHistory, getReport };
