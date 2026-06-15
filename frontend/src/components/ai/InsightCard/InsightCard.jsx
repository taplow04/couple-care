import { useEffect, useRef, useState } from "react";
import "./InsightCard.css";

const TYPE_MAP = {
  coach:    { emoji: "🤖", label: "AI Coach",     grad: "linear-gradient(135deg, #7c5cff 0%, #c94bcc 55%, #ff5c8a 100%)" },
  analysis: { emoji: "🧠", label: "Mood Analysis", grad: "linear-gradient(135deg, #1e1060 0%, #7c5cff 55%, #ff5c8a 100%)" },
  recap:    { emoji: "📸", label: "Memory Recap",  grad: "linear-gradient(135deg, #ff8c00 0%, #ffaa00 50%, #ff5c8a 100%)" },
  insight:  { emoji: "✨", label: "AI Insight",    grad: "linear-gradient(135deg, #1e1060 0%, #7c5cff 100%)" },
  starter:  { emoji: "💬", label: "Conversation",  grad: "linear-gradient(135deg, #32c36c 0%, #7c5cff 100%)" },
  growth:   { emoji: "🌱", label: "Growth Tip",    grad: "linear-gradient(135deg, #1b5e20 0%, #32c36c 100%)" },
};

const InsightCard = ({ insight, onClose }) => {
  const [copied, setCopied] = useState(false);
  const timer = useRef(null);
  const cfg = TYPE_MAP[insight?.type] ?? TYPE_MAP.insight;

  useEffect(() => {
    const esc = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", esc);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(insight.content);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title: `CoupleCare – ${insight.title}`, text: insight.content });
        return;
      } catch {}
    }
    handleCopy();
  };

  if (!insight) return null;

  return (
    <div className="ic-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="ic-modal" onClick={(e) => e.stopPropagation()}>
        <button className="ic-close" onClick={onClose} aria-label="Close">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
          </svg>
        </button>

        <div className="ic-card" style={{ background: cfg.grad }}>
          <div className="ic-card__body">
            <span className="ic-badge">{cfg.emoji} {cfg.label}</span>
            <h3 className="ic-title">{insight.title}</h3>
            <p className="ic-content">{insight.content}</p>
            <div className="ic-footer">
              <span className="ic-brand">CoupleCare AI</span>
              <span className="ic-date">
                {new Date(insight.savedAt || Date.now()).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
              </span>
            </div>
          </div>
        </div>

        <div className="ic-actions">
          <button className={`ic-btn ${copied ? "ic-btn--done" : ""}`} onClick={handleCopy}>
            {copied ? "✓ Copied!" : "📋 Copy Text"}
          </button>
          <button className="ic-btn ic-btn--share" onClick={handleShare}>
            🔗 Share
          </button>
        </div>
      </div>
    </div>
  );
};

export default InsightCard;
