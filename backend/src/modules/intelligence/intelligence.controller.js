/**
 * Intelligence API (READ-ONLY) — exposes the CCIE engine outputs (score +
 * confidence + factors + reasons + trend) for any consumer. API only, no UI.
 * Couple engines resolve the caller's couple; everything is identical for both
 * partners.
 */
const asyncHandler = require("../../utils/asyncHandler");
const User = require("../users/user.model");
const intelligence = require("../../intelligence");

const requireCouple = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user || !user.currentCoupleId) {
    const e = new Error("No active relationship");
    e.statusCode = 400;
    throw e;
  }
  return user.currentCoupleId;
};

const ok = (res, data) => res.status(200).json({ success: true, data });

const health = asyncHandler(async (req, res) => {
  ok(res, await intelligence.getHealth(await requireCouple(req.user._id)));
});

const trust = asyncHandler(async (req, res) => {
  ok(res, await intelligence.getTrust(await requireCouple(req.user._id)));
});

const growth = asyncHandler(async (req, res) => {
  ok(res, await intelligence.getGrowth(await requireCouple(req.user._id)));
});

// Emotion is per-USER (no couple required — works in every lifecycle stage).
const emotion = asyncHandler(async (req, res) => {
  ok(res, await intelligence.getEmotion(req.user._id));
});

// Maturity + Healing are per-USER (no couple required — work in every stage).
const maturity = asyncHandler(async (req, res) => {
  ok(res, await intelligence.getMaturity(req.user._id));
});

const healing = asyncHandler(async (req, res) => {
  ok(res, await intelligence.getHealing(req.user._id));
});

// Behaviour Intelligence is a COUPLE engine (identical for both partners).
const behavior = asyncHandler(async (req, res) => {
  ok(res, await intelligence.getBehavior(await requireCouple(req.user._id)));
});

// Relationship Pulse is a COUPLE engine (identical for both partners).
const pulse = asyncHandler(async (req, res) => {
  ok(res, await intelligence.getPulse(await requireCouple(req.user._id)));
});

// Change Detection is a COUPLE read — hedged observations vs the couple's own
// baseline (identical for both partners).
const changes = asyncHandler(async (req, res) => {
  ok(res, await intelligence.getChangeObservations(await requireCouple(req.user._id)));
});

// Personality Timeline is per-USER (couple series are attached when paired).
const personalityTimeline = asyncHandler(async (req, res) => {
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 7), 365);
  const user = await User.findById(req.user._id).select("currentCoupleId");
  ok(res, await intelligence.getPersonalityTimeline(req.user._id, user?.currentCoupleId || null, days));
});

// Self-history series for trend charts. Couple engines resolve the couple as
// the subject; user engines use the caller — nobody can read another subject.
const USER_ENGINES = new Set(["emotion", "maturity", "healing"]);
const COUPLE_ENGINES = new Set(["relationshipHealth", "trust", "growth", "behavior", "pulse"]);

const history = asyncHandler(async (req, res) => {
  const { engine } = req.params;
  const days = Math.min(Math.max(parseInt(req.query.days, 10) || 30, 1), 365);
  let subjectId;
  if (USER_ENGINES.has(engine)) subjectId = req.user._id;
  else if (COUPLE_ENGINES.has(engine)) subjectId = await requireCouple(req.user._id);
  else {
    const e = new Error("Unknown engine");
    e.statusCode = 400;
    throw e;
  }
  ok(res, { engine, series: await intelligence.getHistorySeries(subjectId, engine, days) });
});

const ALLOWED_PERIODS = ["daily", "weekly", "monthly", "yearly"];
const memory = asyncHandler(async (req, res) => {
  const period = ALLOWED_PERIODS.includes(req.params.period) ? req.params.period : "weekly";
  ok(res, await intelligence.getMemory(await requireCouple(req.user._id), period));
});

// Expose the active configuration (weights/thresholds) so the scoring is fully
// transparent + traceable — "every score reproducible and traceable".
const config = asyncHandler(async (req, res) => {
  const cfg = intelligence.getConfig();
  ok(res, { weights: cfg.weights, thresholds: cfg.thresholds });
});

module.exports = {
  health,
  trust,
  growth,
  emotion,
  memory,
  config,
  maturity,
  behavior,
  healing,
  history,
  pulse,
  changes,
  personalityTimeline,
};
