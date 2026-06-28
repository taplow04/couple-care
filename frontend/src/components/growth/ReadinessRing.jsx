import "./growth.css";

const LEVEL_TEXT = (score) => {
  if (score == null) return "Take the quick quiz to discover how ready you feel for love.";
  if (score >= 80) return "You're in a strong, secure place. Beautiful work.";
  if (score >= 60) return "You're well on your way. Keep nurturing yourself.";
  if (score >= 40) return "Growing steadily. A few areas to gently work on.";
  return "Early in your journey — every small step counts.";
};

/**
 * Relationship Readiness score ring (0–100). Shows a take-quiz CTA when unset.
 */
const ReadinessRing = ({ score, onTakeQuiz }) => {
  const R = 34;
  const C = 2 * Math.PI * R;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const offset = C - (pct / 100) * C;

  return (
    <div className="gcard">
      <div className="gcard__head">
        <h3 className="gcard__title">📈 Relationship Readiness</h3>
      </div>
      <div className="gring">
        <svg className="gring__svg" width="84" height="84" viewBox="0 0 84 84">
          <circle className="gring__track" cx="42" cy="42" r={R} fill="none" strokeWidth="8" />
          <circle
            className="gring__value"
            cx="42"
            cy="42"
            r={R}
            fill="none"
            strokeWidth="8"
            strokeDasharray={C}
            strokeDashoffset={score == null ? C : offset}
            transform="rotate(-90 42 42)"
          />
          <text className="gring__center" x="42" y="48" textAnchor="middle">
            {score == null ? "—" : pct}
          </text>
        </svg>
        <div className="gring__body">
          <p className="gring__label">{LEVEL_TEXT(score)}</p>
          <button className="gbtn gbtn--ghost" onClick={onTakeQuiz}>
            {score == null ? "Take the quiz" : "Retake quiz"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReadinessRing;
