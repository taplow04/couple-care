import { Link } from "react-router-dom";
import "./SleepCard.css";

/**
 * Dashboard entry point to the Sleep Tracker. Shows last night's hours if a log
 * exists, otherwise a gentle CTA. `lastLog` = most recent SleepLog or null.
 */
const SleepCard = ({ lastLog }) => {
  return (
    <Link to="/sleep" className="sleepcard">
      <span className="sleepcard__emoji">😴</span>
      <div className="sleepcard__text">
        <h3 className="sleepcard__title">Sleep</h3>
        <p className="sleepcard__sub">
          {lastLog
            ? `${lastLog.hours}h last logged · tap for insights →`
            : "Track your sleep & sync →"}
        </p>
      </div>
      {lastLog && (
        <span className="sleepcard__hours">{lastLog.hours}<small>h</small></span>
      )}
    </Link>
  );
};

export default SleepCard;
