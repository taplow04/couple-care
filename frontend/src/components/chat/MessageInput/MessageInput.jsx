import { useState, useRef } from "react";
import "./MessageInput.css";

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
      <button className="msg-input__emoji" aria-label="Emoji" tabIndex={-1}>☺</button>

      <input
        ref={inputRef}
        className="msg-input__field"
        type="text"
        value={text}
        placeholder={disabled ? "No partner connected" : "Message..."}
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
        Send
      </button>
    </div>
  );
};

export default MessageInput;
