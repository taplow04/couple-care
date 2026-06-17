import { useNavigate } from "react-router-dom";
import { useNotificationsCtx } from "../../../context/NotificationsContext";
import "./NotificationBell.css";

const BellIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
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
 * Global floating notification bell (top-right). Shown on every main page so
 * notifications are always reachable now that "Alerts" was removed from the
 * bottom nav. Pages have left-aligned headers/back buttons, so a right-aligned
 * bell doesn't collide.
 */
const NotificationBell = () => {
  const navigate = useNavigate();
  const { unreadCount } = useNotificationsCtx();
  const badgeCount = Math.min(unreadCount, 99);

  return (
    <button
      className="notif-bell"
      onClick={() => navigate("/notifications")}
      aria-label={`Notifications${badgeCount > 0 ? `, ${badgeCount} unread` : ""}`}
    >
      <BellIcon />
      {badgeCount > 0 && (
        <span className="notif-bell__badge" aria-hidden="true">
          {badgeCount > 9 ? "9+" : badgeCount}
        </span>
      )}
    </button>
  );
};

export default NotificationBell;
