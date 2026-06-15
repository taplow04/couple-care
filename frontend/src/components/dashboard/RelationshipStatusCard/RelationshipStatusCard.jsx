import "./RelationshipStatusCard.css";

const STATUS_CONFIG = {
  active: { label: "Active", dotClass: "rsc-dot--active" },
  paused: { label: "On Break", dotClass: "rsc-dot--paused" },
  broken_up: { label: "Ended", dotClass: "rsc-dot--ended" },
};

const formatDuration = (days) => {
  if (!days && days !== 0) return { big: "—", sub: "days together" };
  if (days === 0) return { big: "0", sub: "days together" };
  if (days < 365) {
    return { big: String(days), sub: days === 1 ? "day together" : "days together" };
  }
  const years = Math.floor(days / 365);
  const remaining = days % 365;
  const months = Math.floor(remaining / 30);
  if (months > 0) {
    return {
      big: `${years}`,
      sub: `yr${years > 1 ? "s" : ""} & ${months} mo`,
    };
  }
  return {
    big: String(years),
    sub: `year${years > 1 ? "s" : ""} together`,
  };
};

const RelationshipStatusCard = ({ relationship }) => {
  const { daysTogether, status } = relationship || {};
  const statusConfig = STATUS_CONFIG[status] || STATUS_CONFIG.active;
  const { big, sub } = formatDuration(daysTogether);

  return (
    <div className="rsc-card">
      <p className="rsc-label">Days Together</p>

      <div className="rsc-center">
        <div className="rsc-heart" aria-hidden="true">💗</div>
        <p className="rsc-big">{big}</p>
        <p className="rsc-sub">{sub}</p>
      </div>

      <div className="rsc-status">
        <span className={`rsc-dot ${statusConfig.dotClass}`} />
        <span className="rsc-status-text">{statusConfig.label}</span>
      </div>
    </div>
  );
};

export default RelationshipStatusCard;
