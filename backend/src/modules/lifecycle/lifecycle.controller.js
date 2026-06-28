const asyncHandler = require("../../utils/asyncHandler");
const service = require("./lifecycle.service");

const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

const summary = asyncHandler(async (req, res) => {
  ok(res, await service.getSummary(req.user._id));
});

const journey = asyncHandler(async (req, res) => {
  ok(res, await service.getJourney(req.user._id));
});

const reportQuestions = asyncHandler(async (req, res) => {
  ok(res, { questions: service.getReportQuestions() });
});

const createReport = asyncHandler(async (req, res) => {
  ok(res, await service.createGrowthReport(req.user._id, req.body?.answers), 201);
});

const getReport = asyncHandler(async (req, res) => {
  ok(res, await service.getLatestGrowthReport(req.user._id));
});

module.exports = { summary, journey, reportQuestions, createReport, getReport };
