const asyncHandler = require("../../utils/asyncHandler");

const {
  logSleep,
  getMySleep,
  getPartnerSleep,
  deleteSleep,
  getAnalysis,
} = require("./sleep.service");

const create = asyncHandler(async (req, res) => {
  const data = await logSleep(req.user._id, req.body);
  res.status(201).json({ success: true, data });
});

const mine = asyncHandler(async (req, res) => {
  const data = await getMySleep(req.user._id);
  res.status(200).json({ success: true, data });
});

const partner = asyncHandler(async (req, res) => {
  const data = await getPartnerSleep(req.user._id);
  res.status(200).json({ success: true, data });
});

const analysis = asyncHandler(async (req, res) => {
  const data = await getAnalysis(req.user._id);
  res.status(200).json({ success: true, data });
});

const remove = asyncHandler(async (req, res) => {
  await deleteSleep(req.user._id, req.params.id);
  res.status(200).json({ success: true, message: "Sleep log deleted" });
});

module.exports = { create, mine, partner, analysis, remove };
