import { useState } from "react";
import "./ChatAiCard.css";

/**
 * Compact, expandable AI strip under the chat header's identity row.
 *
 * DEFAULT (always visible, ~1 line): the partner's AI-estimated mood
 * (😊 Feeling Calm) + a subtle "AI Insight" toggle. Keeps the header close to a
 * WhatsApp/Instagram header height so the conversation stays primary.
 *
 * EXPANDED (on demand): a panel with confidence, the supportive AI Conversation
 * Guide, and the "Why?" reasons — all from the existing AI Mood Engine. The
 * open/closed preference is remembered in localStorage.
 *
 * Mood comes from the AI Mood Engine ONLY (manual/story moods stay independent).
 */

const MOOD_MIN_CONFIDENCE = 40;
const STORAGE_KEY = "cc-chat-ai-expanded";

// Supportive, non-alarming conversation guidance per AI mood (valence fallback).
const GUIDE = {
  loved: "Keep the warmth going — a little appreciation today goes a long way 💕",
  happy: "Your partner seems happy today. Ask about the best part of their day ❤️",
  excited: "Your partner looks excited. Ask what made today special ✨",
  content: "Your partner seems content. Keep the good energy going 🙂",
  calm: "Everything feels calm. Share a little about your day 🌿",
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

// Resolve what to display. { hidden } when the partner made their mood private.
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
    display: mood.display, // "Feeling Calm"
    confidence: Math.round(mood.confidence || 0),
    valence: mood.valence || "neutral",
    moodType: mood.moodType,
    reasons: mood.reasons || [],
    key: mood.moodType,
  };
};

const readPref = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

const ChatAiCard = ({ moodState, onProfile }) => {
  const m = resolveMood(moodState);
  // Default collapsed (chat-first); honour the remembered preference.
  const [expanded, setExpanded] = useState(readPref);

  const toggle = () =>
    setExpanded((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        /* private mode / storage off — non-fatal */
      }
      return next;
    });

  if (m.hidden) return null; // privacy — partner hid their mood

  const guide = guideFor(m.moodType, m.valence, m.updating);
  const reasons = m.reasons?.length ? m.reasons : null;

  const onMoodKey = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onProfile?.();
    }
  };

  return (
    <div className="chat-ai" data-valence={m.valence}>
      {/* ── Compact strip (always visible) ── */}
      <div className="chat-ai__strip">
        <div
          className="chat-ai__mood"
          role="button"
          tabIndex={0}
          onClick={onProfile}
          onKeyDown={onMoodKey}
          aria-label="View partner profile"
        >
          <span className="chat-ai__emoji" key={`e-${m.key}`} aria-hidden="true">
            {m.emoji}
          </span>
          <span className="chat-ai__feeling" key={`f-${m.key}`}>
            {m.display}
          </span>
        </div>

        <button
          type="button"
          className="chat-ai__toggle"
          onClick={toggle}
          aria-expanded={expanded}
          aria-label={expanded ? "Hide AI insight" : "Show AI insight"}
        >
          <span className="chat-ai__toggle-spark" aria-hidden="true">✨</span>
          <span className="chat-ai__toggle-text">AI Insight</span>
          <svg
            className={`chat-ai__chev${expanded ? " chat-ai__chev--open" : ""}`}
            width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* ── Expandable panel (on demand) ── */}
      <div className={`chat-ai__panelwrap${expanded ? " is-open" : ""}`} aria-hidden={!expanded}>
        <div className="chat-ai__panel">
          {!m.updating && (
            <div className="chat-ai__conf">
              <div className="chat-ai__conf-row">
                <span className="chat-ai__conf-label">Confidence</span>
                <span className="chat-ai__conf-val">{m.confidence}%</span>
              </div>
              <div className="chat-ai__conf-track">
                <div className="chat-ai__conf-fill" style={{ width: `${m.confidence}%` }} />
              </div>
            </div>
          )}

          <div className="chat-ai__guide">
            <span className="chat-ai__guide-label">💡 AI Conversation Guide</span>
            <p className="chat-ai__guide-text" key={guide}>{guide}</p>
          </div>

          {!m.updating && reasons && (
            <div className="chat-ai__why">
              <span className="chat-ai__why-label">Why?</span>
              <ul className="chat-ai__reasons">
                {reasons.map((r) => (
                  <li key={r} className="chat-ai__reason">
                    <span className="chat-ai__reason-dot" aria-hidden="true" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatAiCard;
