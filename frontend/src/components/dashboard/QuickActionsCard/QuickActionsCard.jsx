import { memo } from "react";
import { Link } from "react-router-dom";
import "./QuickActionsCard.css";

// Relationship-centric shortcuts. Mood / AI Center / Chat were dropped — they're
// already one tap away (bottom nav + the TopHeader chat icon). These surface the
// emotional, memory-rich corners of the app that have no nav home.
const ACTIONS = [
  {
    to: "/our-day",
    emoji: "❤️",
    label: "Our Day",
    color: "#FF5C8A",
    bg: "rgba(255,92,138,0.10)",
  },
  {
    to: "/our-day?replay=month",
    emoji: "🗓️",
    label: "Our Month",
    color: "#7C5CFF",
    bg: "rgba(124,92,255,0.10)",
  },
  {
    to: "/our-day?replay=year",
    emoji: "✨",
    label: "Our Year",
    color: "#FFAA00",
    bg: "rgba(255,170,0,0.10)",
  },
  {
    to: "/journey",
    emoji: "🧭",
    label: "Couple Timeline",
    color: "#32C36C",
    bg: "rgba(50,195,108,0.10)",
  },
  {
    to: "/moments",
    emoji: "🌟",
    label: "Story Highlights",
    color: "#FF5C8A",
    bg: "rgba(255,92,138,0.10)",
  },
  {
    to: "/memories",
    emoji: "📷",
    label: "Memories",
    color: "#7C5CFF",
    bg: "rgba(124,92,255,0.10)",
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
