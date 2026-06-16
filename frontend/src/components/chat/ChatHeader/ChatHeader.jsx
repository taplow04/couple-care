import OnlineStatus from "../OnlineStatus/OnlineStatus";
import { useCall } from "../../../context/CallContext";
import "./ChatHeader.css";

const ChatHeader = ({ partner, socketConnected }) => {
  const { canCall, startCall, callState } = useCall();
  const initial = partner?.name ? partner.name[0].toUpperCase() : "♥";

  // Disable while a call is already in progress to avoid double-initiating.
  const busy = callState !== "idle";

  return (
    <div className="chat-header">
      <div className="chat-header__avatar-ring">
        <div className="chat-header__avatar">
          {partner?.profilePhoto ? (
            <img src={partner.profilePhoto} alt={partner.name} className="chat-header__avatar-img" />
          ) : (
            <span className="chat-header__avatar-initial">{initial}</span>
          )}
        </div>
      </div>

      <div className="chat-header__info">
        <h2 className="chat-header__name">{partner?.name || "Your Partner"}</h2>
        <OnlineStatus connected={socketConnected} />
      </div>

      {canCall && (
        <div className="chat-header__actions">
          <button
            className="chat-header__call-btn"
            aria-label="Voice call"
            disabled={busy}
            onClick={() => startCall("voice", partner)}
          >
            ❤️
          </button>
          <button
            className="chat-header__call-btn"
            aria-label="Video call"
            disabled={busy}
            onClick={() => startCall("video", partner)}
          >
            🎥
          </button>
        </div>
      )}
    </div>
  );
};

export default ChatHeader;
