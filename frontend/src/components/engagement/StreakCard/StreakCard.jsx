import XPBar from "../XPBar/XPBar";
import "./StreakCard.css";

/**
 * Daily streak card — the heart of the engagement loop. Shows the couple's
 * current streak (weighted across chat / mood / memory / etc.), the milestone
 * tier, longest streak, and the XP/level bar. Encouraging, never punishing.
 */
const MILESTONES = [365, 100, 30, 7];

const tierFor = (streak) => {
  if (streak >= 365) return { label: "365-Day Legend", emoji: "🏆" };
  if (streak >= 100) return { label: "100-Day Club", emoji: "💯" };
  if (streak >= 30) return { label: "30-Day Streak", emoji: "⚡" };
  if (streak >= 7) return { label: "7-Day Streak", emoji: "🔥" };
  return null;
};

const nextMilestone = (streak) =>
  [...MILESTONES].reverse().find((m) => m > streak) ?? null;

const encouragement = (streak, activeToday) => {
  if (streak === 0)
    return "Start your streak today — log a mood, send a message, or add a memory 💕";
  if (!activeToday)
    return "Do one thing together today to keep it alive! You've got this 💪";
  const next = nextMilestone(streak);
  if (next) return `${next - streak} day${next - streak === 1 ? "" : "s"} to your next milestone 🎯`;
  return "Incredible — you two are unstoppable! 💞";
};

const StreakCard = ({ engagement, loading }) => {
  if (loading && !engagement) {
    return <div className="streakcard streakcard--skeleton" />;
  }

  const streak = engagement?.currentStreak ?? 0;
  const longest = engagement?.longestStreak ?? 0;
  const activeToday = engagement?.activeToday ?? false;
  const tier = tierFor(streak);
  const lit = streak > 0;

  return (
    <div className="streakcard">
      <div className="streakcard__main">
        <div className={`streakcard__flame ${lit ? "streakcard__flame--lit" : ""}`}>
          <span className="streakcard__flame-emoji">🔥</span>
          <span className="streakcard__flame-num">{streak}</span>
        </div>

        <div className="streakcard__text">
          <div className="streakcard__heading">
            <span className="streakcard__days">
              {streak} Day Streak
            </span>
            {tier && (
              <span className="streakcard__tier">
                {tier.emoji} {tier.label}
              </span>
            )}
          </div>
          <p className="streakcard__msg">{encouragement(streak, activeToday)}</p>
          {longest > 0 && (
            <span className="streakcard__longest">Longest: {longest} days</span>
          )}
        </div>
      </div>

      <div className="streakcard__xp">
        <XPBar engagement={engagement} />
      </div>
    </div>
  );
};

export default StreakCard;
