import { memo } from "react";
import { Link } from "react-router-dom";
import "./QuickActionsCard.css";

// Relationship-centric shortcuts. Journey now lives here (moved off the bottom
// nav, which gained Explore). These surface the emotional, memory-rich corners
// of the app that have no dedicated nav home. `key` is the label (some routes
// repeat, e.g. AI Center hosts both Coach and Letters).
const ACTIONS = [
  {
    // Unified relationship-memories hub (Today · Month · Year · Timeline) —
    // replaces the separate Our Day / Our Month / Our Year cards.
    to: "/our-moments",
    emoji: "❤️",
    label: "Our Moments",
    color: "#FF5C8A",
    bg: "rgba(255,92,138,0.10)",
  },
  {
    to: "/journey",
    emoji: "🧭",
    label: "Journey",
    color: "#32C36C",
    bg: "rgba(50,195,108,0.10)",
  },
  {
    to: "/bucket-list",
    emoji: "🪄",
    label: "Bucket List",
    color: "#7C5CFF",
    bg: "rgba(124,92,255,0.10)",
  },
  {
    to: "/relationship",
    emoji: "🖼️",
    label: "Gallery",
    color: "#32C36C",
    bg: "rgba(50,195,108,0.10)",
  },
  {
    to: "/ai-center?tab=coach",
    emoji: "🤖",
    label: "AI Coach",
    color: "#FFAA00",
    bg: "rgba(255,170,0,0.10)",
  },
  {
    to: "/memories",
    emoji: "📷",
    label: "Memories",
    color: "#7C5CFF",
    bg: "rgba(124,92,255,0.10)",
  },
  {
    to: "/ai-center?tab=letter",
    emoji: "💌",
    label: "Love Letters",
    color: "#FF5C8A",
    bg: "rgba(255,92,138,0.10)",
  },
];

const QuickActionsCard = () => {
  return (
    <div className="qac-card">
      <p className="qac-label">Quick Access</p>
      <div className="qac-grid">
        {ACTIONS.map(({ to, emoji, label, color, bg }) => (
          <Link
            key={to}
            to={to}
            className="qac-item"
            style={{ "--qac-color": color, "--qac-bg": bg }}
            aria-label={label}
          >
            <span className="qac-icon-wrap">
              <span className="qac-emoji" role="img" aria-hidden="true">
                {emoji}
              </span>
            </span>
            <span className="qac-item-label">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
};

// Static content + no props → memoise so it never re-renders on the dashboard's
// frequent live (health/engagement) updates.
export default memo(QuickActionsCard);
