import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "./AuthContext";
import { connectSocket, joinCoupleRoom } from "../services/socket.service";
import {
  initiateCall,
  acceptCall,
  rejectCall,
  endCall,
  sendBusy,
  sendOffer,
  sendAnswer,
  sendIceCandidate,
} from "../services/call.service";
import {
  PeerSession,
  acquireLocalStream,
  stopStream,
} from "../services/webrtc.service";

const CallContext = createContext(null);

// Call lifecycle: idle -> outgoing|incoming -> connecting -> active -> idle
const MEDIA_ERROR_MESSAGES = {
  "permission-denied":
    "Camera/microphone permission denied. Please allow access and try again.",
  "no-camera": "No camera found on this device.",
  "no-microphone": "No microphone found on this device.",
  "device-in-use": "Your camera or microphone is already in use by another app.",
  unsupported: "Calling isn't supported on this browser.",
  "media-error": "Couldn't access your microphone or camera.",
};

const END_REASON_MESSAGES = {
  busy: "Your partner is on another call.",
  offline: "Your partner is offline right now.",
  "no-partner": "Connect with your partner to start calling.",
  "already-in-call": "You're already in a call.",
  rejected: "Call declined.",
  timeout: "No answer.",
  disconnected: "Call disconnected.",
  failed: "Connection failed. Please try again.",
};

export const CallProvider = ({ children }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const coupleId = user?.currentCoupleId;

  const [callState, setCallState] = useState("idle");
  const [callType, setCallType] = useState(null);
  const [peer, setPeer] = useState(null); // { _id, name, profilePhoto }
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [connectionState, setConnectionState] = useState("new");
  const [callError, setCallError] = useState(null); // transient banner / toast
  const [callStartedAt, setCallStartedAt] = useState(null);

  // Refs hold the live, mutable values the socket handlers need without
  // becoming stale across re-renders.
  const peerRef = useRef(null);
  const localStreamRef = useRef(null);
  const callIdRef = useRef(null);
  const callTypeRef = useRef(null);
  const roleRef = useRef(null); // "caller" | "callee"
  const stateRef = useRef("idle");
  const facingModeRef = useRef("user");
  const returnPathRef = useRef("/chat");

  const setState = useCallback((s) => {
    stateRef.current = s;
    setCallState(s);
  }, []);

  // ── Teardown ───────────────────────────────────────────────────────────────
  const cleanup = useCallback(
    (opts = {}) => {
      const { goBack = true } = opts;

      if (peerRef.current) {
        peerRef.current.close();
        peerRef.current = null;
      }
      if (localStreamRef.current) {
        stopStream(localStreamRef.current);
        localStreamRef.current = null;
      }

      const wasInCallScreen =
        stateRef.current === "connecting" || stateRef.current === "active";

      callIdRef.current = null;
      callTypeRef.current = null;
      roleRef.current = null;
      facingModeRef.current = "user";

      setLocalStream(null);
      setRemoteStream(null);
      setIsMuted(false);
      setIsCameraOff(false);
      setConnectionState("new");
      setCallStartedAt(null);
      setPeer(null);
      setCallType(null);
      setState("idle");

      if (goBack && wasInCallScreen) {
        navigate(returnPathRef.current || "/chat", { replace: true });
      }
    },
    [navigate, setState],
  );

  const flashError = useCallback((message) => {
    setCallError(message);
    setTimeout(() => setCallError(null), 4000);
  }, []);

  // ── Build a peer connection wired to the socket transport ───────────────────
  const buildPeer = useCallback(() => {
    const session = new PeerSession({
      onIceCandidate: (candidate) => {
        if (callIdRef.current) sendIceCandidate(callIdRef.current, candidate);
      },
      onRemoteStream: (stream) => {
        setRemoteStream(stream);
      },
      onConnectionStateChange: (cs) => {
        setConnectionState(cs);
        if (cs === "connected") {
          if (stateRef.current !== "active") {
            setState("active");
            setCallStartedAt(Date.now());
          }
        } else if (cs === "failed") {
          flashError(END_REASON_MESSAGES.failed);
          if (callIdRef.current) endCall(callIdRef.current);
          cleanup();
        }
        // "disconnected" is left alone — ICE may auto-recover; the UI shows a
        // "reconnecting" state via connectionState.
      },
    });
    peerRef.current = session;
    return session;
  }, [cleanup, flashError, setState]);

  // ── Outgoing call (caller) ──────────────────────────────────────────────────
  const startCall = useCallback(
    async (type, partner) => {
      if (stateRef.current !== "idle") return;
      if (!coupleId) {
        flashError(END_REASON_MESSAGES["no-partner"]);
        return;
      }

      roleRef.current = "caller";
      callTypeRef.current = type;
      setCallType(type);
      setPeer(partner || null);
      returnPathRef.current = window.location.pathname || "/chat";
      setState("outgoing");

      // Acquire media up front for self-preview + to fail fast on permissions.
      try {
        const stream = await acquireLocalStream(type);
        localStreamRef.current = stream;
        setLocalStream(stream);
      } catch (err) {
        flashError(MEDIA_ERROR_MESSAGES[err.code] || MEDIA_ERROR_MESSAGES["media-error"]);
        cleanup({ goBack: false });
        return;
      }

      initiateCall(type, (ack) => {
        if (!ack?.success) {
          const msg =
            END_REASON_MESSAGES[ack?.reason] ||
            ack?.message ||
            "Couldn't start the call.";
          flashError(msg);
          cleanup({ goBack: false });
          return;
        }
        callIdRef.current = ack.callId;
      });
    },
    [coupleId, flashError, cleanup, setState],
  );

  // ── Accept an incoming call (callee) ────────────────────────────────────────
  const acceptIncoming = useCallback(async () => {
    if (stateRef.current !== "incoming") return;
    const type = callTypeRef.current;
    const callId = callIdRef.current;

    setState("connecting");
    returnPathRef.current =
      window.location.pathname && window.location.pathname !== "/"
        ? window.location.pathname
        : "/chat";
    navigate(type === "video" ? "/call/video" : "/call/voice");

    try {
      const stream = await acquireLocalStream(type);
      localStreamRef.current = stream;
      setLocalStream(stream);

      const session = buildPeer();
      session.addLocalStream(stream);
    } catch (err) {
      flashError(MEDIA_ERROR_MESSAGES[err.code] || MEDIA_ERROR_MESSAGES["media-error"]);
      if (callId) rejectCall(callId);
      cleanup();
      return;
    }

    acceptCall(callId, (ack) => {
      if (!ack?.success) {
        flashError("Call no longer available.");
        cleanup();
      }
      // On success we now wait for webrtc:offer from the caller.
    });
  }, [navigate, buildPeer, flashError, cleanup, setState]);

  const rejectIncoming = useCallback(() => {
    if (callIdRef.current) rejectCall(callIdRef.current);
    cleanup({ goBack: false });
  }, [cleanup]);

  const endCurrentCall = useCallback(() => {
    if (callIdRef.current) endCall(callIdRef.current);
    cleanup();
  }, [cleanup]);

  // ── Media controls ──────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isMuted;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setIsMuted(next);
  }, [isMuted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !isCameraOff;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !next;
    });
    setIsCameraOff(next);
  }, [isCameraOff]);

  const switchCamera = useCallback(async () => {
    const stream = localStreamRef.current;
    if (!stream || callTypeRef.current !== "video") return;

    const nextFacing = facingModeRef.current === "user" ? "environment" : "user";
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: nextFacing } },
        audio: false,
      });
      const newTrack = newStream.getVideoTracks()[0];
      if (!newTrack) return;

      await peerRef.current?.replaceVideoTrack(newTrack);

      // Swap the track inside the existing local stream so the preview updates.
      const oldTrack = stream.getVideoTracks()[0];
      if (oldTrack) {
        stream.removeTrack(oldTrack);
        oldTrack.stop();
      }
      stream.addTrack(newTrack);
      newTrack.enabled = !isCameraOff;
      facingModeRef.current = nextFacing;
      setLocalStream(stream);
    } catch {
      flashError("Couldn't switch camera.");
    }
  }, [isCameraOff, flashError]);

  // ── Socket wiring (uses the shared singleton — no second connection) ─────────
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem("token");
    const socket = connectSocket(token);

    const onConnect = () => {
      if (coupleId) joinCoupleRoom(coupleId);
    };
    if (socket.connected && coupleId) joinCoupleRoom(coupleId);

    // Incoming call
    const onIncoming = ({ callId, callType: type, from }) => {
      // Already busy elsewhere -> auto-decline so the caller hears "busy".
      if (stateRef.current !== "idle") {
        sendBusy(callId);
        return;
      }
      callIdRef.current = callId;
      callTypeRef.current = type;
      roleRef.current = "callee";
      setCallType(type);
      setPeer(from);
      setState("incoming");
    };

    // Caller: callee accepted -> create + send the offer.
    const onAccepted = async () => {
      if (roleRef.current !== "caller") return;
      setState("connecting");
      navigate(callTypeRef.current === "video" ? "/call/video" : "/call/voice");
      try {
        const session = buildPeer();
        if (localStreamRef.current) session.addLocalStream(localStreamRef.current);
        const offer = await session.createOffer();
        sendOffer(callIdRef.current, offer);
      } catch {
        flashError(END_REASON_MESSAGES.failed);
        endCurrentCall();
      }
    };

    // Callee: received the caller's offer -> answer it.
    const onOffer = async ({ sdp }) => {
      if (roleRef.current !== "callee" || !peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(sdp);
        const answer = await peerRef.current.createAnswer();
        sendAnswer(callIdRef.current, answer);
      } catch {
        flashError(END_REASON_MESSAGES.failed);
        endCurrentCall();
      }
    };

    // Caller: received the callee's answer.
    const onAnswer = async ({ sdp }) => {
      if (roleRef.current !== "caller" || !peerRef.current) return;
      try {
        await peerRef.current.setRemoteDescription(sdp);
      } catch {
        flashError(END_REASON_MESSAGES.failed);
        endCurrentCall();
      }
    };

    const onIce = async ({ candidate }) => {
      await peerRef.current?.addIceCandidate(candidate);
    };

    const onRejected = ({ reason }) => {
      flashError(END_REASON_MESSAGES[reason] || END_REASON_MESSAGES.rejected);
      cleanup();
    };

    const onEnded = () => {
      cleanup();
    };

    const onTimeout = () => {
      flashError(END_REASON_MESSAGES.timeout);
      cleanup();
    };

    const onMissed = () => {
      // Incoming call rang out before we answered.
      cleanup({ goBack: false });
    };

    socket.on("connect", onConnect);
    socket.on("call:incoming", onIncoming);
    socket.on("call:accepted", onAccepted);
    socket.on("webrtc:offer", onOffer);
    socket.on("webrtc:answer", onAnswer);
    socket.on("webrtc:ice-candidate", onIce);
    socket.on("call:rejected", onRejected);
    socket.on("call:ended", onEnded);
    socket.on("call:timeout", onTimeout);
    socket.on("call:missed", onMissed);

    return () => {
      socket.off("connect", onConnect);
      socket.off("call:incoming", onIncoming);
      socket.off("call:accepted", onAccepted);
      socket.off("webrtc:offer", onOffer);
      socket.off("webrtc:answer", onAnswer);
      socket.off("webrtc:ice-candidate", onIce);
      socket.off("call:rejected", onRejected);
      socket.off("call:ended", onEnded);
      socket.off("call:timeout", onTimeout);
      socket.off("call:missed", onMissed);
    };
  }, [
    user,
    coupleId,
    navigate,
    buildPeer,
    cleanup,
    flashError,
    endCurrentCall,
    setState,
  ]);

  const value = {
    callState,
    callType,
    peer,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    connectionState,
    callError,
    callStartedAt,
    canCall: Boolean(coupleId),
    startCall,
    acceptIncoming,
    rejectIncoming,
    endCurrentCall,
    toggleMute,
    toggleCamera,
    switchCamera,
  };

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return ctx;
};
