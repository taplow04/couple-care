import "./EmptyNotifications.css";

const EmptyNotifications = () => (
  <div className="empty-notif">
    <div className="empty-notif__graphic" aria-hidden="true">
      <div className="empty-notif__ring empty-notif__ring--outer" />
      <div className="empty-notif__ring empty-notif__ring--inner" />
      <span className="empty-notif__emoji">🔔</span>
    </div>
    <h3 className="empty-notif__title">You're all caught up!</h3>
    <p className="empty-notif__sub">
      No notifications right now. We'll let you know when something needs your attention.
    </p>
  </div>
);

export default EmptyNotifications;
