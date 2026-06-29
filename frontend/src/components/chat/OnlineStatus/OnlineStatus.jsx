import "./OnlineStatus.css";

// Compact relative "last seen" — e.g. "last seen just now / 5m ago / 3h ago /
// yesterday / 12 Jun".
const formatLastSeen = (lastSeen) => {
  if (!lastSeen) return "Offline";
  const then = new Date(lastSeen).getTime();
  if (isNaN(then)) return "Offline";

  const diffMs = Date.now() - then;
  const min = Math.floor(diffMs / 60000);

  if (min < 1) return "last seen just now";
  if (min < 60) return `last seen ${min}m ago`;

  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `last seen ${hrs}h ago`;

  const days = Math.floor(hrs / 24);
  if (days === 1) return "last seen yesterday";
  if (days < 7) return `last seen ${days}d ago`;

  return `last seen ${new Date(lastSeen).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
  })}`;
};

/**
 * Partner status line. Priority: typing > in-call > AI mood (when available) >
 * online > last seen. The dot still reflects presence (online/offline) while the
 * text can surface the partner's estimated current mood ("😊 Feeling Happy"),
 * which updates live with no manual refresh. Backwards compatible: with only the
 * legacy `connected` prop it behaves like before.
 *
 * @param {object} mood  optional partner AI-mood DTO { emoji, display, ... }
 */
const OnlineStatus = ({ online, lastSeen, inCall, typing, connected, mood }) => {
  const isOnline = online ?? connected ?? false;

  let modifier;
  let text;
  let emoji = null;

  if (typing) {
    modifier = "online-status--typing";
    text = "typing…";
  } else if (inCall) {
    modifier = "online-status--incall";
    text = "In call";
  } else if (mood?.display) {
    // Show the estimated mood, keeping the presence colour via the dot.
    modifier = isOnline ? "online-status--online" : "online-status--mood";
    text = mood.display; // e.g. "Feeling Happy"
    emoji = mood.emoji;
  } else if (isOnline) {
    modifier = "online-status--online";
    text = "Online";
  } else {
    modifier = "online-status--offline";
    text = formatLastSeen(lastSeen);
  }

  return (
    <div className={`online-status ${modifier}`}>
      {emoji ? (
        <span className="online-status__mood-emoji" aria-hidden="true">{emoji}</span>
      ) : (
        <span className="online-status__dot" />
      )}
      <span className="online-status__text">{text}</span>
    </div>
  );
};

export default OnlineStatus;
