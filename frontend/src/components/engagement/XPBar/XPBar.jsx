import "./XPBar.css";

/**
 * Couple XP / level bar. Reads the engagement summary fields directly:
 * level, currentLevelXp, nextLevelXp, levelProgress, xpThisWeek.
 */
const XPBar = ({ engagement }) => {
  const level = engagement?.level ?? 1;
  const cur = engagement?.currentLevelXp ?? 0;
  const next = engagement?.nextLevelXp ?? 100;
  const progress = Math.max(0, Math.min(1, engagement?.levelProgress ?? 0));
  const weekly = engagement?.xpThisWeek ?? 0;

  return (
    <div className="xpbar">
      <div className="xpbar__top">
        <span className="xpbar__level">
          <span className="xpbar__level-star">⭐</span> Level {level}
        </span>
        <span className="xpbar__count">
          {cur} / {next} XP
        </span>
      </div>

      <div className="xpbar__track" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
        <div className="xpbar__fill" style={{ width: `${progress * 100}%` }} />
      </div>

      {weekly > 0 && (
        <span className="xpbar__weekly">+{weekly} XP this week</span>
      )}
    </div>
  );
};

export default XPBar;
