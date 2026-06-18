import { useState, useRef, useCallback } from "react";
import MessageOptions from "../MessageOptions/MessageOptions";
import ReactionBadge from "../MessageReaction/MessageReaction";
import VoiceMessage from "../VoiceMessage/VoiceMessage";
import "./MessageBubble.css";

const LONG_PRESS_MS = 500;
const DOUBLE_TAP_MS = 300;

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

const flatId = (v) => (v?._id ? String(v._id) : v ? String(v) : "");

// Short label for a quoted (replied-to) message.
const replyLabel = (r) => {
  if (!r) return "";
  if (r.type === "image") return "📷 Photo";
  if (r.type === "video") return "🎥 Video";
  if (r.type === "audio") return "🎤 Voice message";
  if (r.type === "file") return `📎 ${r.fileName || "File"}`;
  return r.text || "Message";
};

const MessageBody = ({ message, isMine, onMediaClick }) => {
  if (message.type === "image" && message.mediaUrl) {
    return (
      <div className="msg-bubble__media">
        <img
          className="msg-bubble__image"
          src={message.mediaUrl}
          alt={message.fileName || "Shared image"}
          loading="lazy"
          draggable={false}
          onClick={(e) => onMediaClick(e, message.mediaUrl, false)}
        />
        {message.text ? <p className="msg-bubble__text">{message.text}</p> : null}
      </div>
    );
  }

  if (message.type === "video" && message.mediaUrl) {
    return (
      <div className="msg-bubble__media">
        <video
          className="msg-bubble__video"
          src={message.mediaUrl}
          controls
          playsInline
          preload="metadata"
        />
        {message.text ? <p className="msg-bubble__text">{message.text}</p> : null}
      </div>
    );
  }

  if (message.type === "audio" && message.mediaUrl) {
    return (
      <div className="msg-bubble__audio">
        <VoiceMessage
          src={message.mediaUrl}
          duration={message.mediaDuration || 0}
          mine={isMine}
        />
        {message.text ? <p className="msg-bubble__text">{message.text}</p> : null}
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
        draggable={false}
        onClick={(e) => onMediaClick(e, message.mediaUrl, true)}
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

const MessageBubble = ({
  message,
  isMine,
  currentUserId,
  onDelete,
  onReact,
  onReply,
  onForward,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const pressTimer = useRef(null);
  const suppressClickRef = useRef(false);
  const lastTapRef = useRef(0);

  const reactions = message.reactions || [];
  const myReaction = reactions.find((r) => flatId(r.userId) === String(currentUserId))?.emoji;
  const mineHas = !!myReaction;

  // Double-tap to ❤️ — only on bubbles whose single tap does nothing (text/audio)
  // so it never fights image-open or video controls.
  const doubleTappable = message.type === "text" || message.type === "audio";

  const startPress = useCallback(() => {
    suppressClickRef.current = false;
    pressTimer.current = setTimeout(() => {
      suppressClickRef.current = true;
      setShowOptions(true);
    }, LONG_PRESS_MS);
  }, []);

  const cancelPress = useCallback(() => {
    clearTimeout(pressTimer.current);
  }, []);

  const handleMediaClick = useCallback((e, url, isFile) => {
    if (suppressClickRef.current) {
      e.preventDefault();
      suppressClickRef.current = false;
      return;
    }
    if (!isFile) {
      e.preventDefault();
      window.open(url, "_blank", "noopener");
    }
  }, []);

  const handleContentClick = useCallback(() => {
    if (!doubleTappable || suppressClickRef.current) return;
    const now = Date.now();
    if (now - lastTapRef.current < DOUBLE_TAP_MS) {
      lastTapRef.current = 0;
      onReact?.(message, "❤️");
    } else {
      lastTapRef.current = now;
    }
  }, [doubleTappable, onReact, message]);

  const closeMenu = useCallback(() => {
    setShowOptions(false);
    suppressClickRef.current = false;
  }, []);

  const handleReact = useCallback(
    (emoji) => {
      onReact?.(message, emoji);
      closeMenu();
    },
    [onReact, message, closeMenu],
  );

  const handleReply = useCallback(() => {
    onReply?.(message);
    closeMenu();
  }, [onReply, message, closeMenu]);

  const handleForward = useCallback(() => {
    onForward?.(message);
    closeMenu();
  }, [onForward, message, closeMenu]);

  const handleDelete = useCallback(() => {
    setShowOptions(false);
    onDelete(message);
  }, [message, onDelete]);

  const handleCopy = useCallback(() => {
    if (message.text) {
      navigator.clipboard?.writeText(message.text).catch(() => {});
    }
    closeMenu();
  }, [message.text, closeMenu]);

  const cls = [
    "msg-bubble",
    isMine ? "msg-bubble--mine" : "msg-bubble--theirs",
    message.pending ? "msg-bubble--pending" : "",
    message.failed ? "msg-bubble--failed" : "",
    reactions.length ? "msg-bubble--reacted" : "",
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
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="msg-bubble-wrap">
        {showOptions && (
          <MessageOptions
            isMine={isMine}
            myReaction={myReaction}
            canCopy={!!message.text}
            onReact={handleReact}
            onReply={handleReply}
            onCopy={handleCopy}
            onForward={handleForward}
            onDelete={handleDelete}
            onClose={closeMenu}
          />
        )}
        <div className={cls} onClick={handleContentClick}>
          {message.replyTo && (
            <div className="msg-bubble__reply">
              <span className="msg-bubble__reply-author">
                {flatId(message.replyTo.senderId) === String(currentUserId) ? "You" : "Partner"}
              </span>
              <span className="msg-bubble__reply-text">{replyLabel(message.replyTo)}</span>
            </div>
          )}

          <MessageBody message={message} isMine={isMine} onMediaClick={handleMediaClick} />

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

          <ReactionBadge
            reactions={reactions}
            mineHas={mineHas}
            onClick={(e) => {
              e.stopPropagation();
              setShowOptions(true);
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;
