import "./growth.css";

/**
 * Personal achievement badges (locked = greyed). Reads the growth summary's
 * `achievements` array.
 */
const GrowthAchievements = ({ achievements = [], unlocked, total }) => (
  <div className="gcard">
    <div className="gcard__head">
      <h3 className="gcard__title">🏅 Achievements</h3>
      <span className="gcard__hint">
        {unlocked ?? achievements.filter((a) => a.unlocked).length} / {total ?? achievements.length}
      </span>
    </div>
    <div className="gach__grid">
      {achievements.map((a) => (
        <div
          key={a.key}
          className={`gach__badge ${a.unlocked ? "gach__badge--on" : ""}`}
          title={`${a.title} — ${a.description}`}
        >
          <div className="gach__emoji">{a.emoji}</div>
          <div className="gach__label">{a.title}</div>
        </div>
      ))}
    </div>
  </div>
);

export default GrowthAchievements;
