import { getFirstName } from "../../../utils/getFirstName";
import "./WelcomeCard.css";

const getGreeting = (name) => {
  const hour = new Date().getHours();
  const first = getFirstName(name);
  if (hour >= 5 && hour < 12) return `Good morning, ${first}`;
  if (hour >= 12 && hour < 17) return `Good afternoon, ${first}`;
  if (hour >= 17 && hour < 21) return `Good evening, ${first}`;
  return `Good night, ${first}`;
};

const formatDate = () =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  }).format(new Date());

const MESSAGES = [
  "Every moment together is a treasure worth keeping.",
  "Love is built in small moments every single day.",
  "Your story is still being written. Make it beautiful.",
];

const getRotatingMessage = () => MESSAGES[new Date().getDate() % MESSAGES.length];

const Avatar = ({ photo, name, size, className = "", onClick }) => {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={`wc-avatar ${className}`}
        style={{ width: size, height: size }}
        onClick={onClick}
      />
    );
  }
  const initial = name ? name[0].toUpperCase() : "?";
  return (
    <div
      className={`wc-avatar wc-avatar--initials ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
      aria-label={name}
      onClick={onClick}
    >
      {initial}
    </div>
  );
};

const WelcomeCard = ({ user, partner, onPartnerClick, onSelfClick }) => {
  return (
    <div className="wc-card">
      <div className="wc-blob wc-blob--1" aria-hidden="true" />
      <div className="wc-blob wc-blob--2" aria-hidden="true" />

      <div className="wc-inner">
        <div className="wc-left">
          <p className="wc-date">{formatDate()}</p>
          <h2 className="wc-greeting">{getGreeting(user?.name)}</h2>
          {partner && (
            <p
              className={`wc-partner ${onPartnerClick ? "wc-partner--link" : ""}`}
              onClick={onPartnerClick}
              role={onPartnerClick ? "button" : undefined}
            >
              <span className="wc-heart" aria-hidden="true">💕</span>
              Connected with {getFirstName(partner.name)}
            </p>
          )}
          <p className="wc-message">{getRotatingMessage()}</p>
        </div>

        <div className="wc-right">
          <div className="wc-avatars">
            <Avatar
              photo={user?.profilePhoto}
              name={user?.name}
              size={52}
              className={`wc-avatar--you ${onSelfClick ? "wc-avatar--clickable" : ""}`}
              onClick={onSelfClick}
            />
            {partner && (
              <Avatar
                photo={partner.profilePhoto}
                name={partner.name}
                size={52}
                className={`wc-avatar--partner ${onPartnerClick ? "wc-avatar--clickable" : ""}`}
                onClick={onPartnerClick}
              />
            )}
            {!partner && (
              <div className="wc-avatar wc-avatar--empty" style={{ width: 52, height: 52 }}>
                <span aria-label="no partner">+</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WelcomeCard;
