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

// Swipe-to-reply tuning (px).
const SWIPE_ENGAGE = 14;
const SWIPE_MAX = 72;
const SWIPE_TRIGGER = 52;

const MessageBubble = ({
  message,
  isMine,
  currentUserId,
  groupedWithPrev = false,
  groupedWithNext = false,
  onDelete,
  onReact,
  onReply,
  onForward,
}) => {
  const [showOptions, setShowOptions] = useState(false);
  const pressTimer = useRef(null);
  const suppressClickRef = useRef(false);
  const lastTapRef = useRef(0);
  // Swipe-to-reply: drag state + direct DOM transforms (no re-render per frame).
  const swipeRef = useRef({ x: 0, y: 0, active: false, engaged: false, pull: 0 });
  const wrapRef = useRef(null);
  const hintRef = useRef(null);

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

  // ── Swipe-to-reply (touch): drag any bubble to the right, release to reply.
  const handleTouchStart = useCallback(
    (e) => {
      startPress();
      const t = e.touches?.[0];
      if (!t) return;
      swipeRef.current = { x: t.clientX, y: t.clientY, active: true, engaged: false, pull: 0 };
    },
    [startPress],
  );

  const handleTouchMove = useCallback((e) => {
    clearTimeout(pressTimer.current);
    const s = swipeRef.current;
    const t = e.touches?.[0];
    if (!s.active || !t) return;
    const dx = t.clientX - s.x;
    const dy = t.clientY - s.y;
    if (!s.engaged) {
      // Engage only on a clearly horizontal right-drag so scrolling stays free.
      if (Math.abs(dx) < SWIPE_ENGAGE || Math.abs(dx) < Math.abs(dy) * 1.2) return;
      if (dx < 0) {
        s.active = false;
        return;
      }
      s.engaged = true;
    }
    const pull = Math.min(Math.max(dx - SWIPE_ENGAGE, 0), SWIPE_MAX);
    s.pull = pull;
    const el = wrapRef.current;
    if (el) {
      el.style.transition = "none";
      el.style.transform = `translateX(${Math.round(pull * 0.8)}px)`;
    }
    if (hintRef.current) {
      hintRef.current.style.opacity = String(Math.min(pull / SWIPE_TRIGGER, 1));
      hintRef.current.style.transform = `scale(${0.7 + Math.min(pull / SWIPE_TRIGGER, 1) * 0.3})`;
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    clearTimeout(pressTimer.current);
    const s = swipeRef.current;
    const el = wrapRef.current;
    if (el) {
      el.style.transition = "transform 0.32s var(--ease-spring)";
      el.style.transform = "translateX(0)";
    }
    if (hintRef.current) {
      hintRef.current.style.opacity = "0";
      hintRef.current.style.transform = "scale(0.7)";
    }
    if (s.engaged && s.pull >= SWIPE_TRIGGER) onReply?.(message);
    s.active = false;
    s.engaged = false;
    s.pull = 0;
  }, [onReply, message]);

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
    groupedWithPrev ? "msg-bubble--gp" : "",
    groupedWithNext ? "msg-bubble--gn" : "",
    message.pending ? "msg-bubble--pending" : "",
    message.failed ? "msg-bubble--failed" : "",
    reactions.length ? "msg-bubble--reacted" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const rowCls = [
    "msg-bubble-row",
    isMine ? "msg-bubble-row--mine" : "",
    groupedWithPrev ? "msg-bubble-row--gp" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={rowCls}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      onMouseDown={startPress}
      onMouseUp={cancelPress}
      onMouseLeave={cancelPress}
      onContextMenu={(e) => e.preventDefault()}
    >
      <span className="msg-swipe-hint" ref={hintRef} aria-hidden="true">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 17 4 12 9 7" />
          <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
        </svg>
      </span>
      <div className="msg-bubble-wrap" ref={wrapRef}>
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
