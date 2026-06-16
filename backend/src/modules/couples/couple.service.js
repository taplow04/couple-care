const Couple = require("./couple.model");
const User = require("../users/user.model");
const generatePairCode = require("../../utils/pairCode");
const { getDaysTogether, getRelationshipStart } = require("./couple.helpers");

const createCouple = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.currentCoupleId) {
    throw new Error("Already in a relationship");
  }

  let pairCode;
  let existingCouple;

  do {
    pairCode = generatePairCode();
    existingCouple = await Couple.findOne({ pairCode });
  } while (existingCouple);

  const couple = await Couple.create({
    partnerOneId: userId,

    pairCode,
  });

  user.currentCoupleId = couple._id;

  await user.save();

  return couple;
};

const joinCouple = async (userId, pairCode) => {
  // Normalize so case / stray whitespace never causes a false "invalid code".
  // Generated codes are always uppercase with a "CC-" prefix.
  const code = String(pairCode || "").trim().toUpperCase();

  if (!code) {
    throw new Error("Pair code is required");
  }

  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.currentCoupleId) {
    throw new Error("Already in a relationship");
  }

  const couple = await Couple.findOne({
    pairCode: code,
  });

  if (!couple) {
    throw new Error("Invalid pair code");
  }

  if (couple.partnerTwoId) {
    throw new Error("Pair code already used");
  }

  if (couple.partnerOneId.toString() === userId.toString()) {
    throw new Error("Cannot pair with yourself");
  }

  couple.partnerTwoId = userId;

  await couple.save();

  user.currentCoupleId = couple._id;

  await user.save();

  return couple;
};
const getDashboard = async (userId) => {
  const user = await User.findById(userId);

  if (!user.currentCoupleId) {
    throw new Error("No active relationship");
  }

  const couple = await Couple.findById(user.currentCoupleId)
    .populate("partnerOneId", "name email profilePhoto")
    .populate("partnerTwoId", "name email profilePhoto");

  let partner;

  if (couple.partnerOneId._id.toString() === userId.toString()) {
    partner = couple.partnerTwoId;
  } else {
    partner = couple.partnerOneId;
  }

  const daysTogether = getDaysTogether(couple);

  return {
    partner,

    relationshipStatus: couple.relationshipStatus,

    daysTogether,

    relationshipStartDate: getRelationshipStart(couple),
  };
};

/**
 * Set/update the real dating start date for the caller's couple. Either
 * partner may set it; used by the onboarding prompt and (later) the profile
 * panel. Rejects future dates.
 */
const setRelationshipStartDate = async (userId, startDate) => {
  const user = await User.findById(userId);

  if (!user || !user.currentCoupleId) {
    throw new Error("No active relationship");
  }

  const parsed = new Date(startDate);

  if (isNaN(parsed.getTime())) {
    const err = new Error("Invalid date");
    err.statusCode = 400;
    throw err;
  }

  if (parsed.getTime() > Date.now()) {
    const err = new Error("Start date cannot be in the future");
    err.statusCode = 400;
    throw err;
  }

  const couple = await Couple.findByIdAndUpdate(
    user.currentCoupleId,
    { relationshipStartDate: parsed },
    { new: true },
  );

  return couple;
};

const getMyCouple = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.currentCoupleId) return null;

  const couple = await Couple.findById(user.currentCoupleId)
    .populate("partnerOneId", "name profilePhoto")
    .populate("partnerTwoId", "name profilePhoto");

  return couple;
};

module.exports = {
  createCouple,
  joinCouple,
  getDashboard,
  getMyCouple,
  setRelationshipStartDate,
};
