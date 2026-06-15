import OnlineStatus from "../OnlineStatus/OnlineStatus";
import "./ChatHeader.css";

const ChatHeader = ({ partner, socketConnected }) => {
  const initial = partner?.name ? partner.name[0].toUpperCase() : "♥";

  return (
    <div className="chat-header">
      <div className="chat-header__avatar-ring">
        <div className="chat-header__avatar">
          {partner?.profilePhoto ? (
            <img src={partner.profilePhoto} alt={partner.name} className="chat-header__avatar-img" />
          ) : (
            <span className="chat-header__avatar-initial">{initial}</span>
          )}
        </div>
      </div>

      <div className="chat-header__info">
        <h2 className="chat-header__name">{partner?.name || "Your Partner"}</h2>
        <OnlineStatus connected={socketConnected} />
      </div>

      <div className="chat-header__actions">
        <button className="chat-header__icon-btn" aria-label="Love">💕</button>
      </div>
    </div>
  );
};

export default ChatHeader;
