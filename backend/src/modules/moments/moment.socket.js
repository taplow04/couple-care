/**
 * Moment socket events — registered on the SAME Socket.io connection used for
 * chat/calls (never a second socket). Reactions and views are pushed live to the
 * relevant partner; the service performs auth (couple membership), persistence,
 * notifications, and the realtime emit via utils/realtime.
 */
const mongoose = require("mongoose");
const momentService = require("./moment.service");
const { REACTION_SET } = require("./moment.constants");

const sendAck = (ack, payload) => {
  if (typeof ack === "function") ack(payload);
};

const registerMomentSocket = (socket) => {
  // React to a moment (Feature 6) — toggle one emoji per user, real-time.
  socket.on("moment:react", async (payload, ack) => {
    try {
      const { momentId, emoji } = payload || {};
      if (!mongoose.Types.ObjectId.isValid(momentId)) throw new Error("Invalid moment");
      if (!REACTION_SET.has(emoji)) throw new Error("Invalid reaction");
      const result = await momentService.reactToMoment(socket.user._id, momentId, emoji);
      sendAck(ack, { success: true, ...result });
    } catch (error) {
      sendAck(ack, { success: false, message: error.message });
    }
  });

  // Register a view (Feature 5) — notifies + emits to the uploader.
  socket.on("moment:view", async (payload, ack) => {
    try {
      const { momentId } = payload || {};
      if (!mongoose.Types.ObjectId.isValid(momentId)) throw new Error("Invalid moment");
      await momentService.markViewed(socket.user._id, momentId);
      sendAck(ack, { success: true });
    } catch (error) {
      sendAck(ack, { success: false, message: error.message });
    }
  });
};

module.exports = { registerMomentSocket };
