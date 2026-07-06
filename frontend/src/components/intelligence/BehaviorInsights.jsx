import { useEffect, useState } from "react";
import { getBehaviorIntelligence } from "../../services/intelligence.service";
import ScoreRing from "./ScoreRing";
import DimensionBars from "./DimensionBars";
import "./intelligence.css";

const INDICATOR_LABELS = {
  healthyCommunication: "Healthy communication",
  emotionalSupport: "Emotional support",
  mutualEffort: "Mutual effort",
  consistency: "Consistency",
  engagement: "Engagement",
  conflictPressure: "Calm (low conflict pressure)",
  emotionalCloseness: "Emotional closeness",
};

const PATTERN_META = {
  attraction: { emoji: "✨", label: "Attraction" },
  attachment: { emoji: "🫂", label: "Attachment" },
  growingLove: { emoji: "❤️", label: "Growing Love" },
};

/**
 * Behaviour Intelligence panel (couple) — confidence-hedged indicators plus
 * the Attraction / Attachment / Growing-Love pattern estimate. Identical for
 * both partners. Self-fetching.
 */
const BehaviorInsights = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    getBehaviorIntelligence()
      .then((r) => active && setData(r.data))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div className="intel-skeleton" />;
  if (!data) {
    return (
      <div className="intel-card">
        <p className="intel-ring__note">Behaviour insights aren't available right now — try again in a moment.</p>
      </div>
    );
  }

  const indicators = Object.entries(data.indicators || {});
  const dist = data.pattern?.distribution || {};
  const patternBars = Object.entries(dist).map(([key, score]) => ({
    key,
    label: `${PATTERN_META[key]?.emoji || ""} ${PATTERN_META[key]?.label || key}`,
    score,
  }));

  return (
    <div>
      {/* Pattern model */}
      <div className="intel-card">
        <div className="intel-card__head">
          <h3 className="intel-card__title">💞 Connection Pattern</h3>
          <span className="intel-conf">{data.confidence}% confidence</span>
        </div>
        {data.pattern?.dominant && (
          <span className="intel-pattern__badge">
            {PATTERN_META[data.pattern.dominant]?.emoji} Strongest indicators: {data.pattern.dominantLabel}
          </span>
        )}
        <p className="intel-pattern__statement">{data.pattern?.statement}</p>
        {patternBars.length > 0 && <DimensionBars items={patternBars} />}
        <p className="intel-footnote">
          The distribution shows which behavioural pattern is most visible in your
          shared activity — all three coexist in every relationship.
        </p>
      </div>

      {/* Overall + indicators */}
      <div className="intel-card">
        <div className="intel-card__head">
          <h3 className="intel-card__title">📊 Behaviour Signals</h3>
          <span className="intel-card__hint">last 30 days</span>
        </div>
        <div className="intel-ring" style={{ marginBottom: 10 }}>
          <ScoreRing score={data.score} size={80} strokeWidth={8} />
          <div className="intel-ring__body">
            <p className="intel-ring__level">{data.level}</p>
            <p className="intel-ring__note">
              A couple-wide signal blend — always identical for both partners.
            </p>
          </div>
        </div>
        {indicators.map(([key, ind]) => (
          <div className="intel-ind" key={key}>
            <div className="intel-ind__row">
              <span className="intel-dim__label">{INDICATOR_LABELS[key] || key}</span>
              <span className="intel-dim__value">{ind.score}</span>
            </div>
            <div className="intel-dim__track">
              <div className="intel-dim__fill" style={{ width: `${Math.max(2, ind.score)}%` }} />
            </div>
            <p className="intel-ind__insight">{ind.insight}</p>
          </div>
        ))}
        <p className="intel-footnote">{data.statement}</p>
      </div>
    </div>
  );
};

export default BehaviorInsights;
