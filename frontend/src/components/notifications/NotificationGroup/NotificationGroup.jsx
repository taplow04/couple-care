import NotificationCard from "../NotificationCard/NotificationCard";
import "./NotificationGroup.css";

const NotificationGroup = ({ label, items, onRead, onDelete }) => (
  <section className="notif-group">
    <h3 className="notif-group__label">{label}</h3>
    <div className="notif-group__list">
      {items.map((n) => (
        <NotificationCard
          key={n._id}
          notification={n}
          onRead={onRead}
          onDelete={onDelete}
        />
      ))}
    </div>
  </section>
);

export default NotificationGroup;
