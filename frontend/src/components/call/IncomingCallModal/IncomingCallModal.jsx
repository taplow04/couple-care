import { useEffect } from "react";
import { useCall } from "../../../context/CallContext";
import "./IncomingCallModal.css";

/**
 * Full-screen overlay shown app-wide when a call is ringing in.
 * Renders nothing unless callState === "incoming".
 */
const IncomingCallModal = () => {
  const { callState, callType, peer, acceptIncoming, rejectIncoming } = useCall();

  const visible = callState === "incoming";

  // Gentle vibration pattern while ringing (mobile only, best-effort).
  useEffect(() => {
    if (!visible || !navigator.vibrate) return;
    const id = setInterval(() => navigator.vibrate([400, 200, 400]), 1500);
    navigator.vibrate([400, 200, 400]);
    return () => {
      clearInterval(id);
      navigator.vibrate(0);
    };
  }, [visible]);

  if (!visible) return null;

  const isVideo = callType === "video";
  const initial = peer?.name ? peer.name[0].toUpperCase() : "♥";

  return (
    <div className="incoming-call">
      <div className="incoming-call__backdrop" />

      <div className="incoming-call__content">
        <p className="incoming-call__type">
          {isVideo ? "🎥 Incoming video call" : "❤️ Incoming voice call"}
        </p>

        <div className="incoming-call__avatar-wrap">
          <span className="incoming-call__ring" />
          <span className="incoming-call__ring incoming-call__ring--delay" />
          <div className="incoming-call__avatar">
            {peer?.profilePhoto ? (
              <img src={peer.profilePhoto} alt={peer.name} />
            ) : (
              <span>{initial}</span>
            )}
          </div>
        </div>

        <h2 className="incoming-call__name">{peer?.name || "Your Partner"}</h2>
        <p className="incoming-call__sub">is calling you…</p>

        <div className="incoming-call__actions">
          <button
            type="button"
            className="incoming-call__btn incoming-call__btn--reject"
            onClick={rejectIncoming}
            aria-label="Decline"
          >
            <span>📞</span>
          </button>
          <button
            type="button"
            className="incoming-call__btn incoming-call__btn--accept"
            onClick={acceptIncoming}
            aria-label="Accept"
          >
            <span>{isVideo ? "🎥" : "📞"}</span>
          </button>
        </div>

        <div className="incoming-call__labels">
          <span>Decline</span>
          <span>Accept</span>
        </div>
      </div>
    </div>
  );
};

export default IncomingCallModal;
