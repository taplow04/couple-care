import "./RecentMoodCard.css";

const MOOD_EMOJI = {
  happy: "😊",
  sad: "😢",
  angry: "😤",
  stressed: "😰",
  loved: "🥰",
  excited: "🤩",
  anxious: "😟",
};

const MOOD_COLOR = {
  happy: "#FFD93D",
  sad: "#74B9FF",
  angry: "#FF6B6B",
  stressed: "#A29BFE",
  loved: "#FF5C8A",
  excited: "#FFA502",
  anxious: "#B2BEC3",
};

const MOOD_BG = {
  happy: "rgba(255,217,61,0.12)",
  sad: "rgba(116,185,255,0.12)",
  angry: "rgba(255,107,107,0.12)",
  stressed: "rgba(162,155,254,0.12)",
  loved: "rgba(255,92,138,0.12)",
  excited: "rgba(255,165,2,0.12)",
  anxious: "rgba(178,190,195,0.12)",
};

const formatRelativeTime = (date) => {
  const now = new Date();
  const then = new Date(date);
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return then.toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

const RecentMoodCard = ({ recentMoods }) => {
  const latest = recentMoods?.[0] || null;

  if (!recentMoods || recentMoods.length === 0) {
    return (
      <div className="rmc-card rmc-card--empty">
        <p className="rmc-card-label">Recent Mood</p>
        <div className="rmc-empty">
          <span className="rmc-empty-emoji" role="img" aria-label="no mood">🌱</span>
          <p className="rmc-empty-title">No moods yet</p>
          <p className="rmc-empty-text">Start logging how you feel each day.</p>
        </div>
      </div>
    );
  }

  const moodColor = MOOD_COLOR[latest.moodType] || "#ff5c8a";
  const moodBg = MOOD_BG[latest.moodType] || "rgba(255,92,138,0.10)";

  return (
    <div className="rmc-card">
      <div className="rmc-header">
        <p className="rmc-card-label">Recent Mood</p>
        <span className="rmc-time">{formatRelativeTime(latest.createdAt)}</span>
      </div>

      <div className="rmc-main">
        <div className="rmc-emoji-wrap" style={{ background: moodBg }}>
          <span className="rmc-emoji" role="img" aria-label={latest.moodType}>
            {MOOD_EMOJI[latest.moodType] || "😶"}
          </span>
        </div>

        <div className="rmc-info">
          <p className="rmc-mood-name" style={{ color: moodColor }}>
            {capitalize(latest.moodType)}
          </p>
          <div className="rmc-intensity">
            <span className="rmc-intensity-label">Intensity</span>
            <div className="rmc-intensity-bar">
              <div
                className="rmc-intensity-fill"
                style={{
                  width: `${(latest.intensity / 10) * 100}%`,
                  background: moodColor,
                }}
              />
            </div>
            <span className="rmc-intensity-value">{latest.intensity}/10</span>
          </div>
          {latest.note && (
            <p className="rmc-note">"{latest.note}"</p>
          )}
        </div>
      </div>

      {recentMoods.length > 1 && (
        <div className="rmc-history">
          <span className="rmc-history-label">Recent</span>
          <div className="rmc-dots">
            {recentMoods.slice(0, 5).map((mood, i) => (
              <span
                key={mood._id || i}
                className="rmc-dot"
                style={{ background: MOOD_COLOR[mood.moodType] || "#ccc" }}
                title={capitalize(mood.moodType)}
                role="img"
                aria-label={mood.moodType}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentMoodCard;
