import "./intelligence.css";

/**
 * Generic 0–100 score ring for intelligence surfaces (maturity / healing /
 * behaviour). Pure presentational — value labels stay in text tokens.
 */
const ScoreRing = ({ score, size = 96, strokeWidth = 9, subLabel = "/100" }) => {
  const r = (size - strokeWidth) / 2 - 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(100, score ?? 0));
  const offset = c - (pct / 100) * c;
  const mid = size / 2;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Score ${score ?? "unknown"} out of 100`}>
      <circle className="intel-ring__track" cx={mid} cy={mid} r={r} fill="none" strokeWidth={strokeWidth} />
      <circle
        className="intel-ring__value"
        cx={mid}
        cy={mid}
        r={r}
        fill="none"
        strokeWidth={strokeWidth}
        strokeDasharray={c}
        strokeDashoffset={score == null ? c : offset}
        transform={`rotate(-90 ${mid} ${mid})`}
      />
      <text className="intel-ring__center" x={mid} y={mid + 2} textAnchor="middle">
        {score == null ? "—" : pct}
      </text>
      <text className="intel-ring__sub" x={mid} y={mid + 16} textAnchor="middle">
        {subLabel}
      </text>
    </svg>
  );
};

export default ScoreRing;
