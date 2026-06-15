import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { getMyMoods, logMood } from "../../services/moods.service";
import "./Moods.css";

const MOODS = [
  { type: "happy",   emoji: "😊", label: "Happy",   color: "#ffaa00", bg: "rgba(255,170,0,0.12)" },
  { type: "loved",   emoji: "🥰", label: "Loved",   color: "#ff5c8a", bg: "rgba(255,92,138,0.12)" },
  { type: "excited", emoji: "🤩", label: "Excited", color: "#7c5cff", bg: "rgba(124,92,255,0.12)" },
  { type: "sad",     emoji: "😔", label: "Sad",     color: "#4a90d9", bg: "rgba(74,144,217,0.12)" },
  { type: "anxious", emoji: "😰", label: "Anxious", color: "#32c36c", bg: "rgba(50,195,108,0.12)" },
  { type: "stressed",emoji: "😤", label: "Stressed",color: "#ff7043", bg: "rgba(255,112,67,0.12)" },
  { type: "angry",   emoji: "😠", label: "Angry",   color: "#ff5252", bg: "rgba(255,82,82,0.12)" },
];

const MOOD_MAP = Object.fromEntries(MOODS.map((m) => [m.type, m]));

const formatDate = (d) =>
  new Intl.DateTimeFormat("en-US", {
    month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  }).format(new Date(d));

const Moods = () => {
  const [moods, setMoods]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [logOpen, setLogOpen]   = useState(false);
  const [pickedType, setPickedType] = useState(null);
  const [intensity, setIntensity]   = useState(5);
  const [note, setNote]         = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState("");

  const fetchMoods = useCallback(async () => {
    try {
      const res = await getMyMoods();
      setMoods(res.data || []);
    } catch {
      setMoods([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMoods(); }, [fetchMoods]);

  const handleLog = async (e) => {
    e.preventDefault();
    if (!pickedType) { setFormError("Select a mood first"); return; }
    setSubmitting(true);
    setFormError("");
    try {
      await logMood({ moodType: pickedType, intensity, note: note.trim() });
      setPickedType(null);
      setIntensity(5);
      setNote("");
      setLogOpen(false);
      fetchMoods();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not save mood");
    } finally {
      setSubmitting(false);
    }
  };

  const openLog = () => { setLogOpen(true); setFormError(""); };
  const cancelLog = () => { setLogOpen(false); setFormError(""); setPickedType(null); setNote(""); setIntensity(5); };

  const picked = pickedType ? MOOD_MAP[pickedType] : null;

  return (
    <div className="moods-pg">
      <div className="moods-pg-content">

        {/* Header */}
        <div className="moods-pg-header">
          <div>
            <h1 className="moods-pg-title">Your Moods</h1>
            <Link to="/mood-analytics" className="moods-pg-analytics-link">
              📊 View Analytics
            </Link>
          </div>
          {!logOpen ? (
            <button className="moods-pg-btn-log" onClick={openLog}>+ Log Mood</button>
          ) : (
            <button className="moods-pg-btn-cancel" onClick={cancelLog}>Cancel</button>
          )}
        </div>

        {/* Log Form */}
        {logOpen && (
          <form className="moods-pg-form" onSubmit={handleLog}>
            <p className="moods-pg-form-q">How are you feeling right now?</p>
            <div className="moods-pg-type-grid">
              {MOODS.map(({ type, emoji, label, color, bg }) => (
                <button
                  key={type}
                  type="button"
                  className={`moods-pg-type-btn${pickedType === type ? " moods-pg-type-btn--on" : ""}`}
                  style={{ "--mc": color, "--mb": bg }}
                  onClick={() => setPickedType(type)}
                >
                  <span className="moods-pg-type-emoji">{emoji}</span>
                  <span className="moods-pg-type-name">{label}</span>
                </button>
              ))}
            </div>

            <div className="moods-pg-intensity-wrap">
              <div className="moods-pg-int-row">
                <span className="moods-pg-int-label">Intensity</span>
                <span
                  className="moods-pg-int-val"
                  style={{ color: picked ? picked.color : "var(--primary)" }}
                >
                  {intensity} / 10
                </span>
              </div>
              <input
                type="range" min={1} max={10} value={intensity}
                className="moods-pg-range"
                style={{
                  "--rv": `${((intensity - 1) / 9) * 100}%`,
                  "--rc": picked ? picked.color : "var(--primary)",
                }}
                onChange={(e) => setIntensity(Number(e.target.value))}
              />
            </div>

            <textarea
              className="moods-pg-note"
              placeholder="Add a note… (optional)"
              value={note}
              rows={2}
              maxLength={500}
              onChange={(e) => setNote(e.target.value)}
            />

            {formError && <p className="moods-pg-err">{formError}</p>}

            <button
              type="submit"
              className="moods-pg-submit"
              disabled={!pickedType || submitting}
              style={{ "--sc": picked ? picked.color : "var(--primary)" }}
            >
              {submitting ? "Saving…" : "Save Mood"}
            </button>
          </form>
        )}

        {/* List */}
        {loading ? (
          <div className="moods-pg-list">
            {[1, 2, 3, 4].map((i) => <div key={i} className="moods-pg-skeleton" />)}
          </div>
        ) : moods.length === 0 ? (
          <div className="moods-pg-empty">
            <span className="moods-pg-empty-emoji">🌈</span>
            <p className="moods-pg-empty-title">No moods logged yet</p>
            <p className="moods-pg-empty-sub">Start tracking your emotional journey.</p>
            {!logOpen && (
              <button className="moods-pg-empty-cta" onClick={openLog}>
                Log Your First Mood
              </button>
            )}
          </div>
        ) : (
          <div className="moods-pg-list">
            {moods.map((mood) => {
              const m = MOOD_MAP[mood.moodType] || { emoji: "😐", label: mood.moodType, color: "#888", bg: "rgba(0,0,0,0.06)" };
              return (
                <div
                  key={mood._id}
                  className="moods-pg-item"
                  style={{ "--mc": m.color, "--mb": m.bg }}
                >
                  <div className="moods-pg-item-icon">
                    <span>{m.emoji}</span>
                  </div>
                  <div className="moods-pg-item-body">
                    <div className="moods-pg-item-row">
                      <span className="moods-pg-item-type">{m.label}</span>
                      <span className="moods-pg-item-int">{mood.intensity}/10</span>
                    </div>
                    <div className="moods-pg-bar-track">
                      <div
                        className="moods-pg-bar-fill"
                        style={{ width: `${mood.intensity * 10}%`, background: m.color }}
                      />
                    </div>
                    {mood.note && <p className="moods-pg-item-note">{mood.note}</p>}
                    <span className="moods-pg-item-date">{formatDate(mood.createdAt)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Moods;
