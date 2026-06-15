import { useState, useRef } from "react";
import "./MessageInput.css";

const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MessageInput = ({ onSend, onTyping, disabled }) => {
  const [text, setText] = useState("");
  const inputRef = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);
    if (e.target.value && onTyping) onTyping();
  };

  const submit = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="msg-input">
      <input
        ref={inputRef}
        className="msg-input__field"
        type="text"
        value={text}
        placeholder={disabled ? "No partner connected" : "Type a message…"}
        maxLength={1000}
        disabled={disabled}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      <button
        type="button"
        className="msg-input__send"
        disabled={!text.trim() || disabled}
        aria-label="Send"
        onClick={submit}
      >
        <SendIcon />
      </button>
    </div>
  );
};

export default MessageInput;
