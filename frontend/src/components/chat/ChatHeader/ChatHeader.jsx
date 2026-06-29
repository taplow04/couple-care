import { useNavigate } from "react-router-dom";
import OnlineStatus from "../OnlineStatus/OnlineStatus";
import { useCall } from "../../../context/CallContext";
import { usePartnerPresence } from "../../../hooks/usePartnerPresence";
import { usePartnerAiMood } from "../../../hooks/useAiMood";
import { getFirstName } from "../../../utils/getFirstName";
import "./ChatHeader.css";

// Below this confidence we don't assert a mood — show a gentle "updating" state
// rather than risk an inaccurate feeling.
const MOOD_MIN_CONFIDENCE = 40;

// Resolve the mood line to render below the activity status. Returns null only
// when the partner has hidden their moods (privacy) — otherwise it always shows
// something ("Mood updating…" while loading / low-confidence).
const resolveMoodLine = ({ mood, available, loading }) => {
  if (loading) {
    return { emoji: "🤖", text: "Mood updating…", valence: "neutral", key: "updating" };
  }
  if (!available || !mood) return null; // hidden by partner → no line
  if ((mood.confidence || 0) < MOOD_MIN_CONFIDENCE) {
    return { emoji: "🤖", text: "Mood updating…", valence: "neutral", key: "updating" };
  }
  return {
    emoji: mood.emoji,
    text: mood.display, // "Feeling Happy"
    valence: mood.valence || "neutral",
    key: mood.moodType, // changes when the mood changes → drives the fade
  };
};

const ChatHeader = ({ partner, partnerTyping }) => {
  const navigate = useNavigate();
  const { canCall, startCall, callState } = useCall();
  const presence = usePartnerPresence(partner?._id);
  const moodState = usePartnerAiMood(partner?._id);
  const moodLine = resolveMoodLine(moodState);
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
          {moodLine && (
            <div className="chat-header__mood" data-valence={moodLine.valence}>
              {/* keyed so React remounts on mood change → smooth fade, no abrupt swap */}
              <span key={moodLine.key} className="chat-header__mood-inner">
                <span className="chat-header__mood-emoji" aria-hidden="true">
                  {moodLine.emoji}
                </span>
                <span className="chat-header__mood-text">{moodLine.text}</span>
              </span>
            </div>
          )}
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
