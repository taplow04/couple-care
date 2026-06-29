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
 * Partner ACTIVITY-status line. Priority: typing > in-call > online > last seen.
 * The AI current mood is now shown on its OWN line in ChatHeader (below this), so
 * this component is purely presence. Backwards compatible: with only the legacy
 * `connected` prop it behaves like before.
 */
const OnlineStatus = ({ online, lastSeen, inCall, typing, connected }) => {
  const isOnline = online ?? connected ?? false;

  let modifier;
  let text;

  if (typing) {
    modifier = "online-status--typing";
    text = "typing…";
  } else if (inCall) {
    modifier = "online-status--incall";
    text = "In call";
  } else if (isOnline) {
    modifier = "online-status--online";
    text = "Active now";
  } else {
    modifier = "online-status--offline";
    text = formatLastSeen(lastSeen);
  }

  return (
    <div className={`online-status ${modifier}`}>
      <span className="online-status__dot" />
      <span className="online-status__text">{text}</span>
    </div>
  );
};

export default OnlineStatus;
