import "./TrustScoreRing.css";

const COLORS = {
  strong: "var(--success)",
  good: "var(--warning)",
  at_risk: "var(--danger)",
};

// Animated SVG donut for the security-health score.
const TrustScoreRing = ({ score = 0, level = "good", size = 132 }) => {
  const stroke = 11;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;
  const color = COLORS[level] || COLORS.good;

  return (
    <div className="trust-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="var(--surface-2)"
          strokeWidth={stroke}
        />
        <circle
          className="trust-ring__progress"
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="trust-ring__center">
        <span className="trust-ring__score" style={{ color }}>
          {score}
          <span className="trust-ring__pct">%</span>
        </span>
        <span className="trust-ring__shield" aria-hidden="true">🛡</span>
      </div>
    </div>
  );
};

export default TrustScoreRing;
