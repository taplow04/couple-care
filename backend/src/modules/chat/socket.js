const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");

const User = require("../users/user.model");
const Message = require("./message.model");
const { isCoupleMember } = require("./chat.helpers");

const onlineUsers = new Map();

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
    ==========================
    DISCONNECT
    ==========================
    */

    socket.on("disconnect", () => {
      removeOnlineSocket(socket.user._id, socket.id);

      console.log(`Socket Disconnected: ${socket.id}`);
    });
  });
};

module.exports = initializeSocket;
