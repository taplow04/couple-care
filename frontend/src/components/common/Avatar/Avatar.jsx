import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import "./Avatar.css";

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "♥";

/**
 * The single avatar renderer used across the whole app — and the Instagram-style
 * navigation entry point. Tap behaviour:
 *   • the avatar of the CURRENT user  → opens the Personal Profile (/profile)
 *   • the avatar of anyone else (the partner, in a 1:1 app) → /partner
 *
 * Pass either a `user` object ({ _id, name, profilePhoto }) or the individual
 * `userId` / `name` / `photo` props. Set `navigable={false}` for a purely
 * decorative avatar, or pass `onClick` to override the destination.
 */
const Avatar = ({
  user,
  userId,
  name,
  photo,
  size = 44,
  ring = false,
  navigable = true,
  onClick,
  className = "",
  alt,
}) => {
  const navigate = useNavigate();
  const { user: me } = useAuth();

  const id = userId || user?._id || null;
  const displayName = name || user?.name || "";
  const src = photo || user?.profilePhoto || "";
  const isSelf = id && me?._id && String(id) === String(me._id);

  const handleClick = (e) => {
    if (onClick) return onClick(e);
    if (!navigable) return;
    navigate(isSelf ? "/profile" : "/partner");
  };

  const interactive = navigable || Boolean(onClick);
  const dimension = { width: size, height: size, fontSize: Math.round(size * 0.4) };

  const inner = src ? (
    <img src={src} alt={alt || displayName || "avatar"} className="cc-avatar__img" />
  ) : (
    <span className="cc-avatar__initials">{initialsOf(displayName)}</span>
  );

  if (!interactive) {
    return (
      <span
        className={`cc-avatar${ring ? " cc-avatar--ring" : ""} ${className}`}
        style={dimension}
      >
        {inner}
      </span>
    );
  }

  return (
    <button
      type="button"
      className={`cc-avatar cc-avatar--btn${ring ? " cc-avatar--ring" : ""} ${className}`}
      style={dimension}
      onClick={handleClick}
      aria-label={
        isSelf ? "Open your profile" : `Open ${displayName || "partner"}'s profile`
      }
    >
      {inner}
    </button>
  );
};

export default Avatar;
