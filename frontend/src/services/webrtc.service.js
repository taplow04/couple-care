import { RTC_CONFIG } from "../config/iceServers";

/**
 * Thin, framework-agnostic wrapper around RTCPeerConnection + getUserMedia.
 *
 * It owns NO signaling — the caller wires the callbacks (onIceCandidate,
 * onRemoteStream, onConnectionStateChange) to the socket transport. This keeps
 * media (peer-to-peer) cleanly separated from signaling (socket).
 */

export const getMediaConstraints = (callType) => ({
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  },
  video:
    callType === "video"
      ? {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        }
      : false,
});

/**
 * Acquire the local media stream. Throws a tagged error the UI can map to a
 * friendly message (permission denied / no device / etc).
 */
export const acquireLocalStream = async (callType) => {
  if (!navigator.mediaDevices?.getUserMedia) {
    const err = new Error("Media devices are not supported on this browser.");
    err.code = "unsupported";
    throw err;
  }

  try {
    return await navigator.mediaDevices.getUserMedia(
      getMediaConstraints(callType),
    );
  } catch (error) {
    const tagged = new Error(error.message);
    switch (error.name) {
      case "NotAllowedError":
      case "SecurityError":
        tagged.code = "permission-denied";
        break;
      case "NotFoundError":
      case "OverconstrainedError":
        tagged.code = callType === "video" ? "no-camera" : "no-microphone";
        break;
      case "NotReadableError":
        tagged.code = "device-in-use";
        break;
      default:
        tagged.code = "media-error";
    }
    throw tagged;
  }
};

export class PeerSession {
  constructor({ onIceCandidate, onRemoteStream, onConnectionStateChange }) {
    this.pc = new RTCPeerConnection(RTC_CONFIG);
    this.remoteStream = new MediaStream();
    this._pendingCandidates = [];
    this._remoteDescSet = false;

    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        onIceCandidate?.(event.candidate);
      }
    };

    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach((track) => {
        this.remoteStream.addTrack(track);
      });
      onRemoteStream?.(this.remoteStream);
    };

    this.pc.onconnectionstatechange = () => {
      onConnectionStateChange?.(this.pc.connectionState);
    };
  }

  addLocalStream(stream) {
    stream.getTracks().forEach((track) => {
      this.pc.addTrack(track, stream);
    });
  }

  async createOffer() {
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);
    return offer;
  }

  async createAnswer() {
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);
    return answer;
  }

  async setRemoteDescription(sdp) {
    await this.pc.setRemoteDescription(new RTCSessionDescription(sdp));
    this._remoteDescSet = true;
    // Flush any ICE candidates that arrived before the remote description.
    const queued = this._pendingCandidates;
    this._pendingCandidates = [];
    for (const candidate of queued) {
      await this._safeAddCandidate(candidate);
    }
  }

  async addIceCandidate(candidate) {
    if (!candidate) return;
    if (!this._remoteDescSet) {
      this._pendingCandidates.push(candidate);
      return;
    }
    await this._safeAddCandidate(candidate);
  }

  async _safeAddCandidate(candidate) {
    try {
      await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
      // Late/duplicate candidates after connection are non-fatal.
      console.warn("addIceCandidate failed:", e.message);
    }
  }

  // Replace the active video track (e.g. when switching front/back camera).
  async replaceVideoTrack(newTrack) {
    const sender = this.pc.getSenders().find((s) => s.track?.kind === "video");
    if (sender) {
      await sender.replaceTrack(newTrack);
    }
  }

  getConnectionState() {
    return this.pc.connectionState;
  }

  close() {
    try {
      this.pc.getSenders().forEach((sender) => sender.track?.stop());
    } catch {
      /* noop */
    }
    this.pc.onicecandidate = null;
    this.pc.ontrack = null;
    this.pc.onconnectionstatechange = null;
    try {
      this.pc.close();
    } catch {
      /* noop */
    }
  }
}

// Stop every track on a stream (releases camera/mic hardware + indicator).
export const stopStream = (stream) => {
  stream?.getTracks().forEach((track) => track.stop());
};
