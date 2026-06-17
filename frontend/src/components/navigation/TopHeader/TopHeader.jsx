import { useNavigate } from "react-router-dom";
import { useNotificationsCtx } from "../../../context/NotificationsContext";
import "./TopHeader.css";

const ChatIcon = () => (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
    <path
      d="M21 11.5a8.38 8.38 0 0 1-8.5 8.5 8.5 8.5 0 0 1-3.8-.9L3 21l1.9-5.7a8.5 8.5 0 0 1-.9-3.8A8.38 8.38 0 0 1 12.5 3 8.38 8.38 0 0 1 21 11.5z"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const BellIcon = () => (
  <svg width="23" height="23" viewBox="0 0 24 24" fill="none">
    <path
      d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M13.73 21a2 2 0 0 1-3.46 0"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

/**
 * App-like top bar: brand on the left; quick chat, notifications (with unread
 * badge) and the user's own avatar on the right. Since CoupleCare is 1:1, the
 * chat icon opens the partner chat directly (no chat list).
 */
const TopHeader = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotificationsCtx();
  const badgeCount = Math.min(unreadCount, 99);

  return (
    <header className="top-header">
      <button
        className="top-header__brand"
        onClick={() => navigate("/dashboard")}
        aria-label="CoupleCare home"
      >
        <span className="top-header__logo">💞</span>
        <span className="top-header__name">CoupleCare</span>
      </button>

      <div className="top-header__actions">
        <button
          className="top-header__icon-btn"
          onClick={() => navigate("/chat")}
          aria-label="Chat with partner"
        >
          <ChatIcon />
        </button>

        <button
          className="top-header__icon-btn"
          onClick={() => navigate("/notifications")}
          aria-label={`Notifications${badgeCount > 0 ? `, ${badgeCount} unread` : ""}`}
        >
          <BellIcon />
          {badgeCount > 0 && (
            <span className="top-header__badge" aria-hidden="true">
              {badgeCount > 9 ? "9+" : badgeCount}
            </span>
          )}
        </button>
      </div>
    </header>
  );
};

export default TopHeader;
