import AIReport from "../../ai/AIReport/AIReport";
import "./SleepInsights.css";

/**
 * Sleep insights: key stats (avg hours, quality, partner sync) + the AI's
 * narrative (rendered via the shared AIReport Strengths/Opportunities/Suggestions).
 */
const SleepInsights = ({ stats, analysis, loading }) => {
  return (
    <div className="sleep-insights">
      <div className="sleep-insights__stats">
        <div className="sleep-stat">
          <span className="sleep-stat__value">{stats?.avgHours ?? "—"}</span>
          <span className="sleep-stat__label">avg hours</span>
        </div>
        <div className="sleep-stat">
          <span className="sleep-stat__value">
            {stats?.avgQuality ? `${stats.avgQuality}/5` : "—"}
          </span>
          <span className="sleep-stat__label">quality</span>
        </div>
        <div className="sleep-stat">
          <span className="sleep-stat__value">
            {stats?.syncPercent != null ? `${stats.syncPercent}%` : "—"}
          </span>
          <span className="sleep-stat__label">in sync</span>
        </div>
      </div>

      {loading ? (
        <div className="sleep-insights__shimmer">
          {[90, 100, 80].map((w, i) => (
            <div key={i} className="sleep-insights__line" style={{ width: `${w}%` }} />
          ))}
        </div>
      ) : analysis ? (
        <div className="sleep-insights__report">
          <AIReport text={analysis} />
        </div>
      ) : (
        <p className="sleep-insights__empty">
          Log a few nights of sleep to unlock AI insights about your rest and sync.
        </p>
      )}
    </div>
  );
};

export default SleepInsights;
