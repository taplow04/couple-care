const Couple = require("./couple.model");
const User = require("../users/user.model");
const generatePairCode = require("../../utils/pairCode");

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
  const user = await User.findById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  if (user.currentCoupleId) {
    throw new Error("Already in a relationship");
  }

  const couple = await Couple.findOne({
    pairCode,
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

  const daysTogether = Math.floor(
    (Date.now() - new Date(couple.relationshipStartedAt)) /
      (1000 * 60 * 60 * 24),
  );

  return {
    partner,

    relationshipStatus: couple.relationshipStatus,

    daysTogether,
  };
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
};
