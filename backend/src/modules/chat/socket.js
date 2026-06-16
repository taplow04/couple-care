const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../users/user.model");
const Message = require("./message.model");
const { isCoupleMember, getPartnerId } = require("./chat.helpers");
const callService = require("../calls/call.service");

const onlineUsers = new Map();

/*
==========================
CALL SIGNALING STATE
==========================
Media is NEVER touched by the server — these maps only track signaling state
so we can route offer/answer/ICE to the right partner, detect "busy", and
clean up on disconnect.
*/

// callId -> { callId, callerId, receiverId, coupleId, callType, accepted, timeout }
const activeCalls = new Map();

// userId (string) -> callId  (a user can only be in one call at a time)
const userActiveCall = new Map();

// How long an unanswered call rings before we mark it missed (ms).
const RING_TIMEOUT_MS = 35000;

const emitSocketError = (socket, message, details = null) => {
  socket.emit("socket:error", {
    success: false,
    message,
    details,
  });
};

const sendAck = (ack, payload) => {
  if (typeof ack === "function") {
    ack(payload);
  }
};

const getTokenFromSocket = (socket) => {
  const authToken = socket.handshake.auth?.token;
  const headerToken = socket.handshake.headers?.authorization;

  if (authToken) {
    return authToken;
  }

  if (headerToken?.startsWith("Bearer ")) {
    return headerToken.split(" ")[1];
  }

  return null;
};

const addOnlineSocket = (userId, socketId) => {
  const key = userId.toString();
  const sockets = onlineUsers.get(key) || new Set();

  sockets.add(socketId);
  onlineUsers.set(key, sockets);
};

const removeOnlineSocket = (userId, socketId) => {
  const key = userId.toString();
  const sockets = onlineUsers.get(key);

  if (!sockets) {
    return;
  }

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(key);
  }
};

const isUserOnline = (userId) => {
  const sockets = onlineUsers.get(userId.toString());
  return Boolean(sockets && sockets.size > 0);
};

// Emit an event to every active socket belonging to a user.
const emitToUser = (io, userId, event, payload) => {
  const sockets = onlineUsers.get(userId.toString());
  if (!sockets) {
    return;
  }
  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });
};

const isUserBusy = (userId) => userActiveCall.has(userId.toString());

// Returns the other participant's id for a given call session.
const getCallPeerId = (session, userId) => {
  return session.callerId.toString() === userId.toString()
    ? session.receiverId
    : session.callerId;
};

// Tear down all signaling state for a call. Idempotent.
const cleanupCall = (callId) => {
  const session = activeCalls.get(callId);
  if (!session) {
    return;
  }
  if (session.timeout) {
    clearTimeout(session.timeout);
  }
  userActiveCall.delete(session.callerId.toString());
  userActiveCall.delete(session.receiverId.toString());
  activeCalls.delete(callId);
};

const normalizeCoupleId = (payload) => {
  if (typeof payload === "string") {
    return payload;
  }

  if (payload && typeof payload === "object") {
    return payload.coupleId;
  }

  return null;
};

const validateCoupleRoom = async (userId, coupleId) => {
  if (!mongoose.Types.ObjectId.isValid(coupleId)) {
    throw new Error("Invalid couple room");
  }

  const allowed = await isCoupleMember(userId, coupleId);

  if (!allowed) {
    throw new Error("You are not allowed to access this room");
  }
};

const validateMessagePayload = (payload, userId) => {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid message payload");
  }

  const { coupleId, text } = payload;

  if (!mongoose.Types.ObjectId.isValid(coupleId)) {
    throw new Error("Invalid couple room");
  }

  if (typeof text !== "string" || !text.trim()) {
    throw new Error("Message cannot be empty");
  }

  if (text.trim().length > 1000) {
    throw new Error("Message cannot exceed 1000 characters");
  }

  return {
    ...payload,
    coupleId,
    senderId: userId,
    text: text.trim(),
  };
};

const initializeSocket = (io) => {
  io.use(async (socket, next) => {
    try {
      const token = getTokenFromSocket(socket);

      if (!token) {
        throw new Error("Unauthorized");
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.userId).select("-password");

      if (!user) {
        throw new Error("User not found");
      }

      socket.user = user;

      next();
    } catch (error) {
      next(new Error(error.message || "Socket authentication failed"));
    }
  });

  io.on("connection", (socket) => {
    addOnlineSocket(socket.user._id, socket.id);

    console.log(`Socket Connected: ${socket.id}`);

    /*
    ==========================
    USER ONLINE
    ==========================
    */

    socket.on("user:online", async (payload, ack) => {
      try {
        addOnlineSocket(socket.user._id, socket.id);

        console.log(`User Online: ${socket.user._id}`);

        sendAck(ack, {
          success: true,
          userId: socket.user._id,
        });
      } catch (error) {
        emitSocketError(socket, error.message);

        sendAck(ack, {
          success: false,
          message: error.message,
        });
      }
    });

    /*
    ==========================
    JOIN COUPLE ROOM
    ==========================
    */

    socket.on("join:room", async (payload, ack) => {
      try {
        const coupleId = normalizeCoupleId(payload);

        await validateCoupleRoom(socket.user._id, coupleId);

        socket.join(coupleId);

        console.log(`Socket ${socket.id} joined room ${coupleId}`);

        sendAck(ack, {
          success: true,
          coupleId,
        });
      } catch (error) {
        emitSocketError(socket, error.message);

        sendAck(ack, {
          success: false,
          message: error.message,
        });
      }
    });

    /*
    ==========================
    SEND MESSAGE
    ==========================
    */

    socket.on("message:send", async (messageData, ack) => {
      try {
        const message = validateMessagePayload(messageData, socket.user._id);

        await validateCoupleRoom(socket.user._id, message.coupleId);

        const savedMessage = await Message.create({
          coupleId: message.coupleId,
          senderId: socket.user._id,
          text: message.text,
        });

        io.to(message.coupleId).emit("message:receive", {
          _id: savedMessage._id,
          coupleId: message.coupleId,
          senderId: socket.user._id,
          text: message.text,
          seen: false,
          createdAt: savedMessage.createdAt,
        });

        sendAck(ack, {
          success: true,
          data: savedMessage,
        });
      } catch (error) {
        emitSocketError(socket, error.message);

        sendAck(ack, {
          success: false,
          message: error.message,
        });
      }
    });

    /*
    ==========================
    TYPING START
    ==========================
    */

    socket.on("typing:start", async (payload, ack) => {
      try {
        const coupleId = normalizeCoupleId(payload);

        await validateCoupleRoom(socket.user._id, coupleId);

        socket.to(coupleId).emit("typing:start", {
          coupleId,
          userId: socket.user._id,
        });

        sendAck(ack, {
          success: true,
          coupleId,
        });
      } catch (error) {
        emitSocketError(socket, error.message);

        sendAck(ack, {
          success: false,
          message: error.message,
        });
      }
    });

    /*
    ==========================
    TYPING STOP
    ==========================
    */

    socket.on("typing:stop", async (payload, ack) => {
      try {
        const coupleId = normalizeCoupleId(payload);

        await validateCoupleRoom(socket.user._id, coupleId);

        socket.to(coupleId).emit("typing:stop", {
          coupleId,
          userId: socket.user._id,
        });

        sendAck(ack, {
          success: true,
          coupleId,
        });
      } catch (error) {
        emitSocketError(socket, error.message);

        sendAck(ack, {
          success: false,
          message: error.message,
        });
      }
    });

    /*
    ==========================
    MESSAGE SEEN
    ==========================
    */

    socket.on("message:seen", async (payload, ack) => {
      try {
        if (!payload || typeof payload !== "object") {
          throw new Error("Invalid seen payload");
        }

        const { coupleId, messageId } = payload;

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
          throw new Error("Invalid message");
        }

        await validateCoupleRoom(socket.user._id, coupleId);

        socket.to(coupleId).emit("message:seen", {
          coupleId,
          messageId,
          userId: socket.user._id,
        });

        sendAck(ack, {
          success: true,
          messageId,
        });
      } catch (error) {
        emitSocketError(socket, error.message);

        sendAck(ack, {
          success: false,
          message: error.message,
        });
      }
    });

    /*
    ==========================
    DELETE MESSAGE
    ==========================
    */

    socket.on("message:delete", async (payload, ack) => {
      try {
        if (!payload || typeof payload !== "object") {
          throw new Error("Invalid payload");
        }

        const { coupleId, messageId } = payload;

        if (!mongoose.Types.ObjectId.isValid(messageId)) {
          throw new Error("Invalid message");
        }

        await validateCoupleRoom(socket.user._id, coupleId);

        const message = await Message.findOne({
          _id: messageId,
          coupleId,
        });

        if (!message) throw new Error("Message not found");
        if (String(message.senderId) !== String(socket.user._id)) {
          throw new Error("Not authorized to delete this message");
        }

        await Message.deleteOne({ _id: messageId });

        io.to(coupleId).emit("message:deleted", { messageId, coupleId });

        sendAck(ack, { success: true, messageId });
      } catch (error) {
        emitSocketError(socket, error.message);
        sendAck(ack, { success: false, message: error.message });
      }
    });

    /*
    ============================================================
    WEBRTC CALL SIGNALING
    ------------------------------------------------------------
    Server relays signaling only. Audio/video flows peer-to-peer
    (or via TURN) and never touches this server.
    ============================================================
    */

    const userId = socket.user._id;

    /*
    ==========================
    CALL: INITIATE
    ==========================
    */
    socket.on("call:initiate", async (payload, ack) => {
      try {
        const callType = payload?.callType;

        if (callType !== "voice" && callType !== "video") {
          throw new Error("Invalid call type");
        }

        const coupleId = socket.user.currentCoupleId;
        if (!coupleId) {
          return sendAck(ack, { success: false, reason: "no-partner" });
        }

        // Only ever resolves to the bound partner — cannot call a random user.
        const receiverId = await getPartnerId(userId);
        if (!receiverId) {
          return sendAck(ack, { success: false, reason: "no-partner" });
        }

        if (isUserBusy(userId)) {
          return sendAck(ack, { success: false, reason: "already-in-call" });
        }

        if (isUserBusy(receiverId)) {
          return sendAck(ack, { success: false, reason: "busy" });
        }

        if (!isUserOnline(receiverId)) {
          // Log the missed attempt for history, then tell the caller.
          try {
            const missed = await callService.createCall({
              coupleId,
              callerId: userId,
              receiverId,
              callType,
            });
            await callService.finalizeCall(missed._id, "missed");
          } catch (e) {
            console.error("call history (offline) error:", e.message);
          }
          return sendAck(ack, { success: false, reason: "offline" });
        }

        const record = await callService.createCall({
          coupleId,
          callerId: userId,
          receiverId,
          callType,
        });

        const callId = record._id.toString();

        const session = {
          callId,
          callerId: userId,
          receiverId,
          coupleId,
          callType,
          accepted: false,
          timeout: null,
        };

        // Ring timeout -> missed call.
        session.timeout = setTimeout(async () => {
          const current = activeCalls.get(callId);
          if (!current || current.accepted) {
            return;
          }
          try {
            await callService.finalizeCall(callId, "missed");
          } catch (e) {
            console.error("finalize missed error:", e.message);
          }
          emitToUser(io, receiverId, "call:missed", { callId });
          emitToUser(io, userId, "call:timeout", { callId });
          cleanupCall(callId);
        }, RING_TIMEOUT_MS);

        activeCalls.set(callId, session);
        userActiveCall.set(userId.toString(), callId);
        userActiveCall.set(receiverId.toString(), callId);

        emitToUser(io, receiverId, "call:incoming", {
          callId,
          callType,
          coupleId: coupleId.toString(),
          from: {
            _id: socket.user._id,
            name: socket.user.name,
            profilePhoto: socket.user.profilePhoto,
          },
        });

        sendAck(ack, { success: true, callId });
      } catch (error) {
        console.error("call:initiate error:", error.message);
        sendAck(ack, { success: false, message: error.message });
      }
    });

    /*
    ==========================
    CALL: ACCEPT
    ==========================
    */
    socket.on("call:accept", async (payload, ack) => {
      try {
        const callId = payload?.callId;
        const session = activeCalls.get(callId);

        if (!session) {
          return sendAck(ack, { success: false, reason: "expired" });
        }
        if (session.receiverId.toString() !== userId.toString()) {
          throw new Error("Not authorized for this call");
        }

        session.accepted = true;
        if (session.timeout) {
          clearTimeout(session.timeout);
          session.timeout = null;
        }

        try {
          await callService.markAnswered(callId);
        } catch (e) {
          console.error("markAnswered error:", e.message);
        }

        emitToUser(io, session.callerId, "call:accepted", { callId });
        sendAck(ack, { success: true, callId });
      } catch (error) {
        sendAck(ack, { success: false, message: error.message });
      }
    });

    /*
    ==========================
    CALL: REJECT
    ==========================
    */
    socket.on("call:reject", async (payload, ack) => {
      try {
        const callId = payload?.callId;
        const session = activeCalls.get(callId);
        if (!session) {
          return sendAck(ack, { success: true });
        }

        try {
          await callService.finalizeCall(callId, "rejected");
        } catch (e) {
          console.error("finalize rejected error:", e.message);
        }

        emitToUser(io, session.callerId, "call:rejected", { callId });
        cleanupCall(callId);
        sendAck(ack, { success: true });
      } catch (error) {
        sendAck(ack, { success: false, message: error.message });
      }
    });

    /*
    ==========================
    CALL: BUSY (auto-decline when callee already in a call elsewhere)
    ==========================
    */
    socket.on("call:busy", async (payload) => {
      const callId = payload?.callId;
      const session = activeCalls.get(callId);
      if (!session) {
        return;
      }
      try {
        await callService.finalizeCall(callId, "rejected");
      } catch (e) {
        console.error("finalize busy error:", e.message);
      }
      emitToUser(io, session.callerId, "call:rejected", {
        callId,
        reason: "busy",
      });
      cleanupCall(callId);
    });

    /*
    ==========================
    CALL: END (hang up / cancel)
    ==========================
    */
    socket.on("call:end", async (payload, ack) => {
      try {
        const callId = payload?.callId;
        const session = activeCalls.get(callId);
        if (!session) {
          return sendAck(ack, { success: true });
        }

        const status = session.accepted ? "completed" : "cancelled";
        try {
          await callService.finalizeCall(callId, status);
        } catch (e) {
          console.error("finalize end error:", e.message);
        }

        const peerId = getCallPeerId(session, userId);
        emitToUser(io, peerId, "call:ended", { callId });

        cleanupCall(callId);
        sendAck(ack, { success: true });
      } catch (error) {
        sendAck(ack, { success: false, message: error.message });
      }
    });

    /*
    ==========================
    WEBRTC: OFFER / ANSWER / ICE  (pure relay)
    ==========================
    */
    socket.on("webrtc:offer", (payload) => {
      const session = activeCalls.get(payload?.callId);
      if (!session) return;
      const peerId = getCallPeerId(session, userId);
      emitToUser(io, peerId, "webrtc:offer", {
        callId: session.callId,
        sdp: payload.sdp,
      });
    });

    socket.on("webrtc:answer", (payload) => {
      const session = activeCalls.get(payload?.callId);
      if (!session) return;
      const peerId = getCallPeerId(session, userId);
      emitToUser(io, peerId, "webrtc:answer", {
        callId: session.callId,
        sdp: payload.sdp,
      });
    });

    socket.on("webrtc:ice-candidate", (payload) => {
      const session = activeCalls.get(payload?.callId);
      if (!session) return;
      const peerId = getCallPeerId(session, userId);
      emitToUser(io, peerId, "webrtc:ice-candidate", {
        callId: session.callId,
        candidate: payload.candidate,
      });
    });

    /*
    ==========================
    DISCONNECT
    ==========================
    */

    socket.on("disconnect", async () => {
      removeOnlineSocket(socket.user._id, socket.id);

      // If this was the user's last connection and they were in a call,
      // tear it down and notify the partner.
      if (!isUserOnline(userId)) {
        const callId = userActiveCall.get(userId.toString());
        if (callId) {
          const session = activeCalls.get(callId);
          if (session) {
            const status = session.accepted ? "completed" : "missed";
            try {
              await callService.finalizeCall(callId, status);
            } catch (e) {
              console.error("finalize disconnect error:", e.message);
            }
            const peerId = getCallPeerId(session, userId);
            emitToUser(io, peerId, "call:ended", {
              callId,
              reason: "disconnected",
            });
            cleanupCall(callId);
          }
        }
      }

      console.log(`Socket Disconnected: ${socket.id}`);
    });
  });
};

module.exports = initializeSocket;
