import { useState } from "react";
import { useNavigate } from "react-router-dom";
import "./NotificationCard.css";

const TYPE_CONFIG = {
  mood_reminder: {
    emoji: "😊",
    color: "#ffaa00",
    bg: "rgba(255, 170, 0, 0.12)",
  },
  memory_reminder: {
    emoji: "📸",
    color: "#7c5cff",
    bg: "rgba(124, 92, 255, 0.12)",
  },
  anniversary_reminder: {
    emoji: "💕",
    color: "#ff5c8a",
    bg: "rgba(255, 92, 138, 0.12)",
  },
  weekly_summary_ready: {
    emoji: "📊",
    color: "#32c36c",
    bg: "rgba(50, 195, 108, 0.12)",
  },
  relationship_milestone: {
    emoji: "🎉",
    color: "#ff7043",
    bg: "rgba(255, 112, 67, 0.12)",
  },
  // ── AI Relationship Assistant ──
  ai_insight: { emoji: "🧠", color: "#7c5cff", bg: "rgba(124, 92, 255, 0.12)" },
  behaviour_change: { emoji: "📉", color: "#ff5c8a", bg: "rgba(255, 92, 138, 0.12)" },
  positive_progress: { emoji: "🌟", color: "#32c36c", bg: "rgba(50, 195, 108, 0.12)" },
  activity_drop: { emoji: "💬", color: "#ffaa00", bg: "rgba(255, 170, 0, 0.12)" },
  conversation_reminder: { emoji: "💬", color: "#4a90d9", bg: "rgba(74, 144, 217, 0.12)" },
  story_reminder: { emoji: "📷", color: "#7c5cff", bg: "rgba(124, 92, 255, 0.12)" },
  reflection_reminder: { emoji: "🪞", color: "#ff5c8a", bg: "rgba(255, 92, 138, 0.12)" },
  date_night_suggestion: { emoji: "💡", color: "#ff7043", bg: "rgba(255, 112, 67, 0.12)" },
  good_morning: { emoji: "☀️", color: "#ffaa00", bg: "rgba(255, 170, 0, 0.12)" },
  good_night: { emoji: "🌙", color: "#7c5cff", bg: "rgba(124, 92, 255, 0.12)" },
  coach_recommendation: { emoji: "🧭", color: "#32c36c", bg: "rgba(50, 195, 108, 0.12)" },
  partner_mood_alert: { emoji: "💛", color: "#ffaa00", bg: "rgba(255, 170, 0, 0.12)" },
  streak_reminder: { emoji: "🔥", color: "#ff7043", bg: "rgba(255, 112, 67, 0.12)" },
  achievement_unlocked: { emoji: "🏆", color: "#32c36c", bg: "rgba(50, 195, 108, 0.12)" },
  bucket_completed: { emoji: "🎯", color: "#32c36c", bg: "rgba(50, 195, 108, 0.12)" },
  daily_moment_ready: { emoji: "❤️", color: "#ff5c8a", bg: "rgba(255, 92, 138, 0.12)" },
  system: {
    emoji: "🔔",
    color: "#4a90d9",
    bg: "rgba(74, 144, 217, 0.12)",
  },
};

// Mirror of the backend URL_FOR_TYPE — tapping a notification deep-links to
// the surface it's about.
const URL_FOR_TYPE = {
  partner_mood_alert: "/mood-analytics",
  mood_reminder: "/moods",
  memory_reminder: "/memories",
  anniversary_reminder: "/journey",
  relationship_milestone: "/journey",
  weekly_summary_ready: "/ai",
  achievement_unlocked: "/journey",
  bucket_completed: "/bucket-list",
  love_letter_received: "/ai-center",
  sleep_reminder: "/sleep",
  moment_new: "/moments",
  moment_viewed: "/moments",
  moment_reaction: "/moments",
  couple_moment_ready: "/moments",
  daily_moment_ready: "/our-day",
  growth_reminder: "/growth",
  journal_reminder: "/journal",
  challenge_ready: "/growth",
  summary_ready: "/summary",
  ai_insight: "/timeline",
  behaviour_change: "/ai-center",
  activity_drop: "/chat",
  conversation_reminder: "/chat",
  story_reminder: "/moments",
  reflection_reminder: "/reflection",
  date_night_suggestion: "/explore",
  good_night: "/reflection",
  coach_recommendation: "/ai-center",
};

const formatRelTime = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(iso)
  );
};

const NotificationCard = ({ notification, onRead, onDelete }) => {
  const navigate = useNavigate();
  const [removing, setRemoving] = useState(false);
  const [showWhy, setShowWhy] = useState(false);
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system;

  const handleDelete = (e) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => onDelete(notification._id), 300);
  };

  const handleClick = () => {
    if (!notification.isRead) onRead(notification._id);
    const url = URL_FOR_TYPE[notification.type];
    if (url) navigate(url);
  };

  const toggleWhy = (e) => {
    e.stopPropagation();
    setShowWhy((v) => !v);
  };

  return (
    <div className={`notif-card-wrap ${removing ? "notif-card-wrap--gone" : ""}`}>
      <div
        className={`notif-card ${notification.isRead ? "" : "notif-card--unread"} ${
          notification.priority === "high" ? "notif-card--high" : ""
        }`}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick()}
        aria-label={notification.title}
      >
        {/* Type icon */}
        <div
          className="notif-card__icon"
          style={{ background: cfg.bg }}
          aria-hidden="true"
        >
          <span className="notif-card__emoji">{cfg.emoji}</span>
        </div>

        {/* Body */}
        <div className="notif-card__body">
          <div className="notif-card__row-top">
            <span className="notif-card__title">
              {!notification.isRead && (
                <span className="notif-card__unread-dot" aria-hidden="true" />
              )}
              {notification.title}
            </span>
            <button
              className="notif-card__del-btn"
              onClick={handleDelete}
              aria-label="Delete notification"
              tabIndex={0}
            >
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                <path
                  d="M1 1L12 12M12 1L1 12"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>

          {notification.subtitle && (
            <span className="notif-card__subtitle">{notification.subtitle}</span>
          )}

          <p className="notif-card__msg">{notification.message}</p>

          <div className="notif-card__row-bottom">
            <span className="notif-card__time">{formatRelTime(notification.createdAt)}</span>
            {notification.aiExplanation && (
              <button className="notif-card__why-btn" onClick={toggleWhy}>
                {showWhy ? "Hide" : "Why am I seeing this?"}
              </button>
            )}
          </div>

          {showWhy && notification.aiExplanation && (
            <p className="notif-card__why">{notification.aiExplanation}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;
