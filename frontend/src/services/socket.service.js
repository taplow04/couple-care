import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api/v1", "")
  : "http://localhost:5000";

let socket = null;

export const getSocket = () => socket;

export const connectSocket = (token) => {
  if (socket?.connected) return socket;
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    reconnectionAttempts: Infinity,
    transports: ["websocket", "polling"],
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const joinCoupleRoom = (coupleId) => {
  if (!coupleId || !socket?.connected) return;
  socket.emit("join:room", coupleId);
};

export const emitTypingStart = (coupleId) => {
  if (!coupleId || !socket?.connected) return;
  socket.emit("typing:start", { coupleId });
};

export const emitTypingStop = (coupleId) => {
  if (!coupleId || !socket?.connected) return;
  socket.emit("typing:stop", { coupleId });
};

export const emitMessageSend = (data, ack) => {
  if (!socket?.connected) {
    if (typeof ack === "function") ack({ success: false, message: "Not connected" });
    return;
  }
  socket.emit("message:send", data, ack);
};

export const emitMessageSeen = (coupleId, messageId) => {
  if (!coupleId || !messageId || !socket?.connected) return;
  socket.emit("message:seen", { coupleId, messageId });
};
