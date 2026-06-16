import { useEffect, useRef, useState } from "react";
import { Navigate } from "react-router-dom";

import { useCall } from "../../../context/CallContext";
import CallControls from "../../../components/call/CallControls/CallControls";
import CallTimer from "../../../components/call/CallTimer/CallTimer";
import ConnectionStatus from "../../../components/call/ConnectionStatus/ConnectionStatus";
import "./VoiceCallPage.css";

const VoiceCallPage = () => {
  const {
    callState,
    callType,
    peer,
    remoteStream,
    isMuted,
    connectionState,
    callStartedAt,
    toggleMute,
    endCurrentCall,
  } = useCall();

  const audioRef = useRef(null);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);

  // Pipe the remote audio into a hidden element so it actually plays.
  useEffect(() => {
    const el = audioRef.current;
    if (el && remoteStream && el.srcObject !== remoteStream) {
      el.srcObject = remoteStream;
      el.play?.().catch(() => {});
    }
  }, [remoteStream]);

  // Speaker toggle is best-effort: output device selection isn't reliably
  // available on mobile browsers. Where setSinkId exists we toggle the default
  // output; otherwise it's a visual state only.
  const handleToggleSpeaker = async () => {
    const next = !isSpeakerOn;
    setIsSpeakerOn(next);
    const el = audioRef.current;
    if (el && typeof el.setSinkId === "function") {
      try {
        await el.setSinkId("");
      } catch {
        /* unsupported — ignore */
      }
    }
  };

  // Guard: only valid mid-call. Anything else returns home.
  if (callState !== "connecting" && callState !== "active") {
    return <Navigate to="/chat" replace />;
  }
  if (callType !== "voice") {
    return <Navigate to="/call/video" replace />;
  }

  const initial = peer?.name ? peer.name[0].toUpperCase() : "♥";

  return (
    <div className="voice-call">
      <audio ref={audioRef} autoPlay playsInline />

      <div className="voice-call__top">
        <ConnectionStatus connectionState={connectionState} callState={callState} />
      </div>

      <div className="voice-call__center">
        <div className="voice-call__avatar-wrap">
          <span className="voice-call__halo" />
          <div className="voice-call__avatar">
            {peer?.profilePhoto ? (
              <img src={peer.profilePhoto} alt={peer.name} />
            ) : (
              <span>{initial}</span>
            )}
          </div>
        </div>

        <h2 className="voice-call__name">{peer?.name || "Your Partner"}</h2>

        <div className="voice-call__status">
          {callState === "active" ? (
            <CallTimer startedAt={callStartedAt} />
          ) : (
            <span>Connecting…</span>
          )}
        </div>
      </div>

      <div className="voice-call__controls">
        <CallControls
          callType="voice"
          isMuted={isMuted}
          isSpeakerOn={isSpeakerOn}
          onToggleMute={toggleMute}
          onToggleSpeaker={handleToggleSpeaker}
          onEnd={endCurrentCall}
        />
      </div>
    </div>
  );
};

export default VoiceCallPage;
