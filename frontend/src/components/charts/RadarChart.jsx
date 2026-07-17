import "./charts.css";

/**
 * Radar (spider) chart for 3+ dimensions scored 0–100 — used by the
 * Relationship Pulse breakdown. ONE hue (translucent fill + 2px stroke),
 * recessive rings/spokes, labels in text tokens, native vertex tooltips.
 *
 * axes: [{ key, label, value (0–100) }]
 */
const SIZE = 300;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 96;
const RINGS = [25, 50, 75, 100];

const polar = (angle, radius) => ({
  x: CX + radius * Math.sin(angle),
  y: CY - radius * Math.cos(angle),
});

const RadarChart = ({ axes = [], color = "var(--chart-2)", emptyText = "Not enough signals yet." }) => {
  const dims = axes.filter((a) => typeof a.value === "number");
  if (dims.length < 3) return <div className="chart-empty">{emptyText}</div>;

  const angleOf = (i) => (i / dims.length) * Math.PI * 2;

  const ringPath = (r) =>
    dims
      .map((_, i) => {
        const { x, y } = polar(angleOf(i), (r / 100) * R);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  const shape =
    dims
      .map((a, i) => {
        const { x, y } = polar(angleOf(i), (Math.max(0, Math.min(100, a.value)) / 100) * R);
        return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(" ") + " Z";

  return (
    <div className="chart">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label={`Radar chart: ${dims.map((a) => `${a.label} ${Math.round(a.value)}`).join(", ")}`}
      >
        {RINGS.map((r) => (
          <path key={r} className="radar__ring" d={ringPath(r)} />
        ))}
        {dims.map((a, i) => {
          const outer = polar(angleOf(i), R);
          return <line key={a.key} className="radar__spoke" x1={CX} y1={CY} x2={outer.x} y2={outer.y} />;
        })}

        <path className="radar__shape" d={shape} fill={color} stroke={color} />

        {dims.map((a, i) => {
          const p = polar(angleOf(i), (Math.max(0, Math.min(100, a.value)) / 100) * R);
          return (
            <circle key={a.key} className="radar__vertex" cx={p.x} cy={p.y} r={3.5} fill={color}>
              <title>{`${a.label}: ${Math.round(a.value)}/100`}</title>
            </circle>
          );
        })}

        {dims.map((a, i) => {
          const p = polar(angleOf(i), R + 18);
          const anchor = Math.abs(p.x - CX) < 8 ? "middle" : p.x > CX ? "start" : "end";
          return (
            <g key={a.key}>
              <text className="radar__label" x={p.x} y={p.y} textAnchor={anchor}>
                {a.label}
              </text>
              <text className="radar__value" x={p.x} y={p.y + 11} textAnchor={anchor}>
                {Math.round(a.value)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default RadarChart;
