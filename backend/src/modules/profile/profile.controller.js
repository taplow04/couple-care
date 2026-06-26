const asyncHandler = require("../../utils/asyncHandler");
const service = require("./profile.service");

const me = asyncHandler(async (req, res) => {
  const data = await service.getPersonalProfile(req.user._id);
  res.status(200).json({ success: true, data });
});

const partner = asyncHandler(async (req, res) => {
  const data = await service.getPartnerProfile(req.user._id);
  res.status(200).json({ success: true, data });
});

const journey = asyncHandler(async (req, res) => {
  const data = await service.getJourney(req.user._id);
  res.status(200).json({ success: true, data });
});

const relationship = asyncHandler(async (req, res) => {
  const data = await service.getRelationshipProfile(req.user._id);
  res.status(200).json({ success: true, data });
});

const trust = asyncHandler(async (req, res) => {
  const data = await service.getTrustCenter(req.user._id);
  res.status(200).json({ success: true, data });
});

const passport = asyncHandler(async (req, res) => {
  const data = await service.getPassport(req.user._id);
  res.status(200).json({ success: true, data });
});

module.exports = { me, partner, journey, relationship, trust, passport };
