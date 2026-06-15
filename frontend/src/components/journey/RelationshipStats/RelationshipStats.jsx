import "./RelationshipStats.css";

const MILESTONES = [
  { days: 30, label: "1 Month" },
  { days: 90, label: "3 Months" },
  { days: 180, label: "6 Months" },
  { days: 365, label: "1 Year" },
  { days: 730, label: "2 Years" },
  { days: 1095, label: "3 Years" },
  { days: 1825, label: "5 Years" },
];

const getNextMilestone = (days) => {
  const next = MILESTONES.find((m) => days < m.days);
  return next ? { ...next, daysLeft: next.days - days } : null;
};

const RelationshipStats = ({ daysTogether, totalMemories, healthScore, loading }) => {
  const next = getNextMilestone(daysTogether);
  const score = healthScore?.score;
  const level = healthScore?.level;

  const stats = [
    {
      id: "days",
      icon: "🗓️",
      value: daysTogether.toLocaleString(),
      label: "Days Together",
      accent: "primary",
    },
    {
      id: "memories",
      icon: "📸",
      value: (totalMemories ?? 0).toString(),
      label: "Memories Shared",
      accent: "secondary",
    },
    {
      id: "score",
      icon: "💝",
      value: loading ? "—" : score != null ? score.toString() : "—",
      label: loading ? "Health Score" : (level ?? "Health Score"),
      accent: "success",
    },
    {
      id: "milestone",
      icon: "🎯",
      value: next ? `${next.daysLeft}` : "✓",
      label: next ? `Days to ${next.label}` : "All Milestones!",
      accent: next ? "warning" : "success",
    },
  ];

  return (
    <div className="rs">
      {stats.map((s) => (
        <div key={s.id} className={`rs__card rs__card--${s.accent}`}>
          <span className="rs__icon">{s.icon}</span>
          <span className="rs__value">{s.value}</span>
          <span className="rs__label">{s.label}</span>
        </div>
      ))}
    </div>
  );
};

export default RelationshipStats;
