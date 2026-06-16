const asyncHandler = require("../../utils/asyncHandler");
const callService = require("./call.service");

/**
 * GET /api/v1/calls/history
 * Returns recent call history for the authenticated user's active couple.
 */
const getHistory = asyncHandler(async (req, res) => {
  if (!req.user.currentCoupleId) {
    const err = new Error("No active relationship");
    err.statusCode = 400;
    throw err;
  }

  const history = await callService.getHistoryForCouple(
    req.user.currentCoupleId,
  );

  res.status(200).json({ success: true, data: history });
});

module.exports = { getHistory };
