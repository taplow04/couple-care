import "./JourneyCard.css";

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "—";

/**
 * CoupleCare Journey — replaces a "relationship count" with a privacy-safe
 * summary. Shows ONLY counts + member-since; never names/details of past
 * relationships.
 */
const JourneyCard = ({ journey }) => {
  if (!journey) return null;

  const rows = [
    { label: "Member since", value: formatDate(journey.memberSince) },
    { label: "Days on CoupleCare", value: journey.daysOnCoupleCare ?? 0 },
    { label: "Current relationship", value: journey.currentRelationship ? "Yes 💞" : "—" },
    { label: "Previous journeys", value: journey.previousJourneys ?? 0 },
    { label: "Relationship level", value: `${journey.badge?.emoji || ""} Lvl ${journey.level ?? 1}` },
    { label: "Relationship XP", value: journey.relationshipXP ?? 0 },
    { label: "Achievements", value: journey.achievements ?? 0 },
    {
      label: "Relationship health",
      value: journey.relationshipHealth != null ? `${journey.relationshipHealth}%` : "—",
    },
  ];

  return (
    <div className="jcard">
      <div className="jcard__head">
        <h3 className="jcard__title">CoupleCare Journey</h3>
        {journey.trustBadge && journey.trustBadge.tier !== "none" && (
          <span className="jcard__trust">
            {journey.trustBadge.emoji} {journey.trustBadge.label}
          </span>
        )}
      </div>

      <div className="jcard__grid">
        {rows.map((r) => (
          <div key={r.label} className="jcard__row">
            <span className="jcard__label">{r.label}</span>
            <span className="jcard__value">{r.value}</span>
          </div>
        ))}
      </div>

      <p className="jcard__note">
        Only counts are ever shown — names, chats and photos from past journeys
        stay private. 🔒
      </p>
    </div>
  );
};

export default JourneyCard;
