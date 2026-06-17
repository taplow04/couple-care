import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "./MessageOptions.css";

const MessageOptions = ({ onDelete, onClose, isMine }) => {
  const ref = useRef(null);
  // Default to opening above the bubble; flip below for messages near the top
  // (e.g. the first message) so the menu isn't hidden behind the chat header.
  const [placement, setPlacement] = useState("above");

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    // If the menu's top is within the header zone (or off-screen), open below.
    if (el.getBoundingClientRect().top < 72) {
      setPlacement("below");
    }
  }, []);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
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
      <button className="msg-options__btn msg-options__btn--delete" onClick={onDelete}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
        Delete
      </button>
    </div>
  );
};

export default MessageOptions;
