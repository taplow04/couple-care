import "./TypingIndicator.css";

const TypingIndicator = ({ partnerName }) => (
  <div className="typing-indicator">
    <div className="typing-indicator__bubble">
      <span className="typing-indicator__dot" />
      <span className="typing-indicator__dot" />
      <span className="typing-indicator__dot" />
    </div>
    <span className="typing-indicator__label">
      {partnerName ? `${partnerName.split(" ")[0]} is typing` : "Typing"}
    </span>
  </div>
);

export default TypingIndicator;
