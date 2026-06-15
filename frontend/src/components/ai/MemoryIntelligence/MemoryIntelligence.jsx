import { useState } from "react";
import { addToHistory } from "../../../utils/aiHistory";
import InsightCard from "../InsightCard/InsightCard";
import "./MemoryIntelligence.css";

const MEMORY_TYPES = [
  { type: "anniversary", emoji: "💍", color: "#ff5c8a" },
  { type: "birthday",    emoji: "🎂", color: "#ffaa00" },
  { type: "trip",        emoji: "✈️", color: "#7c5cff" },
  { type: "date",        emoji: "🌹", color: "#ff5c8a" },
  { type: "milestone",   emoji: "🌟", color: "#ff8c00" },
  { type: "gift",        emoji: "🎁", color: "#32c36c" },
  { type: "proposal",    emoji: "💎", color: "#c94bcc" },
  { type: "other",       emoji: "📸", color: "#888899" },
];

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M21 2v6h-6M3 22v-6h6M3.5 9a9 9 0 0 1 14.83-3.36L21 8M20.5 15a9 9 0 0 1-14.83 3.36L3 16"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SaveIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CardIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const MemoryIntelligence = ({ recap, memStats, loading, onRefresh, onSaved }) => {
  const [card, setCard]   = useState(null);
  const [saved, setSaved] = useState(false);

  const total     = memStats?.totalMemories ?? 0;
  const typeData  = MEMORY_TYPES.filter((t) => (memStats?.[t.type] ?? 0) > 0);
  const maxCount  = typeData.length > 0 ? Math.max(...typeData.map((t) => memStats[t.type])) : 1;

  const handleSave = () => {
    if (!recap) return;
    addToHistory({ type: "recap", title: "Memory Intelligence", content: recap, emoji: "📸" });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    onSaved?.();
  };

  const openCard = () => {
    if (!recap) return;
    setCard({ type: "recap", title: "Our Memory Story", content: recap, emoji: "📸", savedAt: new Date().toISOString() });
  };

  return (
    <section className="mi2">
      {card && <InsightCard insight={card} onClose={() => setCard(null)} />}

      <div className="mi2__head">
        <div className="mi2__title-row">
          <span className="mi2__ico">📸</span>
          <div>
            <h2 className="mi2__title">Memory Intelligence</h2>
            <p className="mi2__sub">AI recap of your shared story</p>
          </div>
        </div>
        <button
          className={`mi2__refresh ${loading ? "mi2__refresh--spin" : ""}`}
          onClick={onRefresh}
          disabled={loading}
          aria-label="Regenerate memory recap"
        >
          <RefreshIcon />
        </button>
      </div>

      <div className="mi2__card">
        {/* Stats */}
        {!loading && total > 0 && (
          <div className="mi2__stats">
            <div className="mi2__total-block">
              <span className="mi2__total-num">{total}</span>
              <span className="mi2__total-lbl">Memories Together</span>
            </div>
            {typeData.length > 0 && (
              <div className="mi2__bars">
                {typeData.slice(0, 4).map((t) => {
                  const pct = Math.round((memStats[t.type] / maxCount) * 100);
                  return (
                    <div key={t.type} className="mi2-bar">
                      <div className="mi2-bar__row">
                        <span className="mi2-bar__emoji">{t.emoji}</span>
                        <span className="mi2-bar__type">{t.type}</span>
                        <span className="mi2-bar__count">{memStats[t.type]}</span>
                      </div>
                      <div className="mi2-bar__track">
                        <div className="mi2-bar__fill" style={{ width: `${pct}%`, background: t.color }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Recap */}
        <div className="mi2__recap">
          <div className="mi2__recap-head">
            <span className="mi2__badge">🧠 AI Recap</span>
            {!loading && recap && (
              <div className="mi2__recap-acts">
                <button className="mi2__act" onClick={openCard} aria-label="View as card"><CardIcon /></button>
                <button
                  className={`mi2__act ${saved ? "mi2__act--done" : ""}`}
                  onClick={handleSave}
                  aria-label="Save to history"
                >
                  {saved ? "✓" : <SaveIcon />}
                </button>
              </div>
            )}
          </div>

          {loading ? (
            <div className="mi2-shimmer">
              {["94%", "100%", "82%", "90%", "66%"].map((w, i) => (
                <div key={i} className="mi2-shimmer__line" style={{ width: w }} />
              ))}
            </div>
          ) : recap ? (
            <p className="mi2__body">{recap}</p>
          ) : (
            <div className="mi2__empty">
              <span className="mi2__empty-ico">🗓️</span>
              <p className="mi2__empty-txt">
                Add memories of your dates, trips, and special moments to receive an AI recap of your shared story.
              </p>
            </div>
          )}
        </div>

        {/* Type pills */}
        {!loading && (
          <div className="mi2__pills">
            {MEMORY_TYPES.map((t) => (
              <div key={t.type} className="mi2__pill" style={{ color: t.color, background: `${t.color}14` }}>
                {t.emoji} {t.type}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};

export default MemoryIntelligence;
