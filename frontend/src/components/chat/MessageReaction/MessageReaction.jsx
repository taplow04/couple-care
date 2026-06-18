import "./MessageReaction.css";

// The fixed reaction set (must match the server's ALLOWED_REACTIONS).
export const REACTIONS = ["❤️", "👍", "😂", "😢", "😍"];

/**
 * Horizontal emoji picker shown inside the long-press menu.
 * Props: onPick(emoji), mine (the current user's active emoji, for highlight).
 */
export const ReactionPicker = ({ onPick, mine }) => (
  <div className="reaction-picker" role="menu" aria-label="React">
    {REACTIONS.map((emoji) => (
      <button
        key={emoji}
        type="button"
        className={`reaction-picker__btn ${mine === emoji ? "reaction-picker__btn--active" : ""}`}
        onClick={() => onPick(emoji)}
        aria-label={`React ${emoji}`}
      >
        {emoji}
      </button>
    ))}
  </div>
);

/**
 * Aggregated reaction badge rendered on a bubble. Groups identical emojis and
 * shows a count when more than one.
 * Props: reactions [{ userId, emoji }], onClick (re-open picker), mine (bool).
 */
const ReactionBadge = ({ reactions, onClick, mineHas }) => {
  if (!reactions || reactions.length === 0) return null;

  const counts = reactions.reduce((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts);

  return (
    <button
      type="button"
      className={`reaction-badge ${mineHas ? "reaction-badge--mine" : ""} cc-anim-pop`}
      onClick={onClick}
      aria-label="Reactions"
    >
      {entries.map(([emoji, count]) => (
        <span key={emoji} className="reaction-badge__item">
          <span className="reaction-badge__emoji">{emoji}</span>
          {count > 1 && <span className="reaction-badge__count">{count}</span>}
        </span>
      ))}
    </button>
  );
};

export default ReactionBadge;
