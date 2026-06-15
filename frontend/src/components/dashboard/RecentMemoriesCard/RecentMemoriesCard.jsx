import { Link } from "react-router-dom";
import "./RecentMemoriesCard.css";

const MEMORY_TYPE_ICON = {
  date: "🌹",
  trip: "✈️",
  birthday: "🎂",
  anniversary: "💍",
  proposal: "💎",
  gift: "🎁",
  milestone: "🌟",
  other: "💫",
};

const MEMORY_TYPE_COLOR = {
  date: "rgba(255,92,138,0.12)",
  trip: "rgba(124,92,255,0.12)",
  birthday: "rgba(255,200,0,0.12)",
  anniversary: "rgba(255,92,138,0.12)",
  proposal: "rgba(124,92,255,0.12)",
  gift: "rgba(50,195,108,0.12)",
  milestone: "rgba(255,140,0,0.12)",
  other: "rgba(100,100,100,0.08)",
};

const formatMemoryDate = (date) => {
  if (!date) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
};

const MemorySkeleton = () => (
  <div className="rmc2-list">
    {[1, 2, 3].map((i) => (
      <div key={i} className="rmc2-skeleton" />
    ))}
  </div>
);

const RecentMemoriesCard = ({ memories, loading = false }) => {
  if (loading) {
    return (
      <div className="rmc2-card">
        <div className="rmc2-header">
          <p className="rmc2-label">Our Memories</p>
        </div>
        <MemorySkeleton />
      </div>
    );
  }

  const hasMemories = memories && memories.length > 0;
  const displayed = hasMemories ? memories.slice(0, 4) : [];

  return (
    <div className="rmc2-card">
      <div className="rmc2-header">
        <p className="rmc2-label">Our Memories</p>
        {hasMemories && (
          <Link to="/memories" className="rmc2-see-all">
            See all →
          </Link>
        )}
      </div>

      {!hasMemories ? (
        <div className="rmc2-empty">
          <span className="rmc2-empty-emoji" role="img" aria-label="camera">📸</span>
          <p className="rmc2-empty-title">No memories yet</p>
          <p className="rmc2-empty-text">
            Capture your first special moment together.
          </p>
          <Link to="/memories" className="rmc2-empty-btn">
            Add First Memory
          </Link>
        </div>
      ) : (
        <div className="rmc2-scroll-wrap">
          <div className="rmc2-list">
            {displayed.map((memory) => {
              const typeIcon = MEMORY_TYPE_ICON[memory.memoryType] || "💫";
              const typeBg = MEMORY_TYPE_COLOR[memory.memoryType] || "rgba(100,100,100,0.08)";
              const hasPhoto = memory.photos && memory.photos.length > 0;

              return (
                <Link
                  key={memory._id}
                  to={`/memories/${memory._id}`}
                  className="rmc2-item"
                  aria-label={memory.title}
                >
                  <div
                    className="rmc2-item-thumb"
                    style={{
                      background: hasPhoto ? "transparent" : typeBg,
                    }}
                  >
                    {hasPhoto ? (
                      <img
                        src={memory.photos[0]}
                        alt={memory.title}
                        className="rmc2-item-photo"
                        loading="lazy"
                      />
                    ) : (
                      <span className="rmc2-item-icon" role="img" aria-label={memory.memoryType}>
                        {typeIcon}
                      </span>
                    )}
                  </div>
                  <p className="rmc2-item-title">{memory.title}</p>
                  <p className="rmc2-item-date">
                    {formatMemoryDate(memory.memoryDate)}
                  </p>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default RecentMemoriesCard;
