import { useEffect, useState } from "react";
import "./HealthScoreCard.css";

const RING_SIZE = 110;
const CENTER = RING_SIZE / 2;
const RADIUS = 42;
const STROKE_WIDTH = 9;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

const getScoreConfig = (score) => {
  if (score >= 90) return { level: "Excellent", color: "#32c36c", trackColor: "rgba(50,195,108,0.15)" };
  if (score >= 75) return { level: "Healthy", color: "#ff5c8a", trackColor: "rgba(255,92,138,0.12)" };
  if (score >= 50) return { level: "Moderate", color: "#ffaa00", trackColor: "rgba(255,170,0,0.12)" };
  return { level: "Needs Care", color: "#ff5252", trackColor: "rgba(255,82,82,0.12)" };
};

const HealthScoreCard = ({ aiScore, health }) => {
  const [animated, setAnimated] = useState(false);

  // Relationship Health is a COUPLE metric — identical for both partners. Use
  // the couple-level value from either the dashboard payload (`health`, shown
  // immediately) or the AI endpoint (`aiScore`); both return the same number.
  // No per-user fallback — that was the source of divergent scores.
  const source = aiScore ?? health ?? null;
  const score = source?.score ?? null;
  const level =
    source?.level ?? (score !== null ? getScoreConfig(score).level : null);
  const hasData = score !== null;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, [score]);

  const config = hasData ? getScoreConfig(score) : { color: "#cccccc", trackColor: "rgba(0,0,0,0.06)" };
  const offset = hasData
    ? animated
      ? CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE
      : CIRCUMFERENCE
    : CIRCUMFERENCE;

  return (
    <div className="hsc-card">
      <p className="hsc-label">Relationship Health</p>

      <div className="hsc-ring-wrap">
        <svg
          width={RING_SIZE}
          height={RING_SIZE}
          viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`}
          preserveAspectRatio="xMidYMid meet"
          aria-label={hasData ? `Health score: ${score}%` : "No data yet"}
          role="img"
        >
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={config.trackColor}
            strokeWidth={STROKE_WIDTH}
          />
          <circle
            cx={CENTER}
            cy={CENTER}
            r={RADIUS}
            fill="none"
            stroke={config.color}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${CENTER} ${CENTER})`}
            className="hsc-ring-progress"
          />
          {hasData ? (
            <>
              <text
                x={CENTER}
                y={CENTER - 3}
                textAnchor="middle"
                dominantBaseline="middle"
                fill={config.color}
                fontSize="22"
                fontWeight="700"
                fontFamily="Inter, sans-serif"
              >
                {score}
              </text>
              <text
                x={CENTER}
                y={CENTER + 16}
                textAnchor="middle"
                fill="#aaaaaa"
                fontSize="10"
                fontFamily="Inter, sans-serif"
              >
                / 100
              </text>
            </>
          ) : (
            <text
              x={CENTER}
              y={CENTER}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#cccccc"
              fontSize="11"
              fontFamily="Inter, sans-serif"
            >
              No data
            </text>
          )}
        </svg>
      </div>

      {hasData ? (
        <div className="hsc-info">
          <span className="hsc-level" style={{ color: config.color }}>
            {level}
          </span>
        </div>
      ) : (
        <p className="hsc-empty">Log moods to see your score</p>
      )}
    </div>
  );
};

export default HealthScoreCard;
