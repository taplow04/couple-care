import "./ProfileAvatar.css";

const getInitials = (name = "") =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";

const CameraIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path
      d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const ProfileAvatar = ({
  src,
  name,
  size = "lg",
  editable = false,
  uploadProgress = null,
  onClick,
}) => {
  const initial = getInitials(name);
  const isUploading = uploadProgress !== null && uploadProgress < 100;

  // SVG ring progress
  const R = 46;
  const CIRC = 2 * Math.PI * R;
  const dash = isUploading ? CIRC * (1 - uploadProgress / 100) : 0;

  return (
    <div
      className={`profile-avatar profile-avatar--${size} ${editable ? "profile-avatar--editable" : ""}`}
      onClick={editable ? onClick : undefined}
      role={editable ? "button" : undefined}
      tabIndex={editable ? 0 : undefined}
      onKeyDown={editable && onClick ? (e) => e.key === "Enter" && onClick() : undefined}
      aria-label={editable ? "Change profile photo" : undefined}
    >
      {/* Progress ring */}
      {isUploading && (
        <svg className="profile-avatar__ring" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={R} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="4" />
          <circle
            cx="50"
            cy="50"
            r={R}
            fill="none"
            stroke="#fff"
            strokeWidth="4"
            strokeDasharray={CIRC}
            strokeDashoffset={dash}
            strokeLinecap="round"
            transform="rotate(-90 50 50)"
            style={{ transition: "stroke-dashoffset 0.3s ease" }}
          />
        </svg>
      )}

      {/* Image or initials */}
      {src ? (
        <img src={src} alt={name || "Profile"} className="profile-avatar__img" />
      ) : (
        <span className="profile-avatar__initials">{initial}</span>
      )}

      {/* Edit overlay */}
      {editable && !isUploading && (
        <div className="profile-avatar__overlay" aria-hidden="true">
          <CameraIcon />
          <span className="profile-avatar__overlay-label">Change</span>
        </div>
      )}

      {/* Upload progress label */}
      {isUploading && (
        <div className="profile-avatar__progress-label">{uploadProgress}%</div>
      )}
    </div>
  );
};

export default ProfileAvatar;
