const Call = require("./call.model");

/**
 * Persistence helpers for call history. These are intentionally tolerant:
 * a failure to write history must NEVER break the live signaling flow, so
 * callers wrap them and swallow errors.
 */

const createCall = async ({
  coupleId,
  callerId,
  receiverId,
  callType,
}) => {
  return Call.create({
    coupleId,
    callerId,
    receiverId,
    callType,
    status: "ringing",
    startedAt: new Date(),
  });
};

const markAnswered = async (callId) => {
  return Call.findByIdAndUpdate(
    callId,
    { answeredAt: new Date() },
    { new: true },
  );
};

/**
 * Close out a call. Computes duration from answeredAt when the call was
 * actually connected; otherwise leaves duration at 0.
 */
const finalizeCall = async (callId, status) => {
  const call = await Call.findById(callId);

  if (!call) {
    return null;
  }

  // Don't overwrite a call that's already been finalized.
  if (call.status !== "ringing") {
    return call;
  }

  const endedAt = new Date();
  let duration = 0;

  if (call.answeredAt) {
    duration = Math.max(
      0,
      Math.round((endedAt.getTime() - call.answeredAt.getTime()) / 1000),
    );
  }

  call.status = status;
  call.endedAt = endedAt;
  call.duration = duration;

  await call.save();

  return call;
};

const getHistoryForCouple = async (coupleId, limit = 50) => {
  return Call.find({ coupleId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate("callerId", "name profilePhoto")
    .populate("receiverId", "name profilePhoto")
    .lean();
};

module.exports = {
  createCall,
  markAnswered,
  finalizeCall,
  getHistoryForCouple,
};
