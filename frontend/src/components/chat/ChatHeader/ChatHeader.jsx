import { useNavigate } from "react-router-dom";
import OnlineStatus from "../OnlineStatus/OnlineStatus";
import { useCall } from "../../../context/CallContext";
import { usePartnerPresence } from "../../../hooks/usePartnerPresence";
import { getFirstName } from "../../../utils/getFirstName";
import "./ChatHeader.css";

const ChatHeader = ({ partner, partnerTyping }) => {
  const navigate = useNavigate();
  const { canCall, startCall, callState } = useCall();
  const presence = usePartnerPresence(partner?._id);
  const initial = partner?.name ? partner.name[0].toUpperCase() : "♥";

  // Disable while a call is already in progress to avoid double-initiating.
  const busy = callState !== "idle";

  const openPartner = () => navigate("/partner");

  const goBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === "number" && idx > 0) navigate(-1);
    else navigate("/dashboard", { replace: true });
  };

  return (
    <div className="chat-header">
      <button className="chat-header__back" onClick={goBack} aria-label="Go back">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M15 18L9 12L15 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <button
        className="chat-header__partner"
        onClick={openPartner}
        aria-label="View partner profile"
      >
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
          <h2 className="chat-header__name">{getFirstName(partner?.name, "Your Partner")}</h2>
          <OnlineStatus
            online={presence.online}
            lastSeen={presence.lastSeen}
            inCall={presence.inCall}
            typing={partnerTyping}
          />
        </div>
      </button>

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
