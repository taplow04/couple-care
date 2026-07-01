import "./SessionCard.css";

const ICONS = {
  mobile: "📱",
  tablet: "📱",
  desktop: "💻",
  unknown: "🖥️",
};

// Compact relative time: "just now", "5 min ago", "3 h ago", "Yesterday", date.
const timeAgo = (value) => {
  if (!value) return "—";
  const then = new Date(value).getTime();
  const diff = Date.now() - then;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "Active now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} h ago`;
  const day = Math.floor(hr / 24);
  if (day === 1) return "Yesterday";
  if (day < 7) return `${day} days ago`;
  return new Date(value).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
};

const SessionCard = ({ session, onRevoke }) => {
  const icon = ICONS[session.deviceType] || ICONS.unknown;

  return (
    <div className={`sess-card ${session.current ? "is-current" : ""}`}>
      <div className="sess-card__icon" aria-hidden="true">{icon}</div>

      <div className="sess-card__body">
        <div className="sess-card__head">
          <span className="sess-card__device">{session.device}</span>
          {session.current && <span className="sess-card__badge">This device</span>}
        </div>

        <div className="sess-card__meta">
          {[session.browser, session.os].filter(Boolean).join(" · ")}
        </div>

        <div className="sess-card__meta sess-card__meta--muted">
          {session.location || "Location unavailable"}
          {session.ipMasked ? ` · ${session.ipMasked}` : ""}
        </div>

        <div className="sess-card__time">
          {session.current ? "Active now" : timeAgo(session.lastActive)}
        </div>
      </div>

      {!session.current && (
        <button
          type="button"
          className="sess-card__revoke"
          onClick={() => onRevoke?.(session)}
        >
          Log out
        </button>
      )}
    </div>
  );
};

export default SessionCard;
