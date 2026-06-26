import Avatar from "../../common/Avatar/Avatar";
import "./ProfileHeader.css";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null;

const STATUS_LABEL = {
  active: "In a relationship",
  paused: "It's complicated",
  broken_up: "Single",
  single: "Single",
};

/**
 * Personal / partner profile header: cover banner, avatar, name, @username,
 * relationship badge, bio, birthday and join date. When `editable`, shows
 * camera buttons that call onEditCover / onEditAvatar (owner only).
 */
const ProfileHeader = ({
  user,
  relationship,
  editable = false,
  uploading = false,
  onEditCover,
  onEditAvatar,
  navigable = false,
}) => {
  if (!user) return null;

  const badge = relationship?.badge;
  const status = STATUS_LABEL[relationship?.status] || "Single";

  return (
    <header className="ph">
      <div className="ph__cover" style={user.coverPhoto ? { backgroundImage: `url(${user.coverPhoto})` } : undefined}>
        {!user.coverPhoto && <div className="ph__cover-fallback" aria-hidden="true" />}
        {editable && (
          <button className="ph__cover-edit" onClick={onEditCover} disabled={uploading} aria-label="Change cover photo">
            📷
          </button>
        )}
      </div>

      <div className="ph__body">
        <div className="ph__avatar-wrap">
          <Avatar user={user} size={96} navigable={navigable} ring />
          {editable && (
            <button className="ph__avatar-edit" onClick={onEditAvatar} disabled={uploading} aria-label="Change profile photo">
              📷
            </button>
          )}
        </div>

        <div className="ph__identity">
          <h1 className="ph__name">{user.name}</h1>
          {user.username && <p className="ph__username">@{user.username}</p>}

          <div className="ph__badges">
            {badge && (
              <span className="ph__badge ph__badge--level">
                {badge.emoji} {badge.label}
              </span>
            )}
            <span className="ph__badge ph__badge--status">💞 {status}</span>
            {relationship?.trustBadge && relationship.trustBadge.tier !== "none" && (
              <span className={`ph__badge ph__badge--trust ph__badge--${relationship.trustBadge.tier}`}>
                {relationship.trustBadge.emoji} {relationship.trustBadge.label}
              </span>
            )}
          </div>

          {user.bio && <p className="ph__bio">{user.bio}</p>}

          <div className="ph__meta">
            {user.birthday && (
              <span className="ph__meta-item">🎂 {formatDate(user.birthday)}</span>
            )}
            {user.joinedDate && (
              <span className="ph__meta-item">📅 Joined {formatDate(user.joinedDate)}</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default ProfileHeader;
