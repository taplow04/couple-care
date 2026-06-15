import "./TimelineCard.css";

const MEMORY_TYPE_ICON = {
  date: "🌹", trip: "✈️", birthday: "🎂", anniversary: "💍",
  proposal: "💎", gift: "🎁", milestone: "🌟", other: "💫",
};

const MEMORY_TYPE_COLOR = {
  date:        "#ff5c8a",
  trip:        "#7c5cff",
  birthday:    "#ffaa00",
  anniversary: "#ff5c8a",
  proposal:    "#7c5cff",
  gift:        "#32c36c",
  milestone:   "#ff8c00",
  other:       "#888899",
};

const formatDate = (d) =>
  new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(d));

const TimelineCard = ({ memory, isLast }) => {
  const { title, description, memoryType = "other", memoryDate, photos } = memory;
  const icon  = MEMORY_TYPE_ICON[memoryType]  ?? "💫";
  const color = MEMORY_TYPE_COLOR[memoryType] ?? "#888899";
  const photo = photos?.[0] ?? null;

  return (
    <div className="tc">
      <div className="tc__connector">
        <div className="tc__dot" style={{ background: color }} />
        {!isLast && <div className="tc__line" />}
      </div>

      <div className="tc__card">
        {photo && (
          <div className="tc__photo-wrap">
            <img src={photo} alt={title} className="tc__photo" loading="lazy" />
          </div>
        )}

        <div className="tc__body">
          <div className="tc__meta">
            <span className="tc__type-badge" style={{ color, background: `${color}18` }}>
              {icon} {memoryType}
            </span>
            <span className="tc__date">{formatDate(memoryDate)}</span>
          </div>

          <h4 className="tc__title">{title}</h4>

          {description && (
            <p className="tc__desc">
              {description.length > 120 ? `${description.slice(0, 120)}…` : description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TimelineCard;
