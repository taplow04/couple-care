import "./MomentCircle.css";

const initialsOf = (name = "") =>
  name
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "♥";

/**
 * A single Instagram-style story circle.
 *  - `hasMoments` + `unseen`  → animated gradient ring (something new to watch)
 *  - `hasMoments` + seen      → faded ring
 *  - no moments + `addable`   → dashed "add" ring with a + badge (your circle)
 */
const MomentCircle = ({
  name,
  photo,
  label,
  hasMoments = false,
  unseen = false,
  addable = false,
  onClick,
}) => {
  const ringClass = hasMoments
    ? unseen
      ? "moment-circle__ring--unseen"
      : "moment-circle__ring--seen"
    : addable
      ? "moment-circle__ring--add"
      : "moment-circle__ring--empty";

  return (
    <button type="button" className="moment-circle" onClick={onClick} aria-label={label}>
      <span className={`moment-circle__ring ${ringClass}`}>
        <span className="moment-circle__inner">
          {photo ? (
            <img src={photo} alt={name || label} className="moment-circle__img" />
          ) : (
            <span className="moment-circle__initials">{initialsOf(name)}</span>
          )}
        </span>
        {addable && !hasMoments && (
          <span className="moment-circle__add" aria-hidden="true">
            +
          </span>
        )}
      </span>
      <span className="moment-circle__label">{label}</span>
    </button>
  );
};

export default MomentCircle;
