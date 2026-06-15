import "./MoodOverview.css";

const MOODS = {
  happy:   { emoji: "😊", color: "#ffaa00" },
  loved:   { emoji: "🥰", color: "#ff5c8a" },
  excited: { emoji: "🤩", color: "#7c5cff" },
  sad:     { emoji: "😔", color: "#4a90d9" },
  anxious: { emoji: "😰", color: "#32c36c" },
  stressed:{ emoji: "😤", color: "#ff7043" },
  angry:   { emoji: "😠", color: "#ff5252" },
};

const TYPES = ["happy", "sad", "angry", "stressed", "loved", "excited", "anxious"];

const getTopMood = (analytics) => {
  if (!analytics) return null;
  return TYPES.reduce((top, t) => (analytics[t] > (analytics[top] ?? -1) ? t : top), TYPES[0]);
};

const getInitials = (name = "") =>
  name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

const StatSide = ({ name, photo, analytics, accent }) => {
  const total   = analytics ? TYPES.reduce((s, t) => s + (analytics[t] || 0), 0) : 0;
  const topType = analytics ? getTopMood(analytics) : null;
  const top     = topType ? MOODS[topType] : null;
  const avgInt  = analytics?.averageIntensity ?? 0;

  return (
    <div className={`mo-side mo-side--${accent}`}>
      <div className="mo-avatar-wrap">
        {photo ? (
          <img src={photo} alt={name} className="mo-avatar-img" />
        ) : (
          <span className="mo-avatar-init">{getInitials(name)}</span>
        )}
      </div>
      <p className="mo-name">{name?.split(" ")[0] ?? "—"}</p>

      {total === 0 ? (
        <p className="mo-no-data">No moods yet</p>
      ) : (
        <>
          <div className="mo-top-mood">
            <span className="mo-top-emoji">{top?.emoji}</span>
            <span className="mo-top-label" style={{ color: top?.color }}>
              {topType}
            </span>
          </div>
          <div className="mo-stats-row">
            <div className="mo-stat">
              <span className="mo-stat-val">{total}</span>
              <span className="mo-stat-label">entries</span>
            </div>
            <div className="mo-stat-divider" />
            <div className="mo-stat">
              <span className="mo-stat-val">{avgInt.toFixed(1)}</span>
              <span className="mo-stat-label">avg intensity</span>
            </div>
          </div>

          <div className="mo-intensity-bar-wrap">
            <div
              className="mo-intensity-bar-fill"
              style={{
                width: `${(avgInt / 10) * 100}%`,
                background: accent === "me" ? "var(--primary)" : "var(--secondary)",
              }}
            />
          </div>
        </>
      )}
    </div>
  );
};

const MoodOverview = ({ myAnalytics, partnerAnalytics, myName, partnerName, myPhoto, partnerPhoto }) => (
  <div className="mo">
    <h2 className="mo__title">Mood Overview</h2>
    <div className="mo__card">
      <StatSide
        name={myName}
        photo={myPhoto}
        analytics={myAnalytics}
        accent="me"
      />
      <div className="mo__divider">
        <span className="mo__vs">vs</span>
      </div>
      <StatSide
        name={partnerName}
        photo={partnerPhoto}
        analytics={partnerAnalytics}
        accent="partner"
      />
    </div>
  </div>
);

export default MoodOverview;
