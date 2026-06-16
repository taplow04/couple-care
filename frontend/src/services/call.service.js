import { getSocket } from "./socket.service";

/**
 * Call signaling transport. These are thin emitters over the SAME socket
 * singleton used by chat (services/socket.service.js) — there is no second
 * socket connection. The CallContext subscribes to the inbound events
 * (call:incoming, call:accepted, webrtc:*, etc.) directly via getSocket().
 */

const emit = (event, payload, ack) => {
  const socket = getSocket();
  if (!socket?.connected) {
    if (typeof ack === "function") {
      ack({ success: false, reason: "disconnected" });
    }
    return;
  }
  socket.emit(event, payload, ack);
};

// ── Call lifecycle ──────────────────────────────────────────────────────────

export const initiateCall = (callType, ack) =>
  emit("call:initiate", { callType }, ack);

export const acceptCall = (callId, ack) =>
  emit("call:accept", { callId }, ack);

export const rejectCall = (callId, ack) =>
  emit("call:reject", { callId }, ack);

export const sendBusy = (callId) => emit("call:busy", { callId });

export const endCall = (callId, ack) => emit("call:end", { callId }, ack);

// ── WebRTC signaling relay ──────────────────────────────────────────────────

export const sendOffer = (callId, sdp) => emit("webrtc:offer", { callId, sdp });

export const sendAnswer = (callId, sdp) =>
  emit("webrtc:answer", { callId, sdp });

export const sendIceCandidate = (callId, candidate) =>
  emit("webrtc:ice-candidate", { callId, candidate });
