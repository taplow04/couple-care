import { memo } from "react";
import "./AiMoodCard.css";

/**
 * AI Current Mood card — renders the estimated emotional state with HONEST
 * framing (never asserts). Shows the mood emoji + "Probably/Possibly …" headline,
 * a confidence bar, trend + stability chips, the human reasons behind the
 * estimate, a mini mood-change sparkline, and (optionally) the partner's mood.
 *
 * This is the AI Current Mood concept — distinct from the manually-logged moods
 * listed below it on the page. It carries NO intensity.
 */

const VALENCE_COLOR = {
  positive: "var(--success, #32c36c)",
  neutral: "var(--secondary, #7c5cff)",
  low: "var(--warning, #ffaa00)",
};

const DIRECTION = {
  up: { icon: "↗", label: "Improving" },
  down: { icon: "↘", label: "Dipping" },
  steady: { icon: "→", label: "Steady" },
};

// Tiny sparkline from the timeline ({day, score}[]). Pure, responsive (viewBox).
const Sparkline = ({ timeline, color }) => {
  const pts = (timeline || []).filter((t) => typeof t.score === "number");
  if (pts.length < 2) return null;
  const W = 100;
  const H = 28;
  const xs = (i) => (i / (pts.length - 1)) * W;
  const ys = (v) => H - (v / 100) * H;
  const line = pts.map((t, i) => `${xs(i).toFixed(1)},${ys(t.score).toFixed(1)}`).join(" ");
  return (
    <svg
      className="aimood__spark"
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
};

const AiMoodCard = ({ mood, loading, partnerMood }) => {
  if (loading) {
    return <div className="aimood aimood--skeleton" aria-hidden="true" />;
  }
  if (!mood) return null;

  const color = VALENCE_COLOR[mood.valence] || VALENCE_COLOR.neutral;
  const dir = DIRECTION[mood.direction] || DIRECTION.steady;
  const confidence = Math.round(mood.confidence || 0);
  const stability = mood.stability || {};

  return (
    <div className="aimood" style={{ "--aimood-color": color }}>
      <div className="aimood__tag">✨ AI Estimate</div>

      <div className="aimood__hero">
        <span className="aimood__emoji" role="img" aria-label={mood.label}>
          {mood.emoji}
        </span>
        <div className="aimood__hero-text">
          <h2 className="aimood__headline">{mood.headline}</h2>
          <p className="aimood__sub">
            We think you're {mood.label.toLowerCase()} right now — this is an estimate, not a fact.
          </p>
        </div>
      </div>

      {/* Confidence */}
      <div className="aimood__conf">
        <div className="aimood__conf-row">
          <span className="aimood__conf-label">Confidence</span>
          <span className="aimood__conf-val">{confidence}%</span>
        </div>
        <div className="aimood__conf-track">
          <div className="aimood__conf-fill" style={{ width: `${confidence}%` }} />
        </div>
      </div>

      {/* Trend + stability chips */}
      <div className="aimood__chips">
        <span className="aimood__chip">
          <span className="aimood__chip-icon">{dir.icon}</span> {dir.label}
        </span>
        <span className="aimood__chip">
          {stability.score != null ? `🧘 ${stability.label}` : `🧭 ${stability.label || "Building"}`}
        </span>
        {mood.timeline?.length > 1 && <Sparkline timeline={mood.timeline} color={color} />}
      </div>

      {/* Reasons */}
      {mood.reasons?.length > 0 && (
        <div className="aimood__reasons">
          <p className="aimood__reasons-title">Why we think this</p>
          <ul className="aimood__reasons-list">
            {mood.reasons.map((r) => (
              <li key={r} className="aimood__reason">
                <span className="aimood__reason-dot" />
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Partner mood (if shared) */}
      {partnerMood?.display && (
        <div className="aimood__partner">
          <span className="aimood__partner-emoji">{partnerMood.emoji}</span>
          <span className="aimood__partner-text">
            Your partner is {partnerMood.headline.toLowerCase()}
          </span>
        </div>
      )}
    </div>
  );
};

// Pure presentational — memoise so it only re-renders when the mood DTO changes.
export default memo(AiMoodCard);
