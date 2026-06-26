import "./ProfileStats.css";

/**
 * The Instagram-style stat row — but relationship-focused. Replaces
 * Followers/Following/Posts with Photos / Videos / Achievements /
 * Relationship Journey (days) / CoupleCare Journey (count).
 */
const ProfileStats = ({ stats }) => {
  const cells = [
    { label: "Photos", value: stats?.photos ?? 0 },
    { label: "Videos", value: stats?.videos ?? 0 },
    { label: "Badges", value: stats?.achievements ?? 0 },
    { label: "Days", value: stats?.relationshipJourney ?? 0 },
    { label: "Journeys", value: stats?.coupleCareJourney ?? 0 },
  ];

  return (
    <div className="pstats">
      {cells.map((c) => (
        <div key={c.label} className="pstats__cell">
          <span className="pstats__num">{c.value}</span>
          <span className="pstats__label">{c.label}</span>
        </div>
      ))}
    </div>
  );
};

export default ProfileStats;
