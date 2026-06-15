import { Link } from "react-router-dom";
import "./QuickActionsCard.css";

const ACTIONS = [
  {
    to: "/moods",
    emoji: "😊",
    label: "Log Mood",
    color: "#FF5C8A",
    bg: "rgba(255,92,138,0.10)",
  },
  {
    to: "/memories",
    emoji: "📷",
    label: "Add Memory",
    color: "#7C5CFF",
    bg: "rgba(124,92,255,0.10)",
  },
  {
    to: "/chat",
    emoji: "💬",
    label: "Open Chat",
    color: "#32C36C",
    bg: "rgba(50,195,108,0.10)",
  },
  {
    to: "/ai-center",
    emoji: "✨",
    label: "AI Center",
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

export default QuickActionsCard;
