import { useState } from "react";
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
  system: {
    emoji: "🔔",
    color: "#4a90d9",
    bg: "rgba(74, 144, 217, 0.12)",
  },
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
  const [removing, setRemoving] = useState(false);
  const cfg = TYPE_CONFIG[notification.type] ?? TYPE_CONFIG.system;

  const handleDelete = (e) => {
    e.stopPropagation();
    setRemoving(true);
    setTimeout(() => onDelete(notification._id), 300);
  };

  const handleClick = () => {
    if (!notification.isRead) onRead(notification._id);
  };

  return (
    <div className={`notif-card-wrap ${removing ? "notif-card-wrap--gone" : ""}`}>
      <div
        className={`notif-card ${notification.isRead ? "" : "notif-card--unread"}`}
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

          <p className="notif-card__msg">{notification.message}</p>

          <span className="notif-card__time">{formatRelTime(notification.createdAt)}</span>
        </div>
      </div>
    </div>
  );
};

export default NotificationCard;
