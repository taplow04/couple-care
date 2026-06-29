import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";

import MomentReaction from "../MomentReaction/MomentReaction";
import {
  viewMoment,
  deleteMoment,
  keepMoment,
  saveMomentToJourney,
} from "../../../services/moments.service";
import {
  emitMomentView,
  emitMomentReaction,
  emitMessageSend,
} from "../../../services/socket.service";
import { useCoupleEvents } from "../../../hooks/useCoupleEvents";
import { useAuth } from "../../../context/AuthContext";
import { getFirstName } from "../../../utils/getFirstName";
import "./MomentViewer.css";

const PHOTO_DURATION = 5000; // ms a photo is shown before auto-advancing

const timeAgo = (date) => {
  if (!date) return "";
  const s = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

/**
 * Full-screen, Instagram-style Moment viewer.
 *  - progress bars per moment, auto-advance (photo timed; video/voice by media)
 *  - tap right → next, tap left → previous, hold → pause, swipe down → close
 *  - partner's moments: react (Feature 6) + swipe-up/Reply → couple chat (7)
 *  - your moments: Seen receipt + author controls (delete/keep/save/journey)
 *
 * The active progress bar is driven imperatively through a ref (no per-frame
 * React state) so playback stays at 60 FPS and never re-renders the tree.
 */
const MomentViewer = ({
  moments: initialMoments,
  startIndex = 0,
  isOwn,
  readOnly = false,
  onClose,
  onChanged,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [moments, setMoments] = useState(initialMoments || []);
  const [index, setIndex] = useState(startIndex);
  const [paused, setPaused] = useState(false);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [showMenu, setShowMenu] = useState(false);
  const [floatReaction, setFloatReaction] = useState(null);

  const current = moments[index];

  const barFillRef = useRef(null);
  const elapsedRef = useRef(0);
  const mediaRef = useRef(null);
  const viewedRef = useRef(new Set());
  const pointerRef = useRef({ x: 0, y: 0, t: 0, holdTimer: null, held: false });

  const setBarWidth = (value) => {
    if (barFillRef.current) {
      barFillRef.current.style.width = typeof value === "number" ? `${value * 100}%` : value;
    }
  };

  const goNext = useCallback(() => {
    setIndex((i) => {
      if (i < moments.length - 1) return i + 1;
      onClose?.();
      return i;
    });
  }, [moments.length, onClose]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(0, i - 1));
  }, []);

  // Register a view on the partner's moment (Feature 5). Self-views are no-ops.
  useEffect(() => {
    if (!current || isOwn || readOnly) return;
    const id = String(current._id);
    if (viewedRef.current.has(id)) return;
    viewedRef.current.add(id);
    emitMomentView(id);
    viewMoment(id).catch(() => {});
  }, [current, isOwn, readOnly]);

  // Reset the (imperative) progress bar when the moment changes. DOM write only.
  useEffect(() => {
    elapsedRef.current = 0;
    setBarWidth("0%");
  }, [index, current?._id]);

  // Photo auto-advance via rAF (video/voice advance from media events instead).
  useEffect(() => {
    if (!current || current.type !== "photo") return undefined;
    let raf = 0;
    let last = 0;
    const tick = (now) => {
      if (!last) last = now;
      if (!paused) {
        elapsedRef.current += now - last;
        const p = Math.min(1, elapsedRef.current / PHOTO_DURATION);
        setBarWidth(p);
        if (p >= 1) {
          goNext();
          return;
        }
      }
      last = now;
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [index, paused, current, goNext]);

  // Pause/resume the active media element when `paused` toggles.
  useEffect(() => {
    const el = mediaRef.current;
    if (!el) return;
    if (paused) el.pause();
    else el.play?.().catch(() => {});
  }, [paused, index]);

  const onMediaTime = () => {
    const el = mediaRef.current;
    if (el?.duration) setBarWidth(Math.min(1, el.currentTime / el.duration));
  };

  // Live updates: reactions on / partner viewing the on-screen moment.
  useCoupleEvents({
    "moment:reaction": (payload) => {
      if (!payload?.momentId) return;
      setMoments((prev) =>
        prev.map((m) =>
          String(m._id) === String(payload.momentId)
            ? { ...m, reactions: payload.reactions }
            : m,
        ),
      );
      if (String(payload.momentId) === String(current?._id) && payload.reactions?.length) {
        const last = payload.reactions[payload.reactions.length - 1];
        setFloatReaction(`${last.emoji}-${last.userId}-${Math.random()}`);
      }
    },
    "moment:viewed": (payload) => {
      if (!payload?.momentId) return;
      setMoments((prev) =>
        prev.map((m) =>
          String(m._id) === String(payload.momentId)
            ? {
                ...m,
                viewedByPartner: true,
                firstViewedAt: m.firstViewedAt || payload.viewedAt,
                viewer: payload.viewer,
              }
            : m,
        ),
      );
    },
  });

  // Gestures: tap zones, hold to pause, swipe down close / swipe up reply.
  const onPointerDown = (e) => {
    const holdTimer = setTimeout(() => {
      pointerRef.current.held = true;
      setPaused(true);
    }, 220);
    pointerRef.current = { x: e.clientX, y: e.clientY, t: Date.now(), held: false, holdTimer };
  };

  const onPointerUp = (e) => {
    const p = pointerRef.current;
    clearTimeout(p.holdTimer);
    const dy = e.clientY - p.y;
    const dx = e.clientX - p.x;
    const dt = Date.now() - p.t;

    if (p.held) {
      setPaused(false);
      return;
    }
    if (dy > 90 && Math.abs(dy) > Math.abs(dx)) {
      onClose?.();
      return;
    }
    if (dy < -70 && Math.abs(dy) > Math.abs(dx) && !isOwn && !readOnly) {
      setReplyOpen(true);
      setPaused(true);
      return;
    }
    if (dt < 350 && Math.abs(dx) < 30 && Math.abs(dy) < 30) {
      const rect = e.currentTarget.getBoundingClientRect();
      if (e.clientX - rect.left < rect.width * 0.33) goPrev();
      else goNext();
    }
  };

  const handleReact = (emoji) => {
    if (!current) return;
    emitMomentReaction(String(current._id), emoji);
    setFloatReaction(`${emoji}-self-${Math.random()}`);
  };

  const sendReply = (e) => {
    e?.preventDefault?.();
    const text = replyText.trim();
    if (!text || !current?.coupleId) return;
    emitMessageSend({ coupleId: String(current.coupleId), text });
    setReplyText("");
    setReplyOpen(false);
    onClose?.();
    navigate("/chat");
  };

  const handleDelete = async () => {
    if (!current) return;
    try {
      await deleteMoment(String(current._id));
      onChanged?.();
      setMoments((prev) => {
        const next = prev.filter((m) => String(m._id) !== String(current._id));
        if (next.length === 0) onClose?.();
        return next;
      });
      setIndex((i) => Math.max(0, Math.min(i, moments.length - 2)));
      setShowMenu(false);
    } catch {
      /* ignore */
    }
  };

  // Delete ALL of my live Moments at once (reuses the per-moment endpoint).
  const handleDeleteAll = async () => {
    const ids = moments.map((m) => String(m._id));
    try {
      await Promise.all(ids.map((id) => deleteMoment(id).catch(() => {})));
    } finally {
      onChanged?.();
      onClose?.();
    }
  };

  const handleKeep = async () => {
    if (!current) return;
    try {
      const res = await keepMoment(String(current._id));
      setMoments((prev) =>
        prev.map((m) => (String(m._id) === String(current._id) ? res.data : m)),
      );
      setShowMenu(false);
      onChanged?.();
    } catch {
      /* ignore */
    }
  };

  const handleSaveJourney = async () => {
    if (!current) return;
    try {
      const res = await saveMomentToJourney(String(current._id));
      setMoments((prev) =>
        prev.map((m) => (String(m._id) === String(current._id) ? res.data : m)),
      );
      setShowMenu(false);
      onChanged?.();
    } catch {
      /* ignore */
    }
  };

  // Keyboard support (desktop).
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "ArrowRight") goNext();
      else if (e.key === "ArrowLeft") goPrev();
      else if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose]);

  if (!current) return null;

  const myReaction = current.reactions?.find(
    (r) => String(r.userId) === String(user?._id),
  )?.emoji;

  const viewer = (
    <div className="moment-viewer" role="dialog" aria-modal="true">
      {/* Progress bars */}
      <div className="moment-viewer__bars">
        {moments.map((m, i) => (
          <div key={m._id} className="moment-viewer__bar">
            <div
              className="moment-viewer__bar-fill"
              ref={i === index ? barFillRef : null}
              style={i < index ? { width: "100%" } : i > index ? { width: "0%" } : undefined}
            />
          </div>
        ))}
      </div>

      {/* Header */}
      <div className="moment-viewer__header">
        <div className="moment-viewer__author">
          {current.author?.profilePhoto ? (
            <img src={current.author.profilePhoto} alt="" className="moment-viewer__avatar" />
          ) : (
            <span className="moment-viewer__avatar moment-viewer__avatar--ph">♥</span>
          )}
          <div className="moment-viewer__meta">
            <span className="moment-viewer__name">
              {isOwn ? "Your Moment" : getFirstName(current.author?.name, "Partner")}
            </span>
            <span className="moment-viewer__time">{timeAgo(current.createdAt)}</span>
          </div>
        </div>
        <div className="moment-viewer__head-actions">
          {isOwn && !readOnly && (
            <button
              type="button"
              className="moment-viewer__icon-btn"
              onClick={() => {
                setShowMenu((s) => !s);
                setPaused(true);
              }}
              aria-label="Moment options"
            >
              ⋯
            </button>
          )}
          <button
            type="button"
            className="moment-viewer__icon-btn"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Media stage (tap/hold/swipe surface) */}
      <div
        className="moment-viewer__stage"
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          clearTimeout(pointerRef.current.holdTimer);
          setPaused(false);
        }}
      >
        {current.type === "photo" && (
          <img
            src={current.mediaUrl}
            alt={current.caption || "Moment"}
            className="moment-viewer__media"
          />
        )}
        {current.type === "video" && (
          <video
            ref={mediaRef}
            src={current.mediaUrl}
            className="moment-viewer__media"
            autoPlay
            playsInline
            onTimeUpdate={onMediaTime}
            onEnded={goNext}
          />
        )}
        {current.type === "voice" && (
          <div className="moment-viewer__voice">
            <div className="moment-viewer__voice-orb">🎤</div>
            <div className="moment-viewer__waveform" aria-hidden="true">
              {Array.from({ length: 28 }).map((_, i) => (
                <span key={i} style={{ animationDelay: `${(i % 14) * 60}ms` }} />
              ))}
            </div>
            <audio
              ref={mediaRef}
              src={current.mediaUrl}
              autoPlay
              onTimeUpdate={onMediaTime}
              onEnded={goNext}
            />
          </div>
        )}

        {floatReaction && (
          <span
            key={floatReaction}
            className="moment-viewer__float"
            onAnimationEnd={() => setFloatReaction(null)}
          >
            {floatReaction.split("-")[0]}
          </span>
        )}
      </div>

      {/* Caption + AI suggestion */}
      {(current.caption || (isOwn && current.aiSuggestion?.text)) && (
        <div className="moment-viewer__caption-wrap">
          {current.caption && <p className="moment-viewer__caption">{current.caption}</p>}
          {isOwn && current.aiSuggestion?.text && (
            <p className="moment-viewer__ai">✨ {current.aiSuggestion.text}</p>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="moment-viewer__footer">
        {readOnly ? (
          current.reactions?.length > 0 && (
            <span className="moment-viewer__seen-react">
              {current.reactions.map((r) => r.emoji).join(" ")}
            </span>
          )
        ) : isOwn ? (
          <div className="moment-viewer__seen">
            {current.viewedByPartner ? (
              <>
                <span className="moment-viewer__seen-dot" />
                Seen{current.firstViewedAt ? ` · ${timeAgo(current.firstViewedAt)}` : ""}
              </>
            ) : (
              <span className="moment-viewer__seen--no">Not seen yet</span>
            )}
            {current.reactions?.length > 0 && (
              <span className="moment-viewer__seen-react">
                {current.reactions.map((r) => r.emoji).join(" ")}
              </span>
            )}
          </div>
        ) : replyOpen ? (
          <form className="moment-viewer__reply" onSubmit={sendReply}>
            <input
              className="moment-viewer__reply-input"
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              placeholder={`Reply to ${getFirstName(current.author?.name, "partner")}…`}
              autoFocus
            />
            <button type="submit" className="moment-viewer__reply-send" aria-label="Send reply">
              ➤
            </button>
          </form>
        ) : (
          <div className="moment-viewer__partner-actions">
            <MomentReaction active={myReaction} onReact={handleReact} />
            <button
              type="button"
              className="moment-viewer__reply-btn"
              onClick={() => {
                setReplyOpen(true);
                setPaused(true);
              }}
            >
              💬 Reply
            </button>
          </div>
        )}
      </div>

      {/* Author menu */}
      {isOwn && !readOnly && showMenu && (
        <div className="moment-viewer__menu">
          <button type="button" onClick={handleSaveJourney} disabled={current.savedToJourney}>
            ⭐ {current.savedToJourney ? "Saved to Journey" : "Save to Journey"}
          </button>
          <button type="button" onClick={handleKeep} disabled={current.kept}>
            📌 {current.kept ? "Kept" : "Keep beyond 24h"}
          </button>
          <button
            type="button"
            className="moment-viewer__menu--danger"
            onClick={handleDelete}
          >
            🗑 Delete this Moment
          </button>
          {moments.length > 1 && (
            <button
              type="button"
              className="moment-viewer__menu--danger"
              onClick={handleDeleteAll}
            >
              🗑 Delete all my Moments
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setShowMenu(false);
              setPaused(false);
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );

  return createPortal(viewer, document.body);
};

export default MomentViewer;
