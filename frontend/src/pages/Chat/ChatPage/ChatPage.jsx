import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../../context/AuthContext";
import { getMessages, markMessageSeen } from "../../../services/chat.service";
import { getDashboard } from "../../../services/dashboard.service";
import {
  connectSocket,
  joinCoupleRoom,
  emitTypingStart,
  emitTypingStop,
  emitMessageSend,
  emitMessageSeen,
  emitMessageDelete,
} from "../../../services/socket.service";
import ChatHeader from "../../../components/chat/ChatHeader/ChatHeader";
import MessageBubble from "../../../components/chat/MessageBubble/MessageBubble";
import MessageInput from "../../../components/chat/MessageInput/MessageInput";
import TypingIndicator from "../../../components/chat/TypingIndicator/TypingIndicator";
import DeleteConfirmModal from "../../../components/chat/DeleteConfirmModal/DeleteConfirmModal";
import "./ChatPage.css";

const TYPING_STOP_DELAY = 2000;

// Normalizes senderId to a flat string regardless of whether it's populated or raw
const flatSenderId = (senderId) =>
  senderId?._id ? String(senderId._id) : String(senderId);

const ChatPage = () => {
  const { user } = useAuth();
  const coupleId = user?.currentCoupleId;

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [partner, setPartner] = useState(null);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [socketConnected, setSocketConnected] = useState(false);
  const [sendError, setSendError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);

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
      setSocketConnected(true);
      joinCoupleRoom(coupleId);
    };

    const onDisconnect = () => setSocketConnected(false);

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

    if (socket.connected) {
      setSocketConnected(true);
      joinCoupleRoom(coupleId);
    }

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("message:receive", onMessageReceive);
    socket.on("typing:start", onTypingStart);
    socket.on("typing:stop", onTypingStop);
    socket.on("message:seen", onMessageSeen);
    socket.on("message:deleted", onMessageDeleted);

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("message:receive", onMessageReceive);
      socket.off("typing:start", onTypingStart);
      socket.off("typing:stop", onTypingStop);
      socket.off("message:seen", onMessageSeen);
      socket.off("message:deleted", onMessageDeleted);
      clearTimeout(typingStopRef.current);
      clearTimeout(typingEmitRef.current);
    };
  }, [coupleId, user?._id]);

  // ─── Auto-scroll ──────────────────────────────────────────────────────────

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPartnerTyping]);

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
    (text) => {
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
      };

      setMessages((prev) => [...prev, optimistic]);
      setSendError("");

      emitMessageSend({ coupleId, text }, (ack) => {
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
    [coupleId, user?._id]
  );

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
      <ChatHeader partner={partner} socketConnected={socketConnected} />

      <div className="chat-page__body">
        {loading ? (
          <div className="chat-page__skeletons">
            {["left", "right", "left", "right"].map((side, i) => (
              <div key={i} className={`chat-page__sk chat-page__sk--${side}`} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-page__empty-state">
            <span className="chat-page__empty-emoji">💌</span>
            <p className="chat-page__empty-title">No messages yet</p>
            <p className="chat-page__empty-sub">
              Send the first message to your partner.
            </p>
          </div>
        ) : (
          <div className="chat-page__thread">
            {messages.map((msg) => (
              <MessageBubble
                key={msg._id}
                message={msg}
                isMine={flatSenderId(msg.senderId) === String(user?._id)}
                onDelete={handleDeleteRequest}
              />
            ))}
            {isPartnerTyping && <TypingIndicator />}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {sendError && (
        <p className="chat-page__send-err" role="alert">
          {sendError}
        </p>
      )}

      <MessageInput
        onSend={handleSend}
        onTyping={handleTyping}
        disabled={false}
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
