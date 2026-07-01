const SecurityEvent = require("./securityEvent.model");

/**
 * Append a security event. Best-effort by contract: a logging failure must
 * never break the action that triggered it, so this always resolves.
 *
 * @param {Object} p
 * @param {string} p.userId
 * @param {string} p.type   one of securityEvent.model EVENT_TYPES
 * @param {string} [p.message]
 * @param {Object} [p.ctx]  request context from request.context.buildContext
 * @param {Object} [p.meta]
 */
const logEvent = async ({ userId, type, message = "", ctx = {}, meta = {} }) => {
  try {
    await SecurityEvent.create({
      userId,
      type,
      message,
      ipMasked: ctx.ipMasked || "",
      device: ctx.device || "",
      location: ctx.location || "",
      meta,
    });
  } catch (err) {
    console.error("[security] event log failed:", err.message);
  }
};

// Recent events, newest first (lazy-loaded on the client).
const listEvents = async (userId, limit = 30) => {
  return SecurityEvent.find({ userId })
    .sort({ createdAt: -1 })
    .limit(Math.min(Number(limit) || 30, 100))
    .lean();
};

module.exports = { logEvent, listEvents };
