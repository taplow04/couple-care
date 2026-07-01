const crypto = require("crypto");

const Session = require("./session.model");

const newTokenId = () => crypto.randomBytes(24).toString("hex");

/**
 * Create a session row for a fresh login/registration and return its `tokenId`
 * (which the caller embeds as the JWT `sid`).
 *
 * @returns {{ session, tokenId, isNewDevice }}
 */
const createSession = async (userId, ctx = {}, { via = "login" } = {}) => {
  // "New device" = we've never seen this device signature for the user before
  // (across active OR revoked sessions). Drives the new-login security alert.
  const priorCount = await Session.countDocuments({
    userId,
    deviceType: ctx.deviceType || "unknown",
    browser: ctx.browser || "Unknown",
    os: ctx.os || "Unknown",
  });

  const tokenId = newTokenId();
  const session = await Session.create({
    userId,
    tokenId,
    device: ctx.device || "Unknown device",
    deviceType: ctx.deviceType || "unknown",
    browser: ctx.browser || "Unknown",
    os: ctx.os || "Unknown",
    userAgent: ctx.userAgent || "",
    ip: ctx.ip || "",
    ipMasked: ctx.ipMasked || "",
    location: ctx.location || "",
    lastActive: new Date(),
    createdVia: via,
  });

  return { session, tokenId, isNewDevice: priorCount === 0 };
};

// Look up an ACTIVE session by its token id (used by the auth middleware).
const getActiveSession = (tokenId) =>
  Session.findOne({ tokenId, revokedAt: null });

// Throttled "last active" touch — only writes if >60s stale, keeps writes cheap.
const touchSession = (session) => {
  const now = Date.now();
  const last = session.lastActive ? session.lastActive.getTime() : 0;
  if (now - last < 60 * 1000) return;
  Session.updateOne(
    { _id: session._id },
    { $set: { lastActive: new Date() } },
  ).catch(() => {});
};

// All active sessions for a user, current one flagged + sorted (current first,
// then most recently active). Never exposes the raw IP.
const listSessions = async (userId, currentTokenId) => {
  const sessions = await Session.find({ userId, revokedAt: null })
    .sort({ lastActive: -1 })
    .lean();

  return sessions
    .map((s) => ({
      id: String(s._id),
      device: s.device,
      deviceType: s.deviceType,
      browser: s.browser,
      os: s.os,
      ipMasked: s.ipMasked,
      location: s.location,
      loginAt: s.createdAt,
      lastActive: s.lastActive,
      current: s.tokenId === currentTokenId,
    }))
    .sort((a, b) => (b.current ? 1 : 0) - (a.current ? 1 : 0));
};

const countActiveSessions = (userId) =>
  Session.countDocuments({ userId, revokedAt: null });

// Revoke a single session by its Mongo _id (must belong to the user).
const revokeSessionById = async (userId, sessionId, reason = "user") => {
  const res = await Session.updateOne(
    { _id: sessionId, userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
  return res.modifiedCount > 0;
};

// Revoke every ACTIVE session except the current one ("log out all others").
const revokeOthers = async (userId, currentTokenId, reason = "logout_all") => {
  const res = await Session.updateMany(
    { userId, revokedAt: null, tokenId: { $ne: currentTokenId } },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
  return res.modifiedCount;
};

// Revoke ALL active sessions (used on account deletion / full sign-out).
const revokeAll = async (userId, reason = "logout_all") => {
  const res = await Session.updateMany(
    { userId, revokedAt: null },
    { $set: { revokedAt: new Date(), revokedReason: reason } },
  );
  return res.modifiedCount;
};

// Fetch the session doc by tokenId (any state) — helper for finding _id of current.
const getByTokenId = (tokenId) => Session.findOne({ tokenId });

module.exports = {
  createSession,
  getActiveSession,
  touchSession,
  listSessions,
  countActiveSessions,
  revokeSessionById,
  revokeOthers,
  revokeAll,
  getByTokenId,
};
