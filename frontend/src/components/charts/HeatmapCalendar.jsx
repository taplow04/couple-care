import "./charts.css";

/**
 * GitHub-style activity/mood calendar. Sequential color = ONE hue, light→dark
 * (opacity steps of a single chart hue — never a rainbow). Empty days use the
 * recessive grid token. Native per-cell tooltips (day + value).
 *
 * values: [{ day: "YYYY-MM-DD", value: number }] — anything missing is 0.
 */
const DAY_MS = 86400000;
const STEPS = [0.18, 0.38, 0.62, 0.85, 1]; // 5-step sequential ramp (one hue)

const dayKey = (t) => new Date(t).toISOString().slice(0, 10);

// Time anchor captured at module load (render must stay pure — no Date.now()
// inside the component). A heatmap anchored to app-open day is exact enough.
const NOW = Date.now();

const HeatmapCalendar = ({
  values = [],
  weeks = 16,
  color = "var(--chart-5)",
  label = "activity",
  emptyText = "No activity recorded yet.",
}) => {
  const byDay = {};
  let max = 0;
  for (const v of values) {
    byDay[v.day] = (byDay[v.day] || 0) + (v.value || 0);
    if (byDay[v.day] > max) max = byDay[v.day];
  }

  if (max === 0) return <div className="chart-empty">{emptyText}</div>;

  // Build week columns ending today (UTC), oldest → newest.
  const todayDow = new Date(NOW).getUTCDay();
  const end = NOW + (6 - todayDow) * DAY_MS; // pad the last column to Saturday
  const start = end - (weeks * 7 - 1) * DAY_MS;

  const columns = [];
  for (let w = 0; w < weeks; w++) {
    const col = [];
    for (let d = 0; d < 7; d++) {
      const t = start + (w * 7 + d) * DAY_MS;
      const key = dayKey(t);
      const inRange = t <= NOW;
      const value = byDay[key] || 0;
      col.push({ key, value, inRange });
    }
    columns.push(col);
  }

  const stepFor = (value) => {
    if (value <= 0) return null;
    const idx = Math.min(STEPS.length - 1, Math.floor((value / max) * STEPS.length));
    return STEPS[idx];
  };

  return (
    <div className="chart">
      <div className="heatmap" role="img" aria-label={`Calendar heatmap of ${label} over ${weeks} weeks`}>
        {columns.map((col, w) => (
          <div key={w} className="heatmap__week">
            {col.map((cell) => (
              <div
                key={cell.key}
                className="heatmap__cell"
                style={
                  cell.inRange && stepFor(cell.value) != null
                    ? { background: color, opacity: stepFor(cell.value) }
                    : cell.inRange
                      ? undefined
                      : { opacity: 0.25 }
                }
                title={cell.inRange ? `${cell.key}: ${cell.value} ${label}` : undefined}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="heatmap-meta">
        <span>{weeks} weeks · {label}</span>
        <span className="heatmap-meta__scale">
          Less
          {STEPS.map((o) => (
            <span key={o} className="heatmap__cell" style={{ background: color, opacity: o }} />
          ))}
          More
        </span>
      </div>
    </div>
  );
};

export default HeatmapCalendar;
