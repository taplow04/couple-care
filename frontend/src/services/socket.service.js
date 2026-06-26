import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_API_URL
  ? import.meta.env.VITE_API_URL.replace("/api/v1", "")
  : "http://localhost:5000";

let socket = null;
let socketToken = null;

export const getSocket = () => socket;

/**
 * Returns the single shared socket, creating it only once. This is called from
 * many places on mount (AppLayout, presence, unread, chat, calls). It MUST be
 * idempotent: returning the existing instance whether it's connected OR still
 * connecting. (The old code disconnected an in-flight socket and made a new one
 * on every concurrent call, which orphaned already-attached listeners and made
 * the server see connect/disconnect churn — the real cause of flaky presence
 * and missed events.) Only rebuild if the auth token actually changed.
 */
export const connectSocket = (token) => {
  if (socket && socketToken === token) return socket;

  // Token changed (re-login) — tear down the old connection first.
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  socketToken = token;
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
    socketToken = null;
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

export const emitMessageDelete = (coupleId, messageId, ack) => {
  if (!coupleId || !messageId || !socket?.connected) return;
  socket.emit("message:delete", { coupleId, messageId }, ack);
};

// Toggle an emoji reaction on a message. Server broadcasts "message:reaction".
export const emitReaction = (coupleId, messageId, emoji, ack) => {
  if (!coupleId || !messageId || !emoji || !socket?.connected) {
    if (typeof ack === "function") ack({ success: false, message: "Not connected" });
    return;
  }
  socket.emit("message:react", { coupleId, messageId, emoji }, ack);
};

// ── CoupleCare Moments (same shared socket) ──────────────────────────────────
// Register a view receipt for a partner's Moment (server emits "moment:viewed").
export const emitMomentView = (momentId, ack) => {
  if (!momentId || !socket?.connected) {
    if (typeof ack === "function") ack({ success: false, message: "Not connected" });
    return;
  }
  socket.emit("moment:view", { momentId }, ack);
};

// Toggle a reaction on a Moment (server broadcasts "moment:reaction").
export const emitMomentReaction = (momentId, emoji, ack) => {
  if (!momentId || !emoji || !socket?.connected) {
    if (typeof ack === "function") ack({ success: false, message: "Not connected" });
    return;
  }
  socket.emit("moment:react", { momentId, emoji }, ack);
};
