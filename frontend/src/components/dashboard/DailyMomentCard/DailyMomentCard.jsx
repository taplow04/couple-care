import { Link } from "react-router-dom";
import "./DailyMomentCard.css";

/**
 * ❤️ Daily Couple Moment — dashboard recap card (Feature 2 / 5).
 *
 * Two states, driven by `today` from GET /daily-moment/today (or the dashboard
 * payload):
 *   • exists → the beautiful "Our Day" recap (stats + AI summary), links to the
 *     full recap at /our-day.
 *   • not yet → an encouraging nudge showing who still needs to share today.
 *
 * Pure presentational — all data/socket logic lives in `useDailyMoment`.
 */
const formatDay = (day) => {
  if (!day) return "";
  // day is "YYYY-MM-DD" (UTC) — render in a friendly long form.
  const d = new Date(`${day}T00:00:00`);
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
};

const Stat = ({ icon, value, label }) => (
  <div className="dmc-stat">
    <span className="dmc-stat__icon" aria-hidden="true">
      {icon}
    </span>
    <span className="dmc-stat__value">{value}</span>
    <span className="dmc-stat__label">{label}</span>
  </div>
);

const Skeleton = () => (
  <div className="dmc dmc--skeleton" aria-hidden="true">
    <div className="dmc-shimmer dmc-shimmer--title" />
    <div className="dmc-shimmer dmc-shimmer--row" />
    <div className="dmc-shimmer dmc-shimmer--text" />
  </div>
);

const DailyMomentCard = ({ today, loading }) => {
  if (loading) return <Skeleton />;
  if (!today) return null;

  // ── Encouragement state ──────────────────────────────────────────────────
  if (!today.exists) {
    const { youPosted, partnerPosted } = today;
    const sub = youPosted
      ? "You shared yours — waiting on your partner ❤️"
      : partnerPosted
        ? "Your partner shared theirs — add yours to unlock today ❤️"
        : "Share a Moment each to create today's memory together";
    return (
      <Link to="/moments" className="dmc dmc--empty">
        <div className="dmc-glow" aria-hidden="true" />
        <div className="dmc-empty__head">
          <span className="dmc-empty__heart" aria-hidden="true">
            ❤️
          </span>
          <div>
            <h3 className="dmc-empty__title">Today's Couple Moment</h3>
            <p className="dmc-empty__sub">{sub}</p>
          </div>
        </div>
        <div className="dmc-empty__progress">
          <span className={`dmc-dot ${youPosted ? "is-on" : ""}`}>You</span>
          <span className="dmc-dot__link" aria-hidden="true">
            ✦
          </span>
          <span className={`dmc-dot ${partnerPosted ? "is-on" : ""}`}>Partner</span>
        </div>
        <span className="dmc-empty__cta">Share today's Moment →</span>
      </Link>
    );
  }

  // ── Recap state ──────────────────────────────────────────────────────────
  const r = today.recap || {};
  const counts = r.counts || {};
  const aiPending = r.ai?.status === "pending";

  return (
    <Link to={`/our-day?day=${r.day}`} className="dmc dmc--recap">
      <div className="dmc-glow" aria-hidden="true" />
      {r.coverUrl && (
        <div
          className="dmc-cover"
          style={{ backgroundImage: `url(${r.coverUrl})` }}
          aria-hidden="true"
        />
      )}

      <div className="dmc-recap__head">
        <span className="dmc-recap__badge">❤️ Our Day</span>
        <span className="dmc-recap__date">{formatDay(r.day)}</span>
      </div>

      <div className="dmc-stats">
        <Stat icon="📸" value={counts.moments || 0} label="Moments" />
        {counts.videos > 0 && <Stat icon="🎥" value={counts.videos} label="Videos" />}
        {r.topMood && (
          <Stat icon={r.topMoodEmoji || "🙂"} value={r.topMood} label="Mood" />
        )}
        <Stat icon="💬" value={r.messageCount || 0} label="Messages" />
        {r.streak > 0 && <Stat icon="🔥" value={r.streak} label="Streak" />}
        <Stat icon="⭐" value={`+${r.xpAwarded || 0}`} label="XP" />
      </div>

      <p className={`dmc-summary ${aiPending ? "is-pending" : ""}`}>
        {aiPending ? (
          <span className="dmc-summary__loading">
            Writing today's reflection…
          </span>
        ) : (
          <>
            “{r.ai?.summary}”<span className="dmc-summary__sig"> — CoupleCare AI</span>
          </>
        )}
      </p>

      <span className="dmc-recap__cta">Open full recap →</span>
    </Link>
  );
};

export default DailyMomentCard;
