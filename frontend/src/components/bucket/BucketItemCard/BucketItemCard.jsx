import { CATEGORY_META } from "../bucketCategories";
import "./BucketItemCard.css";

const formatDeadline = (d) => {
  if (!d) return null;
  const date = new Date(d);
  const now = new Date();
  const days = Math.ceil((date - now) / (1000 * 60 * 60 * 24));
  const label = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  if (days < 0) return { label: `${label} · overdue`, overdue: true };
  if (days === 0) return { label: "Today", overdue: false };
  if (days <= 7) return { label: `${label} · ${days}d left`, overdue: false };
  return { label, overdue: false };
};

const BucketItemCard = ({ item, onToggle, onDelete }) => {
  const cat = CATEGORY_META[item.category] || CATEGORY_META.other;
  const deadline = formatDeadline(item.deadline);

  return (
    <div className={`bucket-item ${item.completed ? "bucket-item--done" : ""}`}>
      <button
        type="button"
        className={`bucket-item__check ${item.completed ? "bucket-item__check--on" : ""}`}
        onClick={() => onToggle(item)}
        aria-label={item.completed ? "Mark not done" : "Mark done"}
      >
        {item.completed && (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M5 13l4 4L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <div className="bucket-item__body">
        <p className="bucket-item__title">{item.title}</p>
        <div className="bucket-item__meta">
          <span className="bucket-item__cat">
            {cat.emoji} {cat.label}
          </span>
          {deadline && (
            <span className={`bucket-item__deadline ${deadline.overdue ? "bucket-item__deadline--over" : ""}`}>
              📅 {deadline.label}
            </span>
          )}
        </div>
        {item.notes && <p className="bucket-item__notes">{item.notes}</p>}
      </div>

      <button
        type="button"
        className="bucket-item__del"
        onClick={() => onDelete(item)}
        aria-label="Delete goal"
      >
        🗑
      </button>
    </div>
  );
};

export default BucketItemCard;
