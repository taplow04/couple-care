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

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const MessageBody = ({ message }) => {
  if (message.type === "image" && message.mediaUrl) {
    return (
      <div className="msg-bubble__media">
        <a href={message.mediaUrl} target="_blank" rel="noopener noreferrer">
          <img
            className="msg-bubble__image"
            src={message.mediaUrl}
            alt={message.fileName || "Shared image"}
            loading="lazy"
          />
        </a>
        {message.text ? (
          <p className="msg-bubble__text">{message.text}</p>
        ) : null}
      </div>
    );
  }

  if (message.type === "file" && message.mediaUrl) {
    return (
      <a
        className="msg-bubble__file"
        href={message.mediaUrl}
        target="_blank"
        rel="noopener noreferrer"
        download={message.fileName || true}
      >
        <span className="msg-bubble__file-icon" aria-hidden="true">📄</span>
        <span className="msg-bubble__file-info">
          <span className="msg-bubble__file-name">
            {message.fileName || "Download file"}
          </span>
          <span className="msg-bubble__file-size">
            {formatBytes(message.fileSize)}
          </span>
        </span>
      </a>
    );
  }

  return <p className="msg-bubble__text">{message.text}</p>;
};

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
          <MessageBody message={message} />
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
