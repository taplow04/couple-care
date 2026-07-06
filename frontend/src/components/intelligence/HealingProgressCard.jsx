import { useEffect, useState } from "react";
import { getHealingProgress } from "../../services/intelligence.service";
import ScoreRing from "./ScoreRing";
import DimensionBars from "./DimensionBars";
import "./intelligence.css";

const DIMENSION_LABELS = {
  routine: "Routine",
  journaling: "Journaling",
  moodCare: "Mood care",
  challenges: "Daily challenges",
  sleep: "Sleep care",
  support: "Support",
  selfDiscovery: "Self-discovery",
};

const INSIGHT_EMOJI = {
  gentle: "🌤",
  supportive: "🤝",
  positive: "🌟",
};

/**
 * Healing Progress card (Stage 3 dashboard) — engagement with recovery
 * activities, never emotional worth. Includes the engine's gentle insights.
 */
const HealingProgressCard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getHealingProgress()
      .then((r) => active && setData(r.data))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div className="intel-skeleton" />;
  if (!data) return null;

  const dims = Object.entries(data.breakdown || {}).map(([key, score]) => ({
    key,
    label: DIMENSION_LABELS[key] || key,
    score,
  }));

  return (
    <div className="intel-card">
      <div className="intel-card__head">
        <h3 className="intel-card__title">🌱 Healing Progress</h3>
        <span className="intel-conf">{data.confidence}% confidence</span>
      </div>
      <div className="intel-ring">
        <ScoreRing score={data.score} size={84} strokeWidth={8} />
        <div className="intel-ring__body">
          <p className="intel-ring__level">{data.level}</p>
          <p className="intel-ring__note">
            This reflects how you're engaging with recovery — journaling, routines,
            support — never how you "should" feel.
            {data.daysSinceBreakup != null && ` Day ${data.daysSinceBreakup} of your journey.`}
          </p>
        </div>
      </div>

      {dims.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <DimensionBars items={dims} />
        </div>
      )}

      {(data.insights || []).map((ins) => (
        <div key={ins.type} className={`intel-insight ${ins.tone === "supportive" ? "intel-insight--supportive" : ""}`}>
          <span className="intel-factor__emoji">{INSIGHT_EMOJI[ins.tone] || "🌤"}</span>
          <p className="intel-insight__text">{ins.text}</p>
        </div>
      ))}
    </div>
  );
};

export default HealingProgressCard;
