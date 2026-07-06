import "./intelligence.css";

/**
 * Single-series trend sparkline over daily intelligence snapshots.
 * `series`: [{ day: "YYYY-MM-DD", score }] oldest-first. One hue, 2px line,
 * endpoint dot, native tooltips per point; no legend (the card title names the
 * series). Renders nothing with < 2 points — one dot isn't a trend.
 */
const W = 320;
const H = 72;
const PAD = 8;

const TrendSparkline = ({ series = [] }) => {
  const pts = series.filter((p) => typeof p.score === "number");
  if (pts.length < 2) return null;

  const xs = (i) => PAD + (i / (pts.length - 1)) * (W - PAD * 2);
  const min = Math.min(...pts.map((p) => p.score));
  const max = Math.max(...pts.map((p) => p.score));
  const span = Math.max(max - min, 10); // keep flat lines from looking wild
  const ys = (v) => H - PAD - ((v - (min + max) / 2 + span / 2) / span) * (H - PAD * 2);

  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${xs(i).toFixed(1)},${ys(p.score).toFixed(1)}`).join(" ");
  const area = `${path} L${xs(pts.length - 1).toFixed(1)},${H - PAD} L${xs(0).toFixed(1)},${H - PAD} Z`;
  const last = pts[pts.length - 1];

  return (
    <div>
      <svg className="intel-spark" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Trend over ${pts.length} days, from ${pts[0].score} to ${last.score}`}>
        <line className="intel-spark__grid" x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} />
        <path className="intel-spark__area" d={area} />
        <path className="intel-spark__line" d={path} />
        {pts.map((p, i) => (
          <circle key={p.day} cx={xs(i)} cy={ys(p.score)} r={i === pts.length - 1 ? 4 : 6} fill={i === pts.length - 1 ? undefined : "transparent"} className={i === pts.length - 1 ? "intel-spark__dot" : undefined}>
            <title>{`${p.day}: ${p.score}`}</title>
          </circle>
        ))}
      </svg>
      <div className="intel-spark-meta">
        <span>{pts[0].day.slice(5)}</span>
        <span>{last.day.slice(5)} · {last.score}</span>
      </div>
    </div>
  );
};

export default TrendSparkline;
