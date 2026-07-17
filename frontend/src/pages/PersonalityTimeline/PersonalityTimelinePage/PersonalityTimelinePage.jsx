import { useEffect, useState } from "react";

import BackHeader from "../../../components/common/BackHeader/BackHeader";
import LineChart from "../../../components/charts/LineChart";
import HeatmapCalendar from "../../../components/charts/HeatmapCalendar";
import { getPersonalityTimeline } from "../../../services/intelligence.service";

import "./PersonalityTimelinePage.css";

const PERIODS = [
  { key: 7, label: "Week" },
  { key: 30, label: "Month" },
  { key: 90, label: "3 Months" },
  { key: 365, label: "Year" },
];

const REFLECTION_DIMS = [
  { key: "mood", label: "Positivity", color: "var(--chart-1)" },
  { key: "stress", label: "Stress", color: "var(--chart-4)" },
  { key: "energy", label: "Energy", color: "var(--chart-3)" },
  { key: "relationshipSatisfaction", label: "Relationship confidence", color: "var(--chart-2)" },
  { key: "communicationRating", label: "Communication", color: "var(--chart-6)" },
];

const COMPARISON_LABELS = {
  emotion: "Emotional trend",
  maturity: "Maturity",
  relationshipHealth: "Relationship health",
  pulse: "Relationship pulse",
};

const toSeries = (key, label, color, rows) => ({
  key,
  label,
  color,
  points: (rows || []).map((r) => ({ x: r.day.slice(5), y: r.score ?? null })),
});

// Child remounted via key={days} — fresh loading state per period, no
// synchronous setState in effects (React-compiler-safe).
const TimelineBody = ({ days }) => {
  const [data, setData] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getPersonalityTimeline(days)
      .then((res) => {
        if (active) setData(res.data || null);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [days]);

  if (failed) return <div className="ptl-card ptl-empty">Trends aren't available right now — try again in a moment.</div>;
  if (!data) return <div className="ptl-skeleton" />;

  const userSeries = [
    toSeries("emotion", "Emotional trend", "var(--chart-1)", data.user?.emotion),
    toSeries("maturity", "Maturity", "var(--chart-2)", data.user?.maturity),
  ];

  const coupleSeries = data.couple
    ? [
        toSeries("pulse", "Pulse", "var(--chart-1)", data.couple.pulse),
        toSeries("relationshipHealth", "Health", "var(--chart-2)", data.couple.relationshipHealth),
        toSeries("trust", "Trust", "var(--chart-6)", data.couple.trust),
      ]
    : [];

  const reflectionSeries = REFLECTION_DIMS.map((d) => ({
    key: d.key,
    label: d.label,
    color: d.color,
    points: (data.reflections || []).map((r) => ({ x: r.day.slice(5), y: r[d.key] ?? null })),
  }));

  const comparisons = Object.entries(data.comparison || {}).filter(([, v]) => v);

  return (
    <div>
      {comparisons.length > 0 && (
        <div className="ptl-card">
          <h3 className="ptl-card__title">↔️ vs previous period</h3>
          <div className="ptl-compare-grid">
            {comparisons.map(([key, c]) => (
              <div key={key} className="ptl-compare">
                <span className="ptl-compare__label">{COMPARISON_LABELS[key] || key}</span>
                <span className="ptl-compare__value">
                  {c.current}
                  <em className={c.delta >= 0 ? "ptl-delta ptl-delta--up" : "ptl-delta ptl-delta--down"}>
                    {c.delta >= 0 ? `+${c.delta}` : c.delta}
                  </em>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="ptl-card">
        <h3 className="ptl-card__title">🧭 Your behavioural trends</h3>
        <LineChart series={userSeries} emptyText="Your emotional and maturity trends appear after a few active days." />
      </div>

      {data.couple && (
        <div className="ptl-card">
          <h3 className="ptl-card__title">💞 Your relationship trends</h3>
          <LineChart series={coupleSeries} emptyText="Couple trends appear once you're active together for a few days." />
        </div>
      )}

      <div className="ptl-card">
        <h3 className="ptl-card__title">🪞 Self-reported dimensions (1–10)</h3>
        <LineChart
          series={reflectionSeries}
          yMax={10}
          emptyText="Log a few Daily Reflections and these trends build themselves."
        />
      </div>

      <div className="ptl-card">
        <h3 className="ptl-card__title">🔥 Emotional heatmap</h3>
        <HeatmapCalendar
          values={(data.user?.emotion || []).map((r) => ({ day: r.day, value: r.score || 0 }))}
          label="emotional score"
          color="var(--chart-2)"
          emptyText="Your emotional heatmap appears after a few active days."
        />
      </div>

      <p className="ptl-basis">{data.basis}</p>
    </div>
  );
};

const PersonalityTimelinePage = () => {
  const [days, setDays] = useState(30);

  return (
    <div className="ptl-page">
      <BackHeader
        title="Personality Timeline"
        subtitle="Trends, not verdicts — never a personality test"
        fallback="/dashboard"
      />
      <div className="ptl-page__content">
        <div className="ptl-periods" role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={days === p.key}
              className={`ptl-period ${days === p.key ? "ptl-period--active" : ""}`}
              onClick={() => setDays(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <TimelineBody key={days} days={days} />
      </div>
    </div>
  );
};

export default PersonalityTimelinePage;
