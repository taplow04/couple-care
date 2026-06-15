import "./ConnectionStatus.css";

const ConnectionStatus = ({ status, partnerName }) => {
  if (status === "connecting") {
    return (
      <div className="conn-status conn-status--connecting">
        <div className="conn-status__ring" />
        <p className="conn-status__text">Connecting…</p>
      </div>
    );
  }

  if (status === "waiting") {
    return (
      <div className="conn-status conn-status--waiting">
        <div className="conn-status__pulse">
          <span>💕</span>
        </div>
        <p className="conn-status__text">Waiting for your partner to join…</p>
        <p className="conn-status__sub">Share your code and ask them to join</p>
      </div>
    );
  }

  if (status === "connected") {
    return (
      <div className="conn-status conn-status--connected">
        <div className="conn-status__check">✓</div>
        <p className="conn-status__text">
          {partnerName ? `Connected with ${partnerName}!` : "You're connected!"}
        </p>
      </div>
    );
  }

  return null;
};

export default ConnectionStatus;
