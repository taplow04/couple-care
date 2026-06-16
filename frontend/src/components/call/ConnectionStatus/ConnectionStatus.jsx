import "./ConnectionStatus.css";

/**
 * Maps the RTCPeerConnection.connectionState to a friendly, themed label.
 * Only renders something when the connection is NOT healthy/active, so it
 * stays out of the way during a normal call.
 */
const STATUS_MAP = {
  new: { label: "Starting…", tone: "pending" },
  connecting: { label: "Connecting…", tone: "pending" },
  disconnected: { label: "Reconnecting…", tone: "warning" },
  failed: { label: "Connection lost", tone: "danger" },
};

const ConnectionStatus = ({ connectionState, callState }) => {
  // While the partner hasn't picked up we show ringing copy instead.
  if (callState === "outgoing") {
    return (
      <div className="conn-status conn-status--pending">
        <span className="conn-status__dot" />
        Ringing…
      </div>
    );
  }

  if (connectionState === "connected" || callState === "active") {
    return null;
  }

  const info = STATUS_MAP[connectionState];
  if (!info) return null;

  return (
    <div className={`conn-status conn-status--${info.tone}`}>
      <span className="conn-status__dot" />
      {info.label}
    </div>
  );
};

export default ConnectionStatus;
