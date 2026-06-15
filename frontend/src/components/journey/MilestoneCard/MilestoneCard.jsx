import "./MilestoneCard.css";

const MEMORY_TYPE_ICON = {
  date: "🌹", trip: "✈️", birthday: "🎂", anniversary: "💍",
  proposal: "💎", gift: "🎁", milestone: "🌟", other: "💫",
};

const MEMORY_TYPE_COLOR = {
  date:        "rgba(255,92,138,0.12)",
  trip:        "rgba(124,92,255,0.12)",
  birthday:    "rgba(255,200,0,0.12)",
  anniversary: "rgba(255,92,138,0.12)",
  proposal:    "rgba(124,92,255,0.12)",
  gift:        "rgba(50,195,108,0.12)",
  milestone:   "rgba(255,140,0,0.12)",
  other:       "rgba(100,100,100,0.08)",
};

const formatDate = (d) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(d));

const MilestoneCard = ({ event }) => {
  const { title, memoryType = "other", daysRemaining, memoryDate } = event;
  const icon   = MEMORY_TYPE_ICON[memoryType]  ?? "💫";
  const bg     = MEMORY_TYPE_COLOR[memoryType] ?? "rgba(100,100,100,0.08)";
  const soon   = daysRemaining <= 14;
  const urgent = daysRemaining <= 3;

  return (
    <div className={`mc ${urgent ? "mc--urgent" : soon ? "mc--soon" : ""}`}>
      <div className="mc__icon-wrap" style={{ background: bg }}>
        <span className="mc__icon">{icon}</span>
      </div>

      <div className="mc__body">
        <h4 className="mc__title">{title}</h4>
        <p className="mc__date">{formatDate(memoryDate)}</p>
      </div>

      <div className={`mc__badge ${urgent ? "mc__badge--urgent" : soon ? "mc__badge--soon" : ""}`}>
        <span className="mc__badge-num">{daysRemaining}</span>
        <span className="mc__badge-label">days</span>
      </div>
    </div>
  );
};

export default MilestoneCard;
