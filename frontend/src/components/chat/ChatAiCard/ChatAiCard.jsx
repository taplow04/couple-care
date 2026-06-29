import "./ChatAiCard.css";

/**
 * Section 2 of the premium chat header — the AI Information Card.
 * Shows the partner's AI-estimated Current Mood (from the existing AI Mood Engine
 * ONLY — never the manual/story mood) plus a supportive AI Conversation Guide.
 *
 * - Tapping the mood area opens the Partner Profile (Instagram-style).
 * - The "Why?" chip opens the transparency bottom sheet (onWhy).
 * - Below the configured confidence threshold, or while loading, it shows
 *   "🤖 Mood updating…" instead of asserting an inaccurate mood.
 * - Hidden entirely when the partner has made their mood private.
 */

// Mirror of the engine's confidence gate for the header surface.
const MOOD_MIN_CONFIDENCE = 40;

// Supportive, non-alarming conversation guidance per AI mood. Keyed by the
// engine's mood vocabulary, with a valence fallback for anything unmapped.
const GUIDE = {
  loved: "Keep the warmth going — a little appreciation today goes a long way 💕",
  happy: "Your partner seems happy today. Ask about the best part of their day ❤️",
  excited: "Your partner looks excited. Ask what made today special ✨",
  content: "Your partner seems content. Keep the good energy going 🙂",
  calm: "Everything feels calm. Share a bit of your day together 🌿",
  peaceful: "A peaceful moment — a gentle check-in would be lovely 🌸",
  neutral: "Start a warm conversation and see how their day is going 💬",
  stressed: "Recent interactions suggest some stress. A caring conversation may help 🤍",
  anxious: "Your partner may feel a little anxious. A reassuring message could help 🤍",
  sad: "Your partner may appreciate some support today. A small check-in could mean a lot 💗",
  low: "Your partner may appreciate some support today. A small check-in could mean a lot 💗",
  angry: "Recent interactions suggest some frustration. Approach the conversation gently 🤍",
  tired: "Your partner seems tired. Keep things light and comforting 🌙",
  thoughtful: "Your partner seems thoughtful today. A meaningful question could open up 💭",
};

const VALENCE_GUIDE = {
  positive: "Things feel good — keep the warmth going ❤️",
  neutral: "Start a warm conversation and see how their day is going 💬",
  low: "A gentle, caring check-in could mean a lot today 🤍",
};

const guideFor = (moodType, valence, updating) => {
  if (updating) return "Say hello and start a warm conversation 💬";
  return GUIDE[moodType] || VALENCE_GUIDE[valence] || VALENCE_GUIDE.neutral;
};

// Resolve what to display. Returns { hidden } when the partner hid their mood.
const resolveMood = ({ mood, available, loading }) => {
  if (loading) {
    return { updating: true, emoji: "🤖", display: "Mood updating…", valence: "neutral", key: "updating" };
  }
  if (!available || !mood) return { hidden: true };
  if ((mood.confidence || 0) < MOOD_MIN_CONFIDENCE) {
    return { updating: true, emoji: "🤖", display: "Mood updating…", valence: "neutral", key: "updating" };
  }
  return {
    updating: false,
    emoji: mood.emoji,
    display: mood.display, // "Feeling Excited"
    confidence: Math.round(mood.confidence || 0),
    valence: mood.valence || "neutral",
    moodType: mood.moodType,
    key: mood.moodType,
  };
};

const ChatAiCard = ({ moodState, onProfile, onWhy }) => {
  const m = resolveMood(moodState);
  if (m.hidden) return null; // privacy — partner hid their mood

  const guide = guideFor(m.moodType, m.valence, m.updating);

  const onMoodKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onProfile?.();
    }
  };

  return (
    <div className="chat-ai-card" data-valence={m.valence}>
      {/* Current mood — clickable → partner profile */}
      <div
        className="chat-ai-card__mood"
        role="button"
        tabIndex={0}
        onClick={onProfile}
        onKeyDown={onMoodKey}
        aria-label="View partner profile"
      >
        <span className="chat-ai-card__emoji" key={`e-${m.key}`} aria-hidden="true">
          {m.emoji}
        </span>
        <div className="chat-ai-card__mood-text">
          <span className="chat-ai-card__eyebrow">Current Mood</span>
          <span className="chat-ai-card__feeling" key={`f-${m.key}`}>
            {m.display}
          </span>
          {!m.updating && (
            <span className="chat-ai-card__conf" key={`c-${m.key}-${m.confidence}`}>
              Confidence • {m.confidence}%
            </span>
          )}
        </div>

        {!m.updating && (
          <button
            type="button"
            className="chat-ai-card__why"
            onClick={(e) => {
              e.stopPropagation();
              onWhy?.();
            }}
            aria-label="Why this mood?"
          >
            Why?
          </button>
        )}
      </div>

      <div className="chat-ai-card__divider" aria-hidden="true" />

      {/* AI Conversation Guide */}
      <div className="chat-ai-card__guide">
        <span className="chat-ai-card__guide-label">💡 AI Conversation Guide</span>
        <p className="chat-ai-card__guide-text" key={guide}>
          {guide}
        </p>
      </div>
    </div>
  );
};

export default ChatAiCard;
