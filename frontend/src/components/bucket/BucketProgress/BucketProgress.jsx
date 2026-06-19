import { useEffect, useState } from "react";
import "./BucketProgress.css";

const SIZE = 96;
const C = SIZE / 2;
const R = 40;
const CIRC = 2 * Math.PI * R;

/**
 * Circular progress ring for the couple's bucket list completion.
 * Props: percent (0-100), completed, total.
 */
const BucketProgress = ({ percent = 0, completed = 0, total = 0 }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, [percent]);

  const offset = animated ? CIRC - (percent / 100) * CIRC : CIRC;

  return (
    <div className="bucket-progress">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label={`${percent}% complete`}>
        <circle cx={C} cy={C} r={R} fill="none" stroke="var(--surface-2)" strokeWidth="9" />
        <circle
          cx={C}
          cy={C}
          r={R}
          fill="none"
          stroke="url(#bucket-grad)"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${C} ${C})`}
          className="bucket-progress__bar"
        />
        <defs>
          <linearGradient id="bucket-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff5c8a" />
            <stop offset="100%" stopColor="#7c5cff" />
          </linearGradient>
        </defs>
        <text x={C} y={C - 1} textAnchor="middle" dominantBaseline="middle" className="bucket-progress__pct">
          {percent}%
        </text>
      </svg>
      <span className="bucket-progress__caption">
        {completed} of {total} goal{total === 1 ? "" : "s"}
      </span>
    </div>
  );
};

export default BucketProgress;
