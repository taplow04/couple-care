import "./MomentReaction.css";

// The fixed couple reaction set (must match backend moment.constants).
const MOMENT_REACTIONS = ["❤️", "🥰", "😘", "😂", "🥹", "🤗"];

/**
 * Reaction picker shown in the viewer for a PARTNER's moment. `active` is the
 * emoji the current user already chose (highlighted). Tapping toggles it.
 */
const MomentReaction = ({ active, onReact }) => (
  <div className="moment-reaction" role="group" aria-label="React to this Moment">
    {MOMENT_REACTIONS.map((emoji) => (
      <button
        key={emoji}
        type="button"
        className={`moment-reaction__btn${active === emoji ? " moment-reaction__btn--active" : ""}`}
        onClick={() => onReact(emoji)}
        aria-label={`React ${emoji}`}
      >
        {emoji}
      </button>
    ))}
  </div>
);

export default MomentReaction;
