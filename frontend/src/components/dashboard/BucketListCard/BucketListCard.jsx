import { Link } from "react-router-dom";
import BucketProgress from "../../bucket/BucketProgress/BucketProgress";
import "./BucketListCard.css";

/**
 * Dashboard entry point to the Couple Bucket List. Shows completion progress and
 * links to the full page. `stats` = { total, completed, percent }.
 */
const BucketListCard = ({ stats, loading }) => {
  return (
    <Link to="/bucket-list" className="bucketcard">
      <div className="bucketcard__text">
        <div className="bucketcard__head">
          <span className="bucketcard__emoji">🪣</span>
          <h3 className="bucketcard__title">Bucket List</h3>
        </div>
        <p className="bucketcard__sub">
          {loading
            ? "Loading your goals…"
            : !stats || stats.total === 0
              ? "Add your first dream together →"
              : stats.percent === 100
                ? "All goals complete — dream bigger! →"
                : `${stats.completed}/${stats.total} done · keep going →`}
        </p>
      </div>

      {stats && stats.total > 0 && (
        <BucketProgress percent={stats.percent} completed={stats.completed} total={stats.total} />
      )}
    </Link>
  );
};

export default BucketListCard;
