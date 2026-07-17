import { useState, useEffect } from "react";
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

// ─── Category filter (mirror of the backend notification categories) ─────────

const CATEGORY_META = [
  { key: "all", label: "All", emoji: "✨" },
  { key: "ai", label: "AI", emoji: "🧠" },
  { key: "relationship", label: "Relationship", emoji: "💞" },
  { key: "mood", label: "Mood", emoji: "😊" },
  { key: "chat", label: "Chat", emoji: "💬" },
  { key: "stories", label: "Stories", emoji: "📷" },
  { key: "memories", label: "Memories", emoji: "📔" },
  { key: "goals", label: "Goals", emoji: "🎯" },
  { key: "calls", label: "Calls", emoji: "📞" },
  { key: "security", label: "Security", emoji: "🛡" },
];

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
  const [category, setCategory] = useState("all");
  // How many were unread when the page opened — used only for the page header
  // copy ("N unread"). The badge itself is cleared the moment the page opens.
  const [openedUnread, setOpenedUnread] = useState(0);

  // Fetch on mount, then auto-mark-all-read: opening the Notifications screen IS
  // viewing them, so the badge clears immediately (and syncs across devices via
  // the server's notification:read-all socket event). This was the badge bug —
  // previously the count lingered until the explicit "Mark all read" tap.
  useEffect(() => {
    let active = true;
    getNotifications(1, 50)
      .then((res) => {
        if (!active) return;
        const list = res.data || [];
        const unread = list.filter((n) => !n.isRead).length;
        setNotifications(list);
        setOpenedUnread(unread);
        // Clear the badge right away; persist on the server best-effort.
        if (unread > 0) {
          setUnreadCount(0);
          markAllNotificationsRead().catch(() => {});
        }
      })
      .catch(() => {
        if (active) setNotifications([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [setUnreadCount]);

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

  // ─── Render ────────────────────────────────────────────────────────────────

  // Only offer categories that actually exist in the list (plus "All").
  const present = new Set(notifications.map((n) => n.category || "system"));
  const chips = CATEGORY_META.filter((c) => c.key === "all" || present.has(c.key));

  const visible =
    category === "all"
      ? notifications
      : notifications.filter((n) => (n.category || "system") === category);

  const groups = groupByDate(visible);

  return (
    <div className="notif-pg">
      <BackHeader
        title="Notifications"
        subtitle={
          loading
            ? undefined
            : openedUnread > 0
              ? `${openedUnread} new notification${openedUnread > 1 ? "s" : ""}`
              : "All caught up"
        }
      />
      <div className="notif-pg__content">

        {/* Category filter */}
        {!loading && notifications.length > 0 && chips.length > 2 && (
          <div className="notif-pg__filters" role="tablist" aria-label="Notification categories">
            {chips.map((c) => (
              <button
                key={c.key}
                role="tab"
                aria-selected={category === c.key}
                className={`notif-pg__filter ${category === c.key ? "notif-pg__filter--active" : ""}`}
                onClick={() => setCategory(c.key)}
              >
                {c.emoji} {c.label}
              </button>
            ))}
          </div>
        )}

        {/* Content */}
        {loading ? (
          <Skeleton />
        ) : notifications.length === 0 ? (
          <EmptyNotifications />
        ) : visible.length === 0 ? (
          <p className="notif-pg__none">Nothing in this category yet.</p>
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

        <p className="notif-pg__privacy">
          🔒 AI notifications are based only on activity inside CoupleCare —
          never on other apps, messages, or your device.
        </p>
      </div>
    </div>
  );
};

export default NotificationsPage;
