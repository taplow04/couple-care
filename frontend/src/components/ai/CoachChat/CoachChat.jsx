import { useEffect, useRef, useState } from "react";
import {
  getCoachConversations,
  getCoachConversation,
  deleteCoachConversation,
  sendCoachMessage,
} from "../../../services/coach.service";
import "./CoachChat.css";

const DEFAULT_SUGGESTIONS = [
  "We had an argument 😔",
  "Suggest a date idea 💡",
  "How can we communicate better?",
  "Help me plan a surprise 🎁",
  "My partner feels stressed",
];

const CoachChat = ({
  title = "🤖 AI Coach",
  subtitle = "Talk through anything — judgment-free",
  suggestions = DEFAULT_SUGGESTIONS,
  emptyText = "Ask your relationship coach anything. It knows your journey and is here to help.",
}) => {
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const threadRef = useRef(null);

  // Load the conversation list, open the most recent if any.
  useEffect(() => {
    let alive = true;
    getCoachConversations()
      .then((res) => {
        if (!alive) return;
        const list = res.data || [];
        setConversations(list);
        if (list[0]) {
          setActiveId(list[0]._id);
          getCoachConversation(list[0]._id)
            .then((r) => alive && setMessages(r.data?.messages || []))
            .catch(() => {});
        }
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Auto-scroll to the latest message.
  useEffect(() => {
    const el = threadRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, sending]);

  const openConversation = async (id) => {
    setActiveId(id);
    setMessages([]);
    try {
      const res = await getCoachConversation(id);
      setMessages(res.data?.messages || []);
    } catch {
      setError("Couldn't load that conversation.");
    }
  };

  const startNew = () => {
    setActiveId(null);
    setMessages([]);
    setError("");
  };

  const refreshList = () => {
    getCoachConversations()
      .then((res) => setConversations(res.data || []))
      .catch(() => {});
  };

  const send = async (text) => {
    const msg = text.trim();
    if (!msg || sending) return;
    setError("");
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: msg }]);
    setSending(true);
    try {
      const res = await sendCoachMessage(activeId, msg);
      setActiveId(res.data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: res.data.reply }]);
      refreshList();
    } catch {
      setError("The coach is unavailable right now. Please try again.");
      // Roll back the optimistic user message so they can retry.
      setMessages((prev) => prev.slice(0, -1));
      setInput(msg);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    setConversations((prev) => prev.filter((c) => c._id !== id));
    if (id === activeId) startNew();
    try {
      await deleteCoachConversation(id);
    } catch {
      refreshList();
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    send(input);
  };

  return (
    <section className="coach">
      <div className="coach__head">
        <div>
          <h2 className="coach__title">{title}</h2>
          <p className="coach__sub">{subtitle}</p>
        </div>
        <button className="coach__new" onClick={startNew}>＋ New</button>
      </div>

      {conversations.length > 0 && (
        <div className="coach__convos">
          {conversations.map((c) => (
            <button
              key={c._id}
              className={`coach__convo ${c._id === activeId ? "coach__convo--on" : ""}`}
              onClick={() => openConversation(c._id)}
              title={c.title}
            >
              <span className="coach__convo-title">{c.title}</span>
              <span
                className="coach__convo-del"
                onClick={(e) => handleDelete(c._id, e)}
                role="button"
                aria-label="Delete conversation"
              >
                ✕
              </span>
            </button>
          ))}
        </div>
      )}

      <div className="coach__thread" ref={threadRef}>
        {messages.length === 0 && !sending && (
          <div className="coach__empty">
            <span className="coach__empty-emoji">💬</span>
            <p className="coach__empty-text">{emptyText}</p>
            <div className="coach__suggestions">
              {suggestions.map((s) => (
                <button key={s} className="coach__suggestion" onClick={() => send(s)}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`coach-msg ${m.role === "user" ? "coach-msg--me" : "coach-msg--ai"}`}
          >
            {m.role === "assistant" && <span className="coach-msg__avatar">🤖</span>}
            <div className="coach-msg__bubble">{m.content}</div>
          </div>
        ))}

        {sending && (
          <div className="coach-msg coach-msg--ai">
            <span className="coach-msg__avatar">🤖</span>
            <div className="coach-msg__bubble coach-msg__typing">
              <span /><span /><span />
            </div>
          </div>
        )}
      </div>

      {error && <p className="coach__error">{error}</p>}

      <form className="coach__composer" onSubmit={onSubmit}>
        <input
          className="coach__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message…"
          disabled={sending}
        />
        <button className="coach__send" type="submit" disabled={!input.trim() || sending}>
          ➤
        </button>
      </form>
    </section>
  );
};

export default CoachChat;
