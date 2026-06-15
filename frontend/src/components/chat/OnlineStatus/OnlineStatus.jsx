import "./OnlineStatus.css";

const OnlineStatus = ({ connected }) => (
  <div className={`online-status ${connected ? "online-status--online" : ""}`}>
    <span className="online-status__dot" />
    <span className="online-status__text">{connected ? "Online" : "Connecting..."}</span>
  </div>
);

export default OnlineStatus;
