const asyncHandler = require("../../utils/asyncHandler");
const interestService = require("./interest.service");
const { INTERESTS, INTEREST_KEYS, SIGNAL_WEIGHTS } = require("./interest.constants");

// GET /interests — the caller's Interest Profile (in-app signals only).
const getProfile = asyncHandler(async (req, res) => {
  const profile = await interestService.getProfile(req.user._id);
  res.status(200).json({ success: true, data: profile });
});

// GET /interests/meta — taxonomy for the UI.
const getMeta = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { interests: INTERESTS } });
});

// POST /interests/signal — { category } or { text }, optional { source }.
// Lets the frontend report lightweight in-app signals (page visits, searches,
// liked ideas). Sources are whitelisted so weights can't be forged upward.
const CLIENT_SOURCES = new Set(["page_visit", "search", "explore_filter"]);
const recordSignal = asyncHandler(async (req, res) => {
  const { category, text } = req.body || {};
  const source = CLIENT_SOURCES.has(req.body?.source) ? req.body.source : "page_visit";

  if (category && INTEREST_KEYS.includes(category)) {
    await interestService.recordSignal(req.user._id, category, source);
  } else if (typeof text === "string" && text.trim()) {
    await interestService.recordSignalFromText(req.user._id, text.slice(0, 120), source);
  }
  // Always succeed — signals are best-effort by design.
  res.status(200).json({ success: true, data: { recorded: true } });
});

module.exports = { getProfile, getMeta, recordSignal, SIGNAL_WEIGHTS };
