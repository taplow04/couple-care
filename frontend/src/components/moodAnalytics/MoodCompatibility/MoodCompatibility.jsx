import { useEffect, useState } from "react";
import "./MoodCompatibility.css";

// Geometry lives in a single square 120×120 viewBox so the SVG can scale
// responsively without ever distorting (the old 130px-attr / 110-viewBox mix
// could squash on narrow widths). r=50, strokeWidth 10 ⇒ fits within 120.
const R = 50;
const CIRC = 2 * Math.PI * R;

const getLevel = (score) => {
  if (score >= 85) return { label: "Thriving Together", emoji: "💕", color: "#32c36c" };
  if (score >= 70) return { label: "Well Connected",    emoji: "🌟", color: "#ff5c8a" };
  if (score >= 50) return { label: "Growing Together",  emoji: "🌱", color: "#ffaa00" };
  return              { label: "Room to Grow",          emoji: "💫", color: "#7c5cff" };
};

const PosBar = ({ label, ratio, color }) => (
  <div className="mcompat-bar-row">
    <span className="mcompat-bar-label">{label}</span>
    <div className="mcompat-bar-track">
      <div
        className="mcompat-bar-fill"
        style={{ width: `${Math.round(ratio * 100)}%`, background: color }}
      />
    </div>
    <span className="mcompat-bar-pct" style={{ color }}>{Math.round(ratio * 100)}%</span>
  </div>
);

const MoodCompatibility = ({ compatibility, myName, partnerName }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, []);

  const { score = 0, hasData = false, myPosRatio = 0, partPosRatio = 0 } = compatibility ?? {};
  const level  = getLevel(score);
  const offset = animated && hasData ? CIRC - (score / 100) * CIRC : CIRC;

  return (
    <div className="mcompat">
      <h2 className="mcompat__title">Mood Compatibility</h2>

      <div className="mcompat__card">
        {!hasData ? (
          <div className="mcompat__empty">
            <span className="mcompat__empty-emoji">🤝</span>
            <p className="mcompat__empty-text">
              Log more moods and share them with your partner to see your compatibility score.
            </p>
          </div>
        ) : (
          <>
            <div className="mcompat__ring-wrap">
              <svg
                className="mcompat__ring-svg"
                viewBox="0 0 120 120"
                preserveAspectRatio="xMidYMid meet"
                role="img"
                aria-label={`Mood compatibility ${score}%`}
              >
                <circle
                  cx="60" cy="60" r={R} fill="none" strokeWidth="10"
                  stroke={level.color}
                  strokeOpacity="0.15"
                />
                <circle
                  cx="60" cy="60" r={R} fill="none" strokeWidth="10"
                  stroke={level.color}
                  strokeLinecap="round"
                  strokeDasharray={CIRC}
                  strokeDashoffset={offset}
                  transform="rotate(-90 60 60)"
                  className="mcompat__arc"
                />
              </svg>
              <div className="mcompat__ring-center">
                <span className="mcompat__score" style={{ color: level.color }}>{score}</span>
                <span className="mcompat__pct">%</span>
              </div>
            </div>

            <div className="mcompat__level-badge" style={{ background: `${level.color}18`, color: level.color }}>
              {level.emoji} {level.label}
            </div>

            <div className="mcompat__bars">
              <p className="mcompat__bars-title">Positive Vibes</p>
              <PosBar
                label={myName?.split(" ")[0] ?? "You"}
                ratio={myPosRatio}
                color="var(--primary)"
              />
              <PosBar
                label={partnerName?.split(" ")[0] ?? "Partner"}
                ratio={partPosRatio}
                color="var(--secondary)"
              />
            </div>

            <p className="mcompat__hint">
              Based on positive mood (happy, loved, excited) ratio alignment.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default MoodCompatibility;
