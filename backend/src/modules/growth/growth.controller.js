const asyncHandler = require("../../utils/asyncHandler");
const service = require("./growth.service");
const { getDailyTip } = require("./growth.ai");

const ok = (res, data, status = 200) =>
  res.status(status).json({ success: true, data });

const summary = asyncHandler(async (req, res) => {
  ok(res, await service.getGrowthSummary(req.user._id));
});

const dailyTip = asyncHandler(async (req, res) => {
  ok(res, await getDailyTip(req.user._id));
});

// ── Journal / reflection / gratitude ──
const listJournal = asyncHandler(async (req, res) => {
  ok(res, await service.listJournal(req.user._id, req.query.type));
});

const todayEntry = asyncHandler(async (req, res) => {
  ok(res, await service.getTodayEntry(req.user._id, req.params.type));
});

const addJournal = asyncHandler(async (req, res) => {
  ok(res, await service.addJournal(req.user._id, req.body), 201);
});

const deleteJournal = asyncHandler(async (req, res) => {
  await service.deleteJournal(req.user._id, req.params.id);
  ok(res, { deleted: true });
});

// ── Daily challenge ──
const todayChallenge = asyncHandler(async (req, res) => {
  ok(res, await service.getTodayChallenge(req.user._id));
});

const completeChallenge = asyncHandler(async (req, res) => {
  ok(res, await service.completeChallenge(req.user._id));
});

// ── Quizzes ──
const quizzes = asyncHandler(async (req, res) => {
  ok(res, service.getQuizzes());
});

const readiness = asyncHandler(async (req, res) => {
  ok(res, await service.submitReadiness(req.user._id, req.body?.answers));
});

const loveLanguage = asyncHandler(async (req, res) => {
  ok(res, await service.submitLoveLanguage(req.user._id, req.body?.answers));
});

const attachment = asyncHandler(async (req, res) => {
  ok(res, await service.submitAttachment(req.user._id, req.body?.answers));
});

const moodSummary = asyncHandler(async (req, res) => {
  ok(res, await service.getMoodSummary(req.user._id));
});

module.exports = {
  summary,
  dailyTip,
  listJournal,
  todayEntry,
  addJournal,
  deleteJournal,
  todayChallenge,
  completeChallenge,
  quizzes,
  readiness,
  loveLanguage,
  attachment,
  moodSummary,
};
