import { useEffect, useState } from "react";
import BackHeader from "../../../components/common/BackHeader/BackHeader";
import SleepInsights from "../../../components/sleep/SleepInsights/SleepInsights";
import {
  logSleep,
  getMySleep,
  getSleepAnalysis,
  deleteSleep,
} from "../../../services/sleep.service";
import "./SleepPage.css";

// Format a Date as a value for <input type="datetime-local">.
const toLocalInput = (d) => {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const defaultSleep = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  d.setHours(23, 0, 0, 0);
  return toLocalInput(d);
};
const defaultWake = () => {
  const d = new Date();
  d.setHours(7, 0, 0, 0);
  return toLocalInput(d);
};

const fmtNight = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

const SleepPage = () => {
  const [sleepAt, setSleepAt] = useState(defaultSleep);
  const [wakeAt, setWakeAt] = useState(defaultWake);
  const [quality, setQuality] = useState(3);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [analysis, setAnalysis] = useState(null);
  const [insightsLoading, setInsightsLoading] = useState(true);

  const loadLogs = () => getMySleep().then((r) => setLogs(r.data || [])).catch(() => {});
  const loadInsights = () => {
    setInsightsLoading(true);
    getSleepAnalysis()
      .then((r) => {
        setStats(r.data?.stats || null);
        setAnalysis(r.data?.analysis || null);
      })
      .catch(() => {})
      .finally(() => setInsightsLoading(false));
  };

  // Initial load — all setState happens in async callbacks (insightsLoading
  // already starts true) to avoid synchronous setState in the effect body.
  useEffect(() => {
    let alive = true;
    getMySleep()
      .then((r) => alive && setLogs(r.data || []))
      .catch(() => {});
    getSleepAnalysis()
      .then((r) => {
        if (!alive) return;
        setStats(r.data?.stats || null);
        setAnalysis(r.data?.analysis || null);
      })
      .catch(() => {})
      .finally(() => alive && setInsightsLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  // Live preview of hours from the two datetime inputs.
  const previewHours = (() => {
    let h = (new Date(wakeAt) - new Date(sleepAt)) / 3600000;
    if (Number.isNaN(h)) return null;
    if (h < 0) h += 24;
    return Math.round(h * 10) / 10;
  })();

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    try {
      await logSleep({ sleepAt, wakeAt, quality, note: note.trim() });
      setNote("");
      await loadLogs();
      loadInsights();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setLogs((prev) => prev.filter((l) => l._id !== id));
    try {
      await deleteSleep(id);
      loadInsights();
    } catch {
      loadLogs();
    }
  };

  return (
    <div className="sleeppage">
      <BackHeader title="Sleep Tracker" subtitle="Rest well, together" fallback="/dashboard" />

      <div className="sleeppage__body">
        <form className="sleeppage__form" onSubmit={submit}>
          <h2 className="sleeppage__form-title">😴 Log last night</h2>

          <div className="sleeppage__times">
            <label className="sleeppage__field">
              <span>Fell asleep</span>
              <input type="datetime-local" value={sleepAt} onChange={(e) => setSleepAt(e.target.value)} />
            </label>
            <label className="sleeppage__field">
              <span>Woke up</span>
              <input type="datetime-local" value={wakeAt} onChange={(e) => setWakeAt(e.target.value)} />
            </label>
          </div>

          {previewHours != null && (
            <p className="sleeppage__hours">≈ {previewHours} hours of sleep</p>
          )}

          <div className="sleeppage__quality">
            <span className="sleeppage__quality-label">Quality</span>
            <div className="sleeppage__stars">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  type="button"
                  key={n}
                  className={`sleeppage__star ${n <= quality ? "sleeppage__star--on" : ""}`}
                  onClick={() => setQuality(n)}
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          <input
            className="sleeppage__note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Note (optional) — dreams, how you felt…"
            maxLength={300}
          />

          <button className="sleeppage__submit" type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save Sleep"}
          </button>
        </form>

        <section className="sleeppage__section">
          <h2 className="sleeppage__section-title">Insights</h2>
          <SleepInsights stats={stats} analysis={analysis} loading={insightsLoading} />
        </section>

        {logs.length > 0 && (
          <section className="sleeppage__section">
            <h2 className="sleeppage__section-title">Recent nights</h2>
            <div className="sleeppage__logs">
              {logs.map((l) => (
                <div key={l._id} className="sleep-log">
                  <div className="sleep-log__main">
                    <span className="sleep-log__hours">{l.hours}h</span>
                    <div className="sleep-log__meta">
                      <span className="sleep-log__night">{fmtNight(l.sleepAt)}</span>
                      <span className="sleep-log__quality">{"★".repeat(l.quality)}</span>
                    </div>
                  </div>
                  <button
                    className="sleep-log__del"
                    onClick={() => handleDelete(l._id)}
                    aria-label="Delete log"
                  >
                    🗑
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
};

export default SleepPage;
