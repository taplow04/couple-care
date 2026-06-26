import "./PassportCard.css";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—";

/**
 * Relationship Passport — a premium, shareable achievement card. Pure
 * presentation: all values come from /profile/passport.
 */
const PassportCard = ({ passport, coupleName }) => {
  if (!passport) return null;

  const rows = [
    { label: "Member Since", value: formatDate(passport.memberSince) },
    { label: "Current Relationship", value: passport.currentRelationship ? "Active 💞" : "—" },
    { label: "Previous Journeys", value: passport.previousJourneys ?? 0 },
    { label: "Days Together", value: passport.daysTogether ?? 0 },
    { label: "Relationship Level", value: `${passport.badge?.emoji || ""} ${passport.level ?? 1}` },
    { label: "Relationship XP", value: passport.relationshipXP ?? 0 },
    { label: "Journey Chapters", value: passport.journeyChapters ?? 0 },
    { label: "Achievements", value: `${passport.achievements?.unlocked ?? 0}/${passport.achievements?.total ?? 0}` },
  ];

  return (
    <div className="passport">
      <div className="passport__sheen" aria-hidden="true" />

      <div className="passport__top">
        <span className="passport__brand">❤️ CoupleCare Passport</span>
        {passport.trustBadge && passport.trustBadge.tier !== "none" && (
          <span className="passport__trust">
            {passport.trustBadge.emoji} {passport.trustBadge.label}
          </span>
        )}
      </div>

      <div className="passport__hero">
        <div className="passport__meter">
          <span className="passport__meter-num">
            {passport.loveMeter != null ? passport.loveMeter : "—"}
          </span>
          <span className="passport__meter-label">Love Meter</span>
        </div>
        <div className="passport__health">
          <span className="passport__health-num">
            {passport.relationshipHealth != null ? `${passport.relationshipHealth}%` : "—"}
          </span>
          <span className="passport__health-label">Health</span>
        </div>
      </div>

      {coupleName && <p className="passport__name">{coupleName}</p>}

      <div className="passport__rows">
        {rows.map((r) => (
          <div key={r.label} className="passport__row">
            <span className="passport__row-label">{r.label}</span>
            <span className="passport__row-value">{r.value}</span>
          </div>
        ))}
      </div>

      <p className="passport__foot">A record of your journey together 💫</p>
    </div>
  );
};

export default PassportCard;
