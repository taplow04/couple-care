import { getFirstName } from "../../../utils/getFirstName";
import "./JourneyHeader.css";

const getInitials = (name = "") =>
  name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

const STATUS_LABEL = {
  active: "Together",
  paused: "On Pause",
  broken_up: "Separated",
};

const formatDuration = (days) => {
  if (days < 30) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 365) {
    const m = Math.floor(days / 30);
    return `${m} month${m === 1 ? "" : "s"}`;
  }
  const y = Math.floor(days / 365);
  const rem = Math.floor((days % 365) / 30);
  return rem > 0 ? `${y}y ${rem}mo` : `${y} year${y === 1 ? "" : "s"}`;
};

const JourneyHeader = ({ user, partner, relationship }) => {
  const days = relationship?.daysTogether ?? 0;
  const status = relationship?.status ?? "active";

  return (
    <header className="jh">
      <div className="jh__orb jh__orb--tl" aria-hidden="true" />
      <div className="jh__orb jh__orb--br" aria-hidden="true" />

      <div className="jh__floating" aria-hidden="true">
        <span className="jh__float jh__float--1">💕</span>
        <span className="jh__float jh__float--2">✨</span>
        <span className="jh__float jh__float--3">💫</span>
      </div>

      <p className="jh__eyebrow">Our Journey</p>

      <div className="jh__couple">
        <div className="jh__avatar-wrap">
          {user?.profilePhoto ? (
            <img src={user.profilePhoto} alt={user?.name} className="jh__avatar-img" />
          ) : (
            <span className="jh__avatar-init">{getInitials(user?.name)}</span>
          )}
        </div>

        <div className="jh__heart-wrap" aria-hidden="true">
          <svg className="jh__heart-svg" viewBox="0 0 40 36" fill="none">
            <path
              d="M20 34C20 34 3 22 3 12C3 7.03 7.03 3 12 3C15.5 3 18.5 5 20 8C21.5 5 24.5 3 28 3C32.97 3 37 7.03 37 12C37 22 20 34 20 34Z"
              fill="white"
              fillOpacity="0.25"
              stroke="white"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        <div className="jh__avatar-wrap">
          {partner?.profilePhoto ? (
            <img src={partner.profilePhoto} alt={partner?.name} className="jh__avatar-img" />
          ) : (
            <span className="jh__avatar-init">{getInitials(partner?.name ?? "?")}</span>
          )}
        </div>
      </div>

      <div className="jh__names">
        <span className="jh__name">{getFirstName(user?.name, "You")}</span>
        <span className="jh__amp">&</span>
        <span className="jh__name">{getFirstName(partner?.name, "Partner")}</span>
      </div>

      <div className="jh__duration">
        <span className="jh__duration-num">{days.toLocaleString()}</span>
        <span className="jh__duration-unit">days together</span>
        <span className="jh__duration-alt">({formatDuration(days)})</span>
      </div>

      <span className={`jh__status jh__status--${status}`}>
        {status === "active" ? "❤️" : "💔"} {STATUS_LABEL[status] ?? "Together"}
      </span>
    </header>
  );
};

export default JourneyHeader;
