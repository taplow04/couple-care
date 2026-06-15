import "./PairCodeCard.css";

const PairCodeCard = ({ code }) => (
  <div className="pair-code-card">
    <p className="pair-code-card__label">Your Pair Code</p>
    <div className="pair-code-card__code">{code}</div>
    <p className="pair-code-card__hint">Share this with your partner to connect</p>
  </div>
);

export default PairCodeCard;
