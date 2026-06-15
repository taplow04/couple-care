import "./PartnerMoodCard.css";

const MOODS = {
  happy:   { emoji: "😊", color: "#ffaa00", bg: "rgba(255,170,0,0.12)" },
  loved:   { emoji: "🥰", color: "#ff5c8a", bg: "rgba(255,92,138,0.12)" },
  excited: { emoji: "🤩", color: "#7c5cff", bg: "rgba(124,92,255,0.12)" },
  sad:     { emoji: "😔", color: "#4a90d9", bg: "rgba(74,144,217,0.12)" },
  anxious: { emoji: "😰", color: "#32c36c", bg: "rgba(50,195,108,0.12)" },
  stressed:{ emoji: "😤", color: "#ff7043", bg: "rgba(255,112,67,0.12)" },
  angry:   { emoji: "😠", color: "#ff5252", bg: "rgba(255,82,82,0.12)" },
};

const formatRelative = (d) => {
  const diffMs = Date.now() - new Date(d).getTime();
  const diffH  = Math.floor(diffMs / 3600000);
  const diffD  = Math.floor(diffH / 24);
  if (diffH < 1)  return "just now";
  if (diffH < 24) return `${diffH}h ago`;
  if (diffD < 7)  return `${diffD}d ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(d));
};

const getInitials = (name = "") =>
  name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

const PartnerMoodCard = ({ moods, partnerName, partnerPhoto }) => {
  const displayMoods = (moods ?? []).slice(0, 8);

  return (
    <div className="pmc">
      <div className="pmc__head">
        <div className="pmc__partner-info">
          <div className="pmc__partner-avatar">
            {partnerPhoto ? (
              <img src={partnerPhoto} alt={partnerName} className="pmc__partner-img" />
            ) : (
              <span className="pmc__partner-init">{getInitials(partnerName)}</span>
            )}
          </div>
          <div>
            <h2 className="pmc__title">{partnerName?.split(" ")[0] ?? "Partner"}'s Moods</h2>
            <p className="pmc__sub">Moods they've shared with you</p>
          </div>
        </div>
        <span className="pmc__count-badge">{displayMoods.length}</span>
      </div>

      {displayMoods.length === 0 ? (
        <div className="pmc__empty">
          <span className="pmc__empty-emoji">🔒</span>
          <p className="pmc__empty-title">No shared moods yet</p>
          <p className="pmc__empty-sub">
            Your partner hasn't shared any moods publicly. Encourage them to set moods to "Partner Only" visibility.
          </p>
        </div>
      ) : (
        <div className="pmc__list">
          {displayMoods.map((mood) => {
            const m = MOODS[mood.moodType] ?? { emoji: "😐", color: "#888", bg: "rgba(0,0,0,0.06)" };
            return (
              <div
                key={mood._id}
                className="pmc__item"
                style={{ "--mc": m.color, "--mb": m.bg }}
              >
                <div className="pmc__item-icon">
                  <span>{m.emoji}</span>
                </div>
                <div className="pmc__item-body">
                  <div className="pmc__item-row">
                    <span className="pmc__item-type">{mood.moodType}</span>
                    <span className="pmc__item-int" style={{ color: m.color }}>
                      {mood.intensity}/10
                    </span>
                  </div>
                  <div className="pmc__bar-track">
                    <div
                      className="pmc__bar-fill"
                      style={{ width: `${mood.intensity * 10}%`, background: m.color }}
                    />
                  </div>
                  {mood.note && (
                    <p className="pmc__item-note">
                      {mood.note.length > 80 ? `${mood.note.slice(0, 80)}…` : mood.note}
                    </p>
                  )}
                </div>
                <span className="pmc__item-date">{formatRelative(mood.createdAt)}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PartnerMoodCard;
