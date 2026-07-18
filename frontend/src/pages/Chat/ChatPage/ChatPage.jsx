import { useState, useEffect, useRef, useCallback, Fragment } from "react";
import { useAuth } from "../../../context/AuthContext";
import { useVisualViewport } from "../../../hooks/useVisualViewport";
import {
  getMessages,
  markMessageSeen,
  markAllSeen,
  uploadChatMedia,
} from "../../../services/chat.service";
import { getDashboard } from "../../../services/dashboard.service";
import {
  connectSocket,
  joinCoupleRoom,
  emitTypingStart,
  emitTypingStop,
  emitMessageSend,
  emitMessageSeen,
  emitMessageDelete,
  emitReaction,
} from "../../../services/socket.service";
import ChatHeader from "../../../components/chat/ChatHeader/ChatHeader";
import MessageBubble from "../../../components/chat/MessageBubble/MessageBubble";
import MessageInput from "../../../components/chat/MessageInput/MessageInput";
import TypingIndicator from "../../../components/chat/TypingIndicator/TypingIndicator";
import DateDivider from "../../../components/chat/DateDivider/DateDivider";
import DeleteConfirmModal from "../../../components/chat/DeleteConfirmModal/DeleteConfirmModal";
import { CHAT_STARTERS } from "../../../components/chat/chatSuggestions";
import "./ChatPage.css";

const TYPING_STOP_DELAY = 2000;
// Messages from the same sender within this window render as one visual group.
const GROUP_WINDOW_MS = 3 * 60 * 1000;
// "Near bottom" threshold for the smart auto-scroll (px from the end).
const NEAR_BOTTOM_PX = 140;

// Normalizes senderId to a flat string regardless of whether it's populated or raw
const flatSenderId = (senderId) =>
  senderId?._id ? String(senderId._id) : String(senderId);

// Day grouping for date dividers (Today / Yesterday / "12 Jun" / "12 Jun 2025").
const sameDay = (a, b) => {
  const da = new Date(a);
  const db = new Date(b);
  return (
    da.getFullYear() === db.getFullYear() &&
    da.getMonth() === db.getMonth() &&
    da.getDate() === db.getDate()
  );
};
const dayLabel = (date) => {
  const d = new Date(date);
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (sameDay(d, now)) return "Today";
  if (sameDay(d, yesterday)) return "Yesterday";
  const sameYear = d.getFullYear() === now.getFullYear();
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(d);
};

const ChatPage = () => {
  const { user } = useAuth();
  const coupleId = user?.currentCoupleId;

  // Keyboard-aware full-screen sizing (WhatsApp-style) on mobile.
  useVisualViewport();

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [sendError, setSendError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [replyDraft, setReplyDraft] = useState(null);
  // Seed text pushed into the composer by suggestion chips ({ text, ts }).
  const [composerSeed, setComposerSeed] = useState(null);
  const [showJump, setShowJump] = useState(false);

  const bodyRef = useRef(null);
  const nearBottomRef = useRef(true);
  const prevCountRef = useRef(0);
  const bottomRef = useRef(null);
  const typingStopRef = useRef(null);
  const typingEmitRef = useRef(null);
  const isTypingRef = useRef(false);
  const seenRef = useRef(new Set());

  // ─── Initial data load ───────────────────────────────────────────────────

  useEffect(() => {
    if (!coupleId) {
      setLoading(false);
      return;
    }

    // Opening chat reads the thread — clear the server-side unread count so the
    // dashboard badge resets and stays reset across refreshes.
    markAllSeen().catch(() => {});

    Promise.allSettled([getMessages(), getDashboard()]).then(([msgRes, dashRes]) => {
      if (msgRes.status === "fulfilled") {
        // Normalize senderId to flat string — fixes ownership after refresh
        const normalized = (msgRes.value.data || [])
          .slice()
          .reverse()
          .map((msg) => ({ ...msg, senderId: flatSenderId(msg.senderId) }));
        setMessages(normalized);
      }
      if (dashRes.status === "fulfilled") {
        setPartner(dashRes.value.data?.partner ?? null);
      }
      setLoading(false);
    });
  }, [coupleId]);

  // ─── Socket setup ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!coupleId) return;

    const token = localStorage.getItem("token");
    const socket = connectSocket(token);

    const onConnect = () => {
      joinCoupleRoom(coupleId);
    };

    const onDisconnect = () => {};

    const onMessageReceive = (msg) => {
      // Normalize incoming socket message senderId
      const normalized = { ...msg, senderId: flatSenderId(msg.senderId) };

      setMessages((prev) => {
        if (prev.some((m) => m._id === normalized._id)) return prev;

        const isMine = flatSenderId(normalized.senderId) === String(user?._id);
        if (isMine) {
          const pendingIdx = prev.findIndex(
            (m) => m.pending && flatSenderId(m.senderId) === String(user?._id)
          );
          if (pendingIdx !== -1) {
            const next = [...prev];
            next[pendingIdx] = { ...normalized, pending: false };
            return next;
          }
        } else {
          if (!seenRef.current.has(normalized._id)) {
            seenRef.current.add(normalized._id);
            emitMessageSeen(coupleId, normalized._id);
            markMessageSeen(normalized._id).catch(() => {});
          }
        }

        return [...prev, normalized];
      });
    };

    const onTypingStart = () => {
      setIsPartnerTyping(true);
      clearTimeout(typingStopRef.current);
      typingStopRef.current = setTimeout(() => setIsPartnerTyping(false), 4000);
    };

    const onTypingStop = () => {
      clearTimeout(typingStopRef.current);
      setIsPartnerTyping(false);
    };

    const onMessageSeen = ({ messageId }) => {
      setMessages((prev) =>
        prev.map((m) => (String(m._id) === String(messageId) ? { ...m, seen: true } : m))
      );
    };

    const onMessageDeleted = ({ messageId }) => {
      setMessages((prev) => prev.filter((m) => String(m._id) !== String(messageId)));
    };

    const onMessageReaction = ({ messageId, reactions }) => {
      setMessages((prev) =>
        prev.map((m) =>
          String(m._id) === String(messageId) ? { ...m, reactions } : m
        )
      );
    };

    if (socket.connected) {
      joinCoupleRoom(coupleId);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:receive", onMessageReceive);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("message:seen", onMessageSeen);
    socket.on("message:deleted", onMessageDeleted);
    socket.on("message:reaction", onMessageReaction);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:receive", onMessageReceive);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("message:seen", onMessageSeen);
      socket.off("message:deleted", onMessageDeleted);
      socket.off("message:reaction", onMessageReaction);
      clearTimeout(typingStopRef.current);
      clearTimeout(typingEmitRef.current);
    };
  }, [coupleId, user?._id]);

  // ─── Smart auto-scroll ────────────────────────────────────────────────────
  // Follow the conversation only when the user is already at the end (or just
  // sent a message). Reading history never gets yanked back down; a floating
  // "jump to latest" pill appears instead.

  const handleBodyScroll = useCallback(() => {
    const el = bodyRef.current;
    if (!el) return;
    const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
    const near = dist < NEAR_BOTTOM_PX;
    nearBottomRef.current = near;
    setShowJump(!near);
  }, []);

  const scrollToBottom = useCallback((behavior = "smooth") => {
    bottomRef.current?.scrollIntoView({ behavior });
  }, []);

  useEffect(() => {
    const count = messages.length;
    const prevCount = prevCountRef.current;
    prevCountRef.current = count;
    if (!count) return;

    if (prevCount === 0) {
      // Initial history load: land at the end instantly, no animation.
      scrollToBottom("auto");
      return;
    }
    if (count > prevCount) {
      const last = messages[count - 1];
      const lastIsMine = flatSenderId(last.senderId) === String(user?._id);
      if (lastIsMine || nearBottomRef.current) scrollToBottom("smooth");
    }
  }, [messages, user?._id, scrollToBottom]);

  useEffect(() => {
    if (isPartnerTyping && nearBottomRef.current) scrollToBottom("smooth");
  }, [isPartnerTyping, scrollToBottom]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleTyping = useCallback(() => {
    if (!coupleId) return;
    if (!isTypingRef.current) {
      isTypingRef.current = true;
      emitTypingStart(coupleId);
    }
    clearTimeout(typingEmitRef.current);
    typingEmitRef.current = setTimeout(() => {
      isTypingRef.current = false;
      emitTypingStop(coupleId);
    }, TYPING_STOP_DELAY);
  }, [coupleId]);

  const handleSend = useCallback(
    (text, replyTo = null) => {
      if (!text || !coupleId) return;

      clearTimeout(typingEmitRef.current);
      if (isTypingRef.current) {
        isTypingRef.current = false;
        emitTypingStop(coupleId);
      }

      const tempId = `temp_${Date.now()}`;
      const optimistic = {
        _id: tempId,
        text,
        senderId: String(user._id),
        coupleId,
        seen: false,
        createdAt: new Date().toISOString(),
        pending: true,
        // Optimistic quote preview (replaced by the populated server copy).
        replyTo: replyTo
          ? messages.find((m) => String(m._id) === String(replyTo)) || null
          : null,
      };

      setMessages((prev) => [...prev, optimistic]);
      setSendError("");

      emitMessageSend({ coupleId, text, replyTo }, (ack) => {
        if (!ack?.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m._id === tempId ? { ...m, pending: false, failed: true } : m
            )
          );
          setSendError(ack?.message || "Failed to send. Tap to retry.");
        }
      });
    },
    [coupleId, user?._id, messages]
  );

  // Media upload: REST → Cloudinary → server broadcasts via "message:receive",
  // so we don't add anything optimistically here. `meta` carries optional
  // mediaDuration (voice notes) and replyTo.
  const handleUploadMedia = useCallback(
    (file, caption, onProgress, meta) =>
      uploadChatMedia(file, caption, onProgress, meta),
    [],
  );

  // ── Reactions / reply / forward ──
  const handleReact = useCallback(
    (message, emoji) => {
      if (!coupleId || !message?._id) return;
      // Pending (optimistic) messages have no server id yet.
      if (String(message._id).startsWith("temp_")) return;

      // Optimistic toggle for instant feedback; server broadcast confirms.
      const uid = String(user._id);
      setMessages((prev) =>
        prev.map((m) => {
          if (String(m._id) !== String(message._id)) return m;
          const list = (m.reactions || []).filter(
            (r) => String(r.userId?._id || r.userId) !== uid
          );
          const had = (m.reactions || []).find(
            (r) => String(r.userId?._id || r.userId) === uid
          );
          if (!(had && had.emoji === emoji)) {
            list.push({ userId: uid, emoji });
          }
          return { ...m, reactions: list };
        })
      );

      emitReaction(coupleId, message._id, emoji);
    },
    [coupleId, user?._id]
  );

  const handleReply = useCallback((message) => {
    setReplyDraft(message);
  }, []);

  // Suggestion chips (empty state) → seed the composer, don't auto-send.
  const handleSuggestion = useCallback((text) => {
    setComposerSeed({ text, ts: Date.now() });
  }, []);

  const handleForward = useCallback(() => {
    // Forwarding is future-ready (UI present); destination picker not built yet.
    setSendError("Forwarding is coming soon. 💗");
    setTimeout(() => setSendError(""), 2500);
  }, []);

  const handleDeleteRequest = useCallback((message) => {
    setDeleteTarget(message);
  }, []);

  const handleDeleteConfirm = useCallback(() => {
    if (!deleteTarget || !coupleId) return;
    const messageId = String(deleteTarget._id);

    // Optimistic removal
    setMessages((prev) => prev.filter((m) => String(m._id) !== messageId));
    setDeleteTarget(null);

    emitMessageDelete(coupleId, messageId, (ack) => {
      if (!ack?.success) {
        console.error("Delete failed:", ack?.message);
      }
    });
  }, [deleteTarget, coupleId]);

  // ─── No partner state ─────────────────────────────────────────────────────

  if (!coupleId) {
    return (
      <div className="chat-page chat-page--no-partner">
        <div className="chat-page__empty-state">
          <span className="chat-page__empty-emoji">🔗</span>
          <p className="chat-page__empty-title">No partner connected</p>
          <p className="chat-page__empty-sub">
            Connect with your partner first to start chatting.
          </p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="chat-page">
      <ChatHeader partner={partner} partnerTyping={isPartnerTyping} />

      <div className="chat-page__body" ref={bodyRef} onScroll={handleBodyScroll}>
        {loading ? (
          <div className="chat-page__skeletons">
            {["left", "right", "left", "right"].map((side, i) => (
              <div key={i} className={`chat-page__sk chat-page__sk--${side}`} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-page__empty-state">
            <span className="chat-page__empty-orb" aria-hidden="true">
              <span className="chat-page__empty-emoji">💌</span>
            </span>
            <p className="chat-page__empty-title">Your space, just the two of you</p>
            <p className="chat-page__empty-sub">
              Every love story starts with a first message. Try one of these:
            </p>
            <div className="chat-page__starters">
              {CHAT_STARTERS.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  className="chat-page__starter"
                  onClick={() => handleSuggestion(s.text)}
                >
                  <span aria-hidden="true">{s.emoji}</span> {s.label}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="chat-page__thread">
            {messages.map((msg, i) => {
              const prev = messages[i - 1];
              const next = messages[i + 1];
              const showDivider = !prev || !sameDay(prev.createdAt, msg.createdAt);
              // Visual grouping: same sender, same day, within a short window.
              const groupedWithPrev =
                !!prev &&
                !showDivider &&
                flatSenderId(prev.senderId) === flatSenderId(msg.senderId) &&
                new Date(msg.createdAt) - new Date(prev.createdAt) < GROUP_WINDOW_MS;
              const groupedWithNext =
                !!next &&
                sameDay(msg.createdAt, next.createdAt) &&
                flatSenderId(next.senderId) === flatSenderId(msg.senderId) &&
                new Date(next.createdAt) - new Date(msg.createdAt) < GROUP_WINDOW_MS;
              const bubble = (
                <MessageBubble
                  message={msg}
                  isMine={flatSenderId(msg.senderId) === String(user?._id)}
                  currentUserId={user?._id}
                  groupedWithPrev={groupedWithPrev}
                  groupedWithNext={groupedWithNext}
                  onDelete={handleDeleteRequest}
                  onReact={handleReact}
                  onReply={handleReply}
                  onForward={handleForward}
                />
              );
              // Group consecutive messages by day with a centered divider.
              // Fragment adds no DOM node, so the thread's flex layout is intact.
              return (
                <Fragment key={msg._id}>
                  {showDivider && <DateDivider label={dayLabel(msg.createdAt)} />}
                  {bubble}
                </Fragment>
              );
            })}
            {isPartnerTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {showJump && !loading && messages.length > 0 && (
        <button
          type="button"
          className="chat-page__jump"
          onClick={() => scrollToBottom("smooth")}
          aria-label="Jump to latest message"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12l7 7 7-7" />
          </svg>
        </button>
      )}

      {sendError && (
        <p className="chat-page__send-err" role="alert">
          {sendError}
        </p>
      )}

      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        onUploadMedia={handleUploadMedia}
        disabled={false}
        replyDraft={replyDraft}
        onCancelReply={() => setReplyDraft(null)}
        seed={composerSeed}
      />

      {deleteTarget && (
        <DeleteConfirmModal
          message={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
};

export default ChatPage;
