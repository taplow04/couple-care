import { useState, useEffect } from "react";
import { loadHistory, removeFromHistory, clearHistory } from "../../../utils/aiHistory";
import InsightCard from "../InsightCard/InsightCard";
import "./AIHistory.css";

const TYPE_CFG = {
  coach:    { emoji: "🤖", label: "AI Coach",  color: "#7c5cff", bg: "rgba(124,92,255,0.1)" },
  analysis: { emoji: "🧠", label: "Analysis",  color: "#ff5c8a", bg: "rgba(255,92,138,0.1)" },
  recap:    { emoji: "📸", label: "Memory",    color: "#ff8c00", bg: "rgba(255,140,0,0.1)"  },
  insight:  { emoji: "✨", label: "Insight",   color: "#7c5cff", bg: "rgba(124,92,255,0.1)" },
  starter:  { emoji: "💬", label: "Starter",   color: "#32c36c", bg: "rgba(50,195,108,0.1)" },
  growth:   { emoji: "🌱", label: "Growth",    color: "#32c36c", bg: "rgba(50,195,108,0.1)" },
};

const formatAge = (iso) => {
  const h = Math.floor((Date.now() - new Date(iso)) / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  if (h < 48) return "yesterday";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
};

const AIHistory = ({ refreshTrigger }) => {
  const [items, setItems]       = useState([]);
  const [card, setCard]         = useState(null);
  const [copied, setCopied]     = useState(null);
  const [confirmClear, setCC]   = useState(false);

  useEffect(() => {
    setItems(loadHistory());
  }, [refreshTrigger]);

  const handleDelete = (id) => setItems(removeFromHistory(id));

  const handleCopy = async (text, id) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const handleClearAll = () => {
    clearHistory();
    setItems([]);
    setCC(false);
  };

  if (items.length === 0) {
    return (
      <section className="ah">
        <div className="ah__head">
          <h2 className="ah__title">📌 Saved Insights</h2>
          <p className="ah__sub">Your AI insights saved for later</p>
        </div>
        <div className="ah__empty">
          <span className="ah__empty-ico">🗂️</span>
          <h3 className="ah__empty-title">Nothing saved yet</h3>
          <p className="ah__empty-text">
            Tap the 💾 save button on any AI response in Coach, Memory, or Insights to collect them here.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="ah">
      {card && <InsightCard insight={card} onClose={() => setCard(null)} />}

      <div className="ah__head">
        <div>
          <h2 className="ah__title">📌 Saved Insights</h2>
          <p className="ah__sub">{items.length} insight{items.length !== 1 ? "s" : ""} saved</p>
        </div>
        {confirmClear ? (
          <div className="ah__confirm">
            <span className="ah__confirm-q">Clear all?</span>
            <button className="ah__confirm-yes" onClick={handleClearAll}>Yes</button>
            <button className="ah__confirm-no" onClick={() => setCC(false)}>No</button>
          </div>
        ) : (
          <button className="ah__clear-btn" onClick={() => setCC(true)}>Clear All</button>
        )}
      </div>

      <div className="ah__list">
        {items.map((item) => {
          const cfg = TYPE_CFG[item.type] ?? TYPE_CFG.insight;
          const isCopied = copied === item.id;
          return (
            <div key={item.id} className="ah-item">
              <div className="ah-item__top">
                <span className="ah-item__badge" style={{ color: cfg.color, background: cfg.bg }}>
                  {cfg.emoji} {cfg.label}
                </span>
                <span className="ah-item__date">{formatAge(item.savedAt)}</span>
              </div>
              <h3 className="ah-item__title">{item.title}</h3>
              <p className="ah-item__text">{item.content}</p>
              <div className="ah-item__actions">
                <button className="ah-item__btn" onClick={() => setCard(item)}>
                  🪪 View Card
                </button>
                <button
                  className={`ah-item__btn ${isCopied ? "ah-item__btn--done" : ""}`}
                  onClick={() => handleCopy(item.content, item.id)}
                >
                  {isCopied ? "✓ Copied" : "📋 Copy"}
                </button>
                <button
                  className="ah-item__btn ah-item__btn--del"
                  onClick={() => handleDelete(item.id)}
                  aria-label="Delete"
                >
                  🗑
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default AIHistory;
