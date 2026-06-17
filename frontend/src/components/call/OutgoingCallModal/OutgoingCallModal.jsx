import { useCall } from "../../../context/CallContext";
import { getFirstName } from "../../../utils/getFirstName";
import "./OutgoingCallModal.css";

/**
 * Shown while WE are ringing the partner and they haven't accepted yet.
 * Once the call connects the user is navigated to the full call page, so this
 * only covers the "outgoing" state.
 */
const OutgoingCallModal = () => {
  const { callState, callType, peer, endCurrentCall } = useCall();

  if (callState !== "outgoing") return null;

  const isVideo = callType === "video";
  const initial = peer?.name ? peer.name[0].toUpperCase() : "♥";

  return (
    <div className="outgoing-call">
      <div className="outgoing-call__backdrop" />

      <div className="outgoing-call__content">
        <p className="outgoing-call__type">
          {isVideo ? "🎥 Video call" : "❤️ Voice call"}
        </p>

        <div className="outgoing-call__avatar-wrap">
          <span className="outgoing-call__ring" />
          <div className="outgoing-call__avatar">
            {peer?.profilePhoto ? (
              <img src={peer.profilePhoto} alt={peer.name} />
            ) : (
              <span>{initial}</span>
            )}
          </div>
        </div>

        <h2 className="outgoing-call__name">{getFirstName(peer?.name, "Your Partner")}</h2>
        <p className="outgoing-call__sub">
          Calling<span className="outgoing-call__dots" />
        </p>

        <button
          type="button"
          className="outgoing-call__cancel"
          onClick={endCurrentCall}
          aria-label="Cancel call"
        >
          <span>📞</span>
        </button>
        <span className="outgoing-call__cancel-label">Cancel</span>
      </div>
    </div>
  );
};

export default OutgoingCallModal;
