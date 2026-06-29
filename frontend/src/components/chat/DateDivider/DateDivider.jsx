import "./DateDivider.css";

/**
 * Centered day separator in the message thread (Today / Yesterday / date) — the
 * grouping every premium chat (WhatsApp / Telegram / iMessage) uses to give the
 * conversation rhythm. Pure presentational; theme-aware glass pill.
 */
const DateDivider = ({ label }) => (
  <div className="chat-divider" role="separator" aria-label={label}>
    <span className="chat-divider__pill">{label}</span>
  </div>
);

export default DateDivider;
