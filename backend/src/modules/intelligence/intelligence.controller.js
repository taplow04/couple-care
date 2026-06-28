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

// Expose the active configuration (weights/thresholds) so the scoring is fully
// transparent + traceable — "every score reproducible and traceable".
const config = asyncHandler(async (req, res) => {
  const cfg = intelligence.getConfig();
  ok(res, { weights: cfg.weights, thresholds: cfg.thresholds });
});

module.exports = { health, trust, growth, config };
