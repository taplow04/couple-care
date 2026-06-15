import { useState, useRef, useCallback } from "react";
import MessageOptions from "../MessageOptions/MessageOptions";
import "./MessageBubble.css";

const LONG_PRESS_MS = 500;

const formatTime = (d) =>
  new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(d));

const TickIcon = ({ seen, failed, pending }) => {
  if (pending) {
    return <span className="msg-bubble__tick msg-bubble__tick--pending">◷</span>;
  }
  if (failed) {
    return <span className="msg-bubble__tick msg-bubble__tick--failed">!</span>;
  }
  if (seen) {
    return (
      <svg className="msg-bubble__tick msg-bubble__tick--seen" width="16" height="10" viewBox="0 0 16 10" fill="none">
        <path d="M1 5L4.5 8.5L10 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M5.5 5L9 8.5L14.5 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }
  return (
    <svg className="msg-bubble__tick msg-bubble__tick--sent" width="10" height="10" viewBox="0 0 10 10" fill="none">
      <path d="M1 5L3.5 7.5L9 2" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

const MessageBubble = ({ message, isMine, onDelete }) => {
  const [showOptions, setShowOptions] = useState(false);
  const pressTimer = useRef(null);

  const startPress = useCallback(() => {
    if (!isMine) return;
    pressTimer.current = setTimeout(() => setShowOptions(true), LONG_PRESS_MS);
  }, [isMine]);

  const cancelPress = useCallback(() => {
    clearTimeout(pressTimer.current);
  }, []);

  const handleDeleteClick = useCallback(() => {
    setShowOptions(false);
    onDelete(message);
  }, [message, onDelete]);

  const cls = [
    "msg-bubble",
    isMine ? "msg-bubble--mine" : "msg-bubble--theirs",
    message.pending ? "msg-bubble--pending" : "",
    message.failed ? "msg-bubble--failed" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={`msg-bubble-row ${isMine ? "msg-bubble-row--mine" : ""}`}
      onTouchStart={startPress}
      onTouchEnd={cancelPress}
      onTouchMove={cancelPress}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
    >
      <div className="msg-bubble-wrap">
        {showOptions && (
          <MessageOptions
            isMine={isMine}
            onDelete={handleDeleteClick}
            onClose={() => setShowOptions(false)}
          />
        )}
        <div className={cls}>
          <p className="msg-bubble__text">{message.text}</p>
          <div className="msg-bubble__meta">
            <span className="msg-bubble__time">{formatTime(message.createdAt)}</span>
            {isMine && (
              <TickIcon
                seen={message.seen}
                failed={message.failed}
                pending={message.pending}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
