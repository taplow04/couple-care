const Couple = require("./couple.model");
const User = require("../users/user.model");
const generatePairCode = require("../../utils/pairCode");
const { getDaysTogether, getRelationshipStart } = require("./couple.helpers");
const Mood = require("../moods/mood.model");
const Memory = require("../memories/memory.model");
const Message = require("../chat/message.model");
const { getMoodAnalytics } = require("../moods/mood.service");
const { emitToUser } = require("../../utils/realtime");

// Resolve the partner id for a loaded couple + the requesting user.
const resolvePartnerId = (couple, userId) =>
  couple.partnerOneId.toString() === userId.toString()
    ? couple.partnerTwoId
    : couple.partnerOneId;

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
/**
 * Cancel a still-pending (un-joined) couple the user created. Lets a user back
 * out of the "Create" flow and switch to "Join" without being stuck as
 * "Already in a relationship". Refuses once a partner has joined (use unmatch
 * for an active couple). Idempotent: a no-op if the user has no couple.
 */
const cancelPendingCouple = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.currentCoupleId) {
    return { success: true, cancelled: false };
  }

  const couple = await Couple.findById(user.currentCoupleId);

  // Nothing to cancel (already gone) — just detach the user.
  if (!couple) {
    user.currentCoupleId = null;
    await user.save();
    return { success: true, cancelled: false };
  }

  // A real partner joined — this is an active couple, not a pending one.
  if (couple.partnerTwoId) {
    throw new Error("Couple already active");
  }

  // Only the creator can cancel their own pending couple.
  if (couple.partnerOneId.toString() !== userId.toString()) {
    throw new Error("Not allowed");
  }

  await Couple.deleteOne({ _id: couple._id });
  user.currentCoupleId = null;
  await user.save();

  return { success: true, cancelled: true };
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

/**
 * Rich partner profile for the Partner Profile Panel: profile fields,
 * relationship dates, and aggregate stats. Honors the partner's privacy
 * settings (profileVisibility / moodVisibility).
 */
const getPartnerProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.currentCoupleId) {
    throw new Error("No active relationship");
  }

  const couple = await Couple.findById(user.currentCoupleId);
  if (!couple) {
    throw new Error("Couple not found");
  }

  const partnerId = resolvePartnerId(couple, userId);
  if (!partnerId) {
    throw new Error("Partner has not joined yet");
  }

  const partner = await User.findById(partnerId).select(
    "name profilePhoto bio hobbies likes dislikes birthday privacy createdAt",
  );
  if (!partner) {
    throw new Error("Partner not found");
  }

  const profilePrivate = partner.privacy?.profileVisibility === "private";
  const moodPrivate = partner.privacy?.moodVisibility === "private";
  const activityPrivate = partner.privacy?.activityVisibility === "private";

  // Aggregate stats (cheap counts + reused analytics).
  const [memoryCount, chatMessageCount] = await Promise.all([
    Memory.countDocuments({ coupleId: couple._id }),
    Message.countDocuments({ coupleId: couple._id }),
  ]);

  let moodSummary = null;
  let recentMoods = [];
  if (!moodPrivate) {
    const analytics = await getMoodAnalytics(partnerId);
    const counts = { ...analytics };
    delete counts.averageIntensity;
    const dominant =
      Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[1] > 0
        ? Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0]
        : null;
    moodSummary = {
      dominant,
      averageIntensity: analytics.averageIntensity,
      counts,
    };
    // Recent activity is additionally gated by the activity-visibility setting.
    if (!activityPrivate) {
      recentMoods = await Mood.find({
        userId: partnerId,
        visibility: "partner_only",
      })
        .sort({ createdAt: -1 })
        .limit(5);
    }
  }

  // Public-safe profile (respects profileVisibility).
  const profile = profilePrivate
    ? {
        _id: partner._id,
        name: partner.name,
        profilePhoto: partner.profilePhoto,
        restricted: true,
      }
    : {
        _id: partner._id,
        name: partner.name,
        profilePhoto: partner.profilePhoto,
        bio: partner.bio,
        hobbies: partner.hobbies,
        likes: partner.likes,
        dislikes: partner.dislikes,
        birthday: partner.birthday,
        restricted: false,
      };

  return {
    partner: profile,
    relationship: {
      status: couple.relationshipStatus,
      startDate: getRelationshipStart(couple),
      daysTogether: getDaysTogether(couple),
    },
    stats: {
      memoryCount,
      chatMessageCount,
      moodSummary,
      recentMoods,
    },
  };
};

/**
 * Soft unmatch: mark the relationship broken and detach both users (so the app
 * gates them back to onboarding) WITHOUT deleting any shared data
 * (moods/memories/chat/calls are retained). Notifies the partner in realtime.
 */
const unmatchPartner = async (userId) => {
  const user = await User.findById(userId);
  if (!user || !user.currentCoupleId) {
    throw new Error("No active relationship");
  }

  const couple = await Couple.findById(user.currentCoupleId);
  if (!couple) {
    throw new Error("Couple not found");
  }

  const partnerId = resolvePartnerId(couple, userId);

  couple.relationshipStatus = "broken_up";
  await couple.save();

  const ids = [couple.partnerOneId, couple.partnerTwoId].filter(Boolean);
  await User.updateMany({ _id: { $in: ids } }, { currentCoupleId: null });

  // Let the partner's app react immediately (gate back to onboarding).
  if (partnerId) {
    try {
      emitToUser(partnerId, "couple:unmatched", { coupleId: couple._id });
    } catch {
      /* offline */
    }
  }

  return { success: true };
};

module.exports = {
  createCouple,
  joinCouple,
  cancelPendingCouple,
  getDashboard,
  getMyCouple,
  setRelationshipStartDate,
  getPartnerProfile,
  unmatchPartner,
};
