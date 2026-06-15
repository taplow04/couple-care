const User = require("../users/user.model");

const Couple = require("../couples/couple.model");

const getCoupleByUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user || !user.currentCoupleId) {
    throw new Error("No active relationship");
  }

  const couple = await Couple.findById(user.currentCoupleId);

  if (!couple) {
    throw new Error("Couple not found");
  }

  return couple;
};

const getPartnerId = async (userId) => {
  const couple = await getCoupleByUser(userId);

  if (couple.partnerOneId.toString() === userId.toString()) {
    return couple.partnerTwoId;
  }

  return couple.partnerOneId;
};

const isCoupleMember = async (userId, coupleId) => {
  const couple = await Couple.findById(coupleId);

  if (!couple) {
    return false;
  }

  return (
    couple.partnerOneId.toString() === userId.toString() ||
    (couple.partnerTwoId &&
      couple.partnerTwoId.toString() === userId.toString())
  );
};

module.exports = {
  getPartnerId,
  getCoupleByUser,
  isCoupleMember,
};
