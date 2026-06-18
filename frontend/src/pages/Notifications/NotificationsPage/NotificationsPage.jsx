import { useState, useEffect, useMemo } from "react";
import { useNotificationsCtx } from "../../../context/NotificationsContext";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  deleteNotification,
} from "../../../services/notifications.service";
import NotificationGroup from "../../../components/notifications/NotificationGroup/NotificationGroup";
import EmptyNotifications from "../../../components/notifications/EmptyNotifications/EmptyNotifications";
import BackHeader from "../../../components/common/BackHeader/BackHeader";
import "./NotificationsPage.css";

// ─── Date grouping ────────────────────────────────────────────────────────────

const MS_DAY = 86_400_000;

const groupByDate = (list) => {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart - MS_DAY);
  const weekStart = new Date(todayStart - todayStart.getDay() * MS_DAY);
  const lastWeekStart = new Date(weekStart - 7 * MS_DAY);

  const ORDER = ["Today", "Yesterday", "Earlier This Week", "Last Week", "Earlier"];
  const map = {};

  list.forEach((n) => {
    const d = new Date(n.createdAt);
    let label;
    if (d >= todayStart) label = "Today";
    else if (d >= yesterdayStart) label = "Yesterday";
    else if (d >= weekStart) label = "Earlier This Week";
    else if (d >= lastWeekStart) label = "Last Week";
    else label = "Earlier";
    (map[label] = map[label] || []).push(n);
  });

  return ORDER.filter((k) => map[k]).map((k) => ({ label: k, items: map[k] }));
};

// ─── Loading skeleton ─────────────────────────────────────────────────────────

const Skeleton = () => (
  <div className="notif-pg__skeletons">
    {[80, 65, 90, 70].map((w, i) => (
      <div key={i} className="notif-sk">
        <div className="notif-sk__icon" />
        <div className="notif-sk__body">
          <div className="notif-sk__line" style={{ width: `${w}%` }} />
          <div className="notif-sk__line notif-sk__line--msg" style={{ width: `${w - 15}%` }} />
          <div className="notif-sk__line notif-sk__line--time" />
        </div>
      </div>
    ))}
  </div>
);

// ─── Page ─────────────────────────────────────────────────────────────────────

const NotificationsPage = () => {
  const { setUnreadCount } = useNotificationsCtx();

  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  // Fetch on mount
  useEffect(() => {
    getNotifications(1, 50)
      .then((res) => setNotifications(res.data || []))
      .catch(() => setNotifications([]))
      .finally(() => setLoading(false));
  }, []);

  // Keep badge in sync with local state
  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.isRead).length,
    [notifications]
  );

  useEffect(() => {
    setUnreadCount(unreadCount);
  }, [unreadCount, setUnreadCount]);

  // ─── Handlers ──────────────────────────────────────────────────────────────

  const handleRead = (id) => {
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
    );
    markNotificationRead(id).catch(() => {
      // Rollback on failure
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: false } : n))
      );
    });
  };

  const handleDelete = (id) => {
    const target = notifications.find((n) => n._id === id);
    if (!target) return;
    const snapshot = notifications;

    setNotifications((prev) => prev.filter((n) => n._id !== id));

    deleteNotification(id).catch(() => {
      setNotifications(snapshot);
    });
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    await markAllNotificationsRead().catch(() => {});
    setMarkingAll(false);
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  const groups = groupByDate(notifications);

  return (
    <div className="notif-pg">
      <BackHeader
        title="Notifications"
        subtitle={
          loading
            ? undefined
            : unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount > 1 ? "s" : ""}`
              : "All caught up"
        }
        right={
          !loading && unreadCount > 0 ? (
            <button
              className="notif-pg__mark-all-btn"
              onClick={handleMarkAllRead}
              disabled={markingAll}
            >
              {markingAll ? "Marking…" : "Mark all read"}
            </button>
          ) : null
        }
      />
      <div className="notif-pg__content">

        {/* Content */}
        {loading ? (
          <Skeleton />
        ) : notifications.length === 0 ? (
          <EmptyNotifications />
        ) : (
          <div className="notif-pg__groups">
            {groups.map((g) => (
              <NotificationGroup
                key={g.label}
                label={g.label}
                items={g.items}
                onRead={handleRead}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  );
};

export default NotificationsPage;
