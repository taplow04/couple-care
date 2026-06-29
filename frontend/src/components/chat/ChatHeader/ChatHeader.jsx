import { useState } from "react";
import { useNavigate } from "react-router-dom";
import OnlineStatus from "../OnlineStatus/OnlineStatus";
import ChatAiCard from "../ChatAiCard/ChatAiCard";
import MoodWhySheet from "../MoodWhySheet/MoodWhySheet";
import { useCall } from "../../../context/CallContext";
import { usePartnerPresence } from "../../../hooks/usePartnerPresence";
import { usePartnerAiMood } from "../../../hooks/useAiMood";
import { getFirstName } from "../../../utils/getFirstName";
import "./ChatHeader.css";

/**
 * Premium AI Relationship Header — the emotional control center of a chat.
 *  • Section 1: back, profile (avatar + name + live activity status) — entirely
 *    clickable → Partner Profile; plus the existing voice/video call buttons.
 *  • Section 2: the AI Information Card (ChatAiCard) — partner's AI-estimated
 *    current mood (from the AI Mood Engine only) + a supportive Conversation
 *    Guide, with a "Why?" transparency sheet.
 *
 * Presence + mood update live over the SHARED socket (usePartnerPresence /
 * usePartnerAiMood) — no extra polling, no duplicated logic.
 */
const ChatHeader = ({ partner, partnerTyping }) => {
  const navigate = useNavigate();
  const { canCall, startCall, callState } = useCall();
  const presence = usePartnerPresence(partner?._id);
  const moodState = usePartnerAiMood(partner?._id);
  const [whyOpen, setWhyOpen] = useState(false);
  const initial = partner?.name ? partner.name[0].toUpperCase() : "♥";
  const partnerFirst = getFirstName(partner?.name, "Your Partner");

  // Disable while a call is already in progress to avoid double-initiating.
  const busy = callState !== "idle";

  const openPartner = () => navigate("/partner");

  const goBack = () => {
    const idx = window.history.state?.idx;
    if (typeof idx === "number" && idx > 0) navigate(-1);
    else navigate("/dashboard", { replace: true });
  };

  return (
    <div className="chat-header-shell">
      {/* ── Section 1: identity + presence + calls ── */}
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
            <h2 className="chat-header__name">{partnerFirst}</h2>
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

      {/* ── Section 2: AI Information Card ── */}
      <ChatAiCard
        moodState={moodState}
        onProfile={openPartner}
        onWhy={() => setWhyOpen(true)}
      />

      <MoodWhySheet
        open={whyOpen}
        mood={moodState.mood}
        name={partnerFirst}
        onClose={() => setWhyOpen(false)}
      />
    </div>
  );
};

export default ChatHeader;
