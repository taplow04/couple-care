import { useState, useCallback, useRef } from "react";
import "./charts.css";

/**
 * Multi-series line/area chart (SVG, token-driven, theme-aware).
 *
 * series: [{ key, label, color (css value, e.g. "var(--chart-1)"),
 *            points: [{ x: "label", y: number|null }] }]
 * All series share the x categories of the LONGEST series. y nulls are gaps.
 *
 * Dataviz rules applied: 2px lines, recessive grid, one y-axis (0–100 by
 * default for scores), legend for ≥2 series + direct end labels, hover
 * crosshair + tooltip (pointer events — works for touch too), text in text
 * tokens only.
 */
const W = 360;
const H = 170;
const PAD = { top: 10, right: 34, bottom: 20, left: 26 };

const LineChart = ({ series = [], yMax = 100, yMin = 0, area = false, unit = "", emptyText = "Not enough data yet — keep going, trends appear after a few days." }) => {
  const wrapRef = useRef(null);
  const [hover, setHover] = useState(null); // { index, px, py }

  const drawable = series.filter((s) => (s.points || []).some((p) => typeof p.y === "number"));
  const xLabels = drawable.reduce(
    (best, s) => (s.points.length > best.length ? s.points.map((p) => p.x) : best),
    [],
  );
  const n = xLabels.length;

  const xs = useCallback(
    (i) => PAD.left + (n <= 1 ? (W - PAD.left - PAD.right) / 2 : (i / (n - 1)) * (W - PAD.left - PAD.right)),
    [n],
  );
  const ys = useCallback(
    (v) => PAD.top + (1 - (v - yMin) / (yMax - yMin || 1)) * (H - PAD.top - PAD.bottom),
    [yMax, yMin],
  );

  const handleMove = useCallback(
    (e) => {
      if (!wrapRef.current || n === 0) return;
      const rect = wrapRef.current.getBoundingClientRect();
      const relX = ((e.clientX - rect.left) / rect.width) * W;
      const frac = (relX - PAD.left) / (W - PAD.left - PAD.right);
      const index = Math.max(0, Math.min(n - 1, Math.round(frac * (n - 1))));
      setHover({
        index,
        px: (xs(index) / W) * rect.width,
        py: e.clientY - rect.top,
      });
    },
    [n, xs],
  );
  const handleLeave = useCallback(() => setHover(null), []);

  if (!drawable.length || n < 2) {
    return <div className="chart-empty">{emptyText}</div>;
  }

  const gridLines = [yMin, (yMin + yMax) / 2, yMax];

  const pathOf = (points) => {
    let d = "";
    let pen = false;
    points.forEach((p, i) => {
      if (typeof p.y !== "number") {
        pen = false;
        return;
      }
      d += `${pen ? "L" : "M"}${xs(i).toFixed(1)},${ys(p.y).toFixed(1)} `;
      pen = true;
    });
    return d.trim();
  };

  const areaOf = (points) => {
    const nums = points.map((p, i) => ({ ...p, i })).filter((p) => typeof p.y === "number");
    if (nums.length < 2) return "";
    const top = nums.map((p, j) => `${j === 0 ? "M" : "L"}${xs(p.i).toFixed(1)},${ys(p.y).toFixed(1)}`).join(" ");
    return `${top} L${xs(nums[nums.length - 1].i).toFixed(1)},${ys(yMin).toFixed(1)} L${xs(nums[0].i).toFixed(1)},${ys(yMin).toFixed(1)} Z`;
  };

  const hoverRows = hover
    ? drawable
        .map((s) => ({ label: s.label, color: s.color, y: s.points[hover.index]?.y }))
        .filter((r) => typeof r.y === "number")
    : [];

  return (
    <div className="chart" ref={wrapRef}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        role="img"
        aria-label={`Line chart: ${drawable.map((s) => s.label).join(", ")}`}
        onPointerMove={handleMove}
        onPointerLeave={handleLeave}
      >
        {gridLines.map((v) => (
          <g key={v}>
            <line className="chart__grid" x1={PAD.left} y1={ys(v)} x2={W - PAD.right} y2={ys(v)} />
            <text className="chart__axis-label" x={PAD.left - 6} y={ys(v) + 3} textAnchor="end">
              {Math.round(v)}
            </text>
          </g>
        ))}
        <text className="chart__axis-label" x={xs(0)} y={H - 6} textAnchor="start">
          {xLabels[0]}
        </text>
        <text className="chart__axis-label" x={xs(n - 1)} y={H - 6} textAnchor="end">
          {xLabels[n - 1]}
        </text>

        {hover && (
          <line className="chart__crosshair" x1={xs(hover.index)} y1={PAD.top} x2={xs(hover.index)} y2={H - PAD.bottom} />
        )}

        {drawable.map((s) => (
          <g key={s.key}>
            {area && <path className="chart__area" d={areaOf(s.points)} fill={s.color} />}
            <path className="chart__line" d={pathOf(s.points)} stroke={s.color} />
            {(() => {
              const nums = s.points.map((p, i) => ({ ...p, i })).filter((p) => typeof p.y === "number");
              const last = nums[nums.length - 1];
              if (!last) return null;
              return (
                <g>
                  <circle className="chart__dot" cx={xs(last.i)} cy={ys(last.y)} r={3.5} fill={s.color} />
                  {/* Selective direct label: the latest value only. */}
                  <text className="chart__end-label" x={xs(last.i) + 6} y={ys(last.y) + 3}>
                    {Math.round(last.y)}{unit}
                  </text>
                </g>
              );
            })()}
            {hover && typeof s.points[hover.index]?.y === "number" && (
              <circle className="chart__dot" cx={xs(hover.index)} cy={ys(s.points[hover.index].y)} r={4} fill={s.color} />
            )}
          </g>
        ))}
      </svg>

      {hover && hoverRows.length > 0 && (
        <div className="chart-tooltip" style={{ left: hover.px, top: Math.max(hover.py, 44) }}>
          <div className="chart-tooltip__title">{xLabels[hover.index]}</div>
          {hoverRows.map((r) => (
            <div key={r.label} className="chart-tooltip__row">
              <span className="chart-legend__chip" style={{ background: r.color }} />
              <span>
                {r.label}: {Math.round(r.y)}{unit}
              </span>
            </div>
          ))}
        </div>
      )}

      {drawable.length >= 2 && (
        <div className="chart-legend">
          {drawable.map((s) => (
            <span key={s.key} className="chart-legend__item">
              <span className="chart-legend__chip" style={{ background: s.color }} />
              {s.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default LineChart;
