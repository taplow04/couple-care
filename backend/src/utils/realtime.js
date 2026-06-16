/**
 * Realtime registry — the single owner of the Socket.io `io` instance and the
 * online-user → socket-id map.
 *
 * This exists so non-socket modules (e.g. notification.service) can push
 * realtime events to a specific user WITHOUT importing socket.js (which would
 * create a circular dependency) and WITHOUT opening a second connection. It
 * imports nothing of ours, so it's safe to require from anywhere.
 */

let io = null;

// userId (string) -> Set<socketId>
const onlineUsers = new Map();

const setIo = (instance) => {
  io = instance;
};

const getIo = () => io;

/**
 * Register a socket for a user.
 * @returns {boolean} true if the user was previously OFFLINE (i.e. this is a
 *   fresh online transition) — useful for broadcasting presence.
 */
const addOnlineSocket = (userId, socketId) => {
  const key = userId.toString();
  const existing = onlineUsers.get(key);
  const wasOffline = !existing || existing.size === 0;

  const sockets = existing || new Set();
  sockets.add(socketId);
  onlineUsers.set(key, sockets);

  return wasOffline;
};

/**
 * Deregister a socket for a user.
 * @returns {boolean} true if the user is now OFFLINE (no remaining sockets).
 */
const removeOnlineSocket = (userId, socketId) => {
  const key = userId.toString();
  const sockets = onlineUsers.get(key);
  if (!sockets) return true;

  sockets.delete(socketId);

  if (sockets.size === 0) {
    onlineUsers.delete(key);
    return true;
  }
  return false;
};

const isUserOnline = (userId) =>
  userId != null && onlineUsers.has(userId.toString());

// Emit an event to every active socket of a user. No-op if offline / no io.
const emitToUser = (userId, event, payload) => {
  if (!io || userId == null) return;
  const sockets = onlineUsers.get(userId.toString());
  if (!sockets) return;
  sockets.forEach((socketId) => {
    io.to(socketId).emit(event, payload);
  });
};

module.exports = {
  setIo,
  getIo,
  onlineUsers,
  addOnlineSocket,
  removeOnlineSocket,
  isUserOnline,
  emitToUser,
};
