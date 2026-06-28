import "./growth.css";

/**
 * Personal XP + level + growth-streak bar (Stage 1/3). Mirrors the couple XP bar
 * visually but reads the user-scoped growth summary.
 */
const GrowthXPBar = ({ summary }) => {
  const level = summary?.level ?? 1;
  const pct = Math.round((summary?.levelProgress ?? 0) * 100);
  const cur = summary?.currentLevelXp ?? 0;
  const next = summary?.nextLevelXp ?? 100;
  const streak = summary?.currentStreak ?? 0;

  return (
    <div className="gcard">
      <div className="gxp__top">
        <span className="gxp__level">Level {level}</span>
        <span className="gxp__xp">{cur} / {next} XP</span>
      </div>
      <div className="gxp__track">
        <div className="gxp__fill" style={{ width: `${pct}%` }} />
      </div>
      {streak > 0 && (
        <span className="gxp__streak">🔥 {streak}-day growth streak</span>
      )}
    </div>
  );
};

export default GrowthXPBar;
