import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ReactionPicker } from "../MessageReaction/MessageReaction";
import "./MessageOptions.css";

const Icon = ({ d }) => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

/**
 * Long-press action menu: emoji reactions on top, then Reply / Copy / Forward /
 * Delete. Reply/Copy/Forward are available on any message; Delete only on mine.
 */
const MessageOptions = ({
  isMine,
  myReaction,
  onReact,
  onReply,
  onCopy,
  onForward,
  onDelete,
  canCopy,
  onClose,
}) => {
  const ref = useRef(null);
  const [placement, setPlacement] = useState("above");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (el.getBoundingClientRect().top < 96) setPlacement("below");
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("touchstart", handler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("touchstart", handler);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      className={`msg-options msg-options--${placement} ${isMine ? "msg-options--mine" : "msg-options--theirs"}`}
      onClick={(e) => e.stopPropagation()}
    >
      <ReactionPicker mine={myReaction} onPick={onReact} />

      <div className="msg-options__actions">
        <button className="msg-options__btn" onClick={onReply}>
          <Icon d={<><polyline points="9 17 4 12 9 7" /><path d="M20 18v-2a4 4 0 0 0-4-4H4" /></>} />
          Reply
        </button>

        {canCopy && (
          <button className="msg-options__btn" onClick={onCopy}>
            <Icon d={<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>} />
            Copy
          </button>
        )}

        <button className="msg-options__btn" onClick={onForward}>
          <Icon d={<><polyline points="15 17 20 12 15 7" /><path d="M4 18v-2a4 4 0 0 1 4-4h12" /></>} />
          Forward
        </button>

        {isMine && (
          <button className="msg-options__btn msg-options__btn--delete" onClick={onDelete}>
            <Icon d={<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" /></>} />
            Delete
          </button>
        )}
      </div>
    </div>
  );
};

export default MessageOptions;
