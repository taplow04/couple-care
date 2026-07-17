import { useEffect, useState, useCallback } from "react";

import BackHeader from "../../../components/common/BackHeader/BackHeader";
import AIReport from "../../../components/ai/AIReport/AIReport";
import LineChart from "../../../components/charts/LineChart";
import HeatmapCalendar from "../../../components/charts/HeatmapCalendar";
import {
  saveReflection,
  getTodayReflection,
  getReflectionHistory,
  getReflectionReport,
} from "../../../services/reflection.service";

import "./ReflectionPage.css";

// ── the daily check-in fields ──
const SLIDERS = [
  { key: "energy", label: "Energy", emoji: "⚡" },
  { key: "stress", label: "Stress", emoji: "🌊" },
  { key: "sleepQuality", label: "Sleep", emoji: "😴" },
  { key: "productivity", label: "Productivity", emoji: "✅" },
  { key: "exercise", label: "Exercise", emoji: "💪" },
  { key: "mood", label: "Mood", emoji: "😊" },
  { key: "relationshipSatisfaction", label: "Relationship", emoji: "❤️" },
  { key: "communicationRating", label: "Communication", emoji: "💬" },
];

const TEXTS = [
  { key: "gratitude", label: "Gratitude", placeholder: "One thing you're grateful for today…" },
  { key: "partnerAppreciation", label: "Partner appreciation", placeholder: "Something your partner did that you appreciated…" },
  { key: "highlight", label: "Daily highlight", placeholder: "The best moment of today…" },
  { key: "challenge", label: "Daily challenge", placeholder: "Something that was hard today…" },
  { key: "notes", label: "Free notes", placeholder: "Anything else on your mind…" },
];

const TREND_SERIES = [
  { key: "mood", label: "Mood", color: "var(--chart-1)" },
  { key: "energy", label: "Energy", color: "var(--chart-3)" },
  { key: "stress", label: "Stress", color: "var(--chart-4)" },
  { key: "relationshipSatisfaction", label: "Relationship", color: "var(--chart-2)" },
];

const emptyForm = () => ({
  energy: 5, stress: 5, sleepQuality: 5, productivity: 5, exercise: 0,
  mood: 5, relationshipSatisfaction: 5, communicationRating: 5,
  gratitude: "", partnerAppreciation: "", highlight: "", challenge: "", notes: "",
});

// ── Today tab: the check-in form ──
const TodayForm = ({ initial, onSaved }) => {
  const [form, setForm] = useState(() => (initial ? { ...emptyForm(), ...pickFields(initial) } : emptyForm()));
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState(initial ? initial.updatedAt : null);
  const [error, setError] = useState(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await saveReflection(form);
      setSavedAt(res.data?.updatedAt || new Date().toISOString());
      onSaved?.(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save — try again.");
    } finally {
      setSaving(false);
    }
  }, [form, onSaved]);

  return (
    <div className="refl-form">
      {savedAt && (
        <div className="refl-saved-banner">
          ✅ Saved for today — you can update it any time before midnight.
        </div>
      )}

      <div className="refl-card">
        <h3 className="refl-card__title">How was today?</h3>
        {SLIDERS.map((s) => (
          <label key={s.key} className="refl-slider">
            <span className="refl-slider__label">
              <span>{s.emoji} {s.label}</span>
              <strong>{form[s.key]}</strong>
            </span>
            <input
              type="range"
              min={s.key === "exercise" ? 0 : 1}
              max={10}
              value={form[s.key]}
              onChange={(e) => set(s.key, Number(e.target.value))}
            />
          </label>
        ))}
      </div>

      <div className="refl-card">
        <h3 className="refl-card__title">In your words <span className="refl-optional">(all optional)</span></h3>
        {TEXTS.map((t) => (
          <label key={t.key} className="refl-text">
            <span>{t.label}</span>
            <textarea
              rows={2}
              maxLength={t.key === "notes" ? 1000 : 500}
              placeholder={t.placeholder}
              value={form[t.key]}
              onChange={(e) => set(t.key, e.target.value)}
            />
          </label>
        ))}
      </div>

      {error && <p className="refl-error">{error}</p>}
      <button className="refl-save-btn" onClick={handleSave} disabled={saving}>
        {saving ? "Saving…" : savedAt ? "Update today's reflection" : "Save today's reflection"}
      </button>
    </div>
  );
};

const pickFields = (doc) => {
  const out = {};
  for (const s of SLIDERS) if (doc[s.key] != null) out[s.key] = doc[s.key];
  for (const t of TEXTS) if (doc[t.key]) out[t.key] = doc[t.key];
  return out;
};

// ── Trends tab (remounted via key so fetch state stays lint-clean) ──
const TrendsTab = () => {
  const [history, setHistory] = useState(null);

  useEffect(() => {
    let active = true;
    getReflectionHistory(120)
      .then((res) => {
        if (active) setHistory(res.data || []);
      })
      .catch(() => {
        if (active) setHistory([]);
      });
    return () => {
      active = false;
    };
  }, []);

  if (history === null) return <div className="refl-skeleton" />;

  const last30 = history.slice(-30);
  const series = TREND_SERIES.map((s) => ({
    ...s,
    points: last30.map((r) => ({ x: r.day.slice(5), y: r[s.key] ?? null })),
  }));

  return (
    <div>
      <div className="refl-card">
        <h3 className="refl-card__title">📈 Last 30 days (1–10)</h3>
        <LineChart series={series} yMax={10} yMin={0} />
      </div>
      <div className="refl-card">
        <h3 className="refl-card__title">🗓 Reflection calendar</h3>
        <HeatmapCalendar
          values={history.map((r) => ({ day: r.day, value: 1 }))}
          label="reflections"
          color="var(--chart-1)"
          emptyText="Your first reflection will appear here."
        />
      </div>
    </div>
  );
};

// ── Reports tab ──
const ReportTab = ({ period }) => {
  const [report, setReport] = useState(null);

  useEffect(() => {
    let active = true;
    getReflectionReport(period)
      .then((res) => {
        if (active) setReport(res.data || null);
      })
      .catch(() => {
        if (active) setReport({ stats: null });
      });
    return () => {
      active = false;
    };
  }, [period]);

  if (report === null) return <div className="refl-skeleton" />;
  const stats = report.stats;
  if (!stats || stats.entries === 0) {
    return <div className="refl-card refl-empty">No entries this {period === "monthly" ? "month" : "week"} yet — your report builds itself as you reflect.</div>;
  }

  return (
    <div>
      <div className="refl-card">
        <h3 className="refl-card__title">{period === "monthly" ? "🗓 Monthly report" : "📅 Weekly report"}</h3>
        <div className="refl-stats-row">
          <div className="refl-stat"><strong>{stats.entries}</strong><span>entries</span></div>
          <div className="refl-stat"><strong>{stats.completionRate}%</strong><span>completion</span></div>
          <div className="refl-stat"><strong>{stats.streak}</strong><span>day streak</span></div>
        </div>
        <div className="refl-avg-grid">
          {SLIDERS.map((s) => {
            const avg = stats.averages?.[s.key];
            const delta = stats.deltas?.[s.key];
            if (avg == null) return null;
            return (
              <div key={s.key} className="refl-avg">
                <span className="refl-avg__label">{s.emoji} {s.label}</span>
                <span className="refl-avg__value">
                  {avg}
                  {delta != null && delta !== 0 && (
                    <em className={delta > 0 ? "refl-delta refl-delta--up" : "refl-delta refl-delta--down"}>
                      {delta > 0 ? `+${delta}` : delta}
                    </em>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {report.analysis && (
        <div className="refl-card">
          <h3 className="refl-card__title">🧠 AI trend analysis</h3>
          <AIReport text={report.analysis} />
        </div>
      )}
    </div>
  );
};

// ── Page ──
const TABS = [
  { key: "today", label: "Today" },
  { key: "trends", label: "Trends" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
];

const ReflectionPage = () => {
  const [tab, setTab] = useState("today");
  const [today, setToday] = useState(undefined); // undefined = loading

  useEffect(() => {
    let active = true;
    getTodayReflection()
      .then((res) => {
        if (active) setToday(res.data || null);
      })
      .catch(() => {
        if (active) setToday(null);
      });
    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="refl-page">
      <BackHeader
        title="Daily Reflection"
        subtitle="One minute a day, just for you"
        fallback="/dashboard"
      />
      <div className="refl-page__content">
        <div className="refl-tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`refl-tab ${tab === t.key ? "refl-tab--active" : ""}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "today" &&
          (today === undefined ? (
            <div className="refl-skeleton" />
          ) : (
            <TodayForm key={today?._id || "new"} initial={today} onSaved={setToday} />
          ))}
        {tab === "trends" && <TrendsTab key="trends" />}
        {tab === "weekly" && <ReportTab key="weekly" period="weekly" />}
        {tab === "monthly" && <ReportTab key="monthly" period="monthly" />}

        <p className="refl-privacy">
          🔒 Reflections are yours alone — they're analysed only inside CoupleCare
          and never read from any other app.
        </p>
      </div>
    </div>
  );
};

export default ReflectionPage;
