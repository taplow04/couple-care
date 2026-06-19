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

// Shared-streak messaging — the streak only advances when BOTH partners are
// active, so nudge toward whichever side is missing (helpful, not harsh).
const encouragement = (streak, { bothActiveToday, youActiveToday, partnerActiveToday }) => {
  if (bothActiveToday) {
    const next = nextMilestone(streak);
    if (next) return `You're both in today 🔥 ${next - streak} day${next - streak === 1 ? "" : "s"} to your next milestone!`;
    return "You're both in today — incredible, you two are unstoppable! 💞";
  }
  if (youActiveToday && !partnerActiveToday)
    return "You've done your part today 💗 Nudge your partner so your streak counts!";
  if (!youActiveToday && partnerActiveToday)
    return "Your partner showed up today 💌 Your turn — log something to lock in the streak!";
  if (streak === 0)
    return "Start your streak together — both of you do one thing today 💕";
  return "Keep your streak alive — you BOTH need to be active today 💪";
};

const StreakCard = ({ engagement, loading }) => {
  if (loading && !engagement) {
    return <div className="streakcard streakcard--skeleton" />;
  }

  const streak = engagement?.currentStreak ?? 0;
  const longest = engagement?.longestStreak ?? 0;
  const bothActiveToday = engagement?.bothActiveToday ?? false;
  const youActiveToday = engagement?.youActiveToday ?? false;
  const partnerActiveToday = engagement?.partnerActiveToday ?? false;
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
          <p className="streakcard__msg">
            {encouragement(streak, { bothActiveToday, youActiveToday, partnerActiveToday })}
          </p>
          <div className="streakcard__today">
            <span className={`streakcard__who ${youActiveToday ? "streakcard__who--on" : ""}`}>
              {youActiveToday ? "✓" : "○"} You
            </span>
            <span className={`streakcard__who ${partnerActiveToday ? "streakcard__who--on" : ""}`}>
              {partnerActiveToday ? "✓" : "○"} Partner
            </span>
            {longest > 0 && (
              <span className="streakcard__longest">Best: {longest}d</span>
            )}
          </div>
        </div>
      </div>

      <div className="streakcard__xp">
        <XPBar engagement={engagement} />
      </div>
    </div>
  );
};

export default StreakCard;
