const History = require("./history.model");
const User = require("../users/user.model");
const Couple = require("../couples/couple.model");

const createHistory = async (userId, data) => {
  const history = await History.create({
    ...data,

    userId,
  });

  return history;
};

const getMyHistories = async (userId) => {
  return await History.find({
    userId,
  }).sort({
    createdAt: -1,
  });
};

const updateHistory = async (userId, historyId, data) => {
  const history = await History.findById(historyId);

  if (!history) {
    throw new Error("History not found");
  }

  if (history.userId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  const allowedFields = [
    "relationshipTitle",
    "relationshipDurationMonths",
    "breakupReason",
    "lessonsLearned",
    "emotionalImpactScore",
    "visibility",
  ];

  allowedFields.forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(data, field)) {
      history[field] = data[field];
    }
  });

  await history.save();

  return history;
};

const deleteHistory = async (userId, historyId) => {
  const history = await History.findById(historyId);

  if (!history) {
    throw new Error("History not found");
  }

  if (history.userId.toString() !== userId.toString()) {
    throw new Error("Unauthorized");
  }

  await history.deleteOne();

  return true;
};

const getPartnerHistories = async (userId) => {
  const user = await User.findById(userId);

  if (!user.currentCoupleId) {
    throw new Error("No active relationship");
  }

  const couple = await Couple.findById(user.currentCoupleId);

  let partnerId;

  if (couple.partnerOneId.toString() === userId.toString()) {
    partnerId = couple.partnerTwoId;
  } else {
    partnerId = couple.partnerOneId;
  }

  return await History.find({
    userId: partnerId,

    visibility: "partner_only",
  });
};

module.exports = {
  createHistory,

  getMyHistories,

  updateHistory,

  deleteHistory,

  getPartnerHistories,
};
