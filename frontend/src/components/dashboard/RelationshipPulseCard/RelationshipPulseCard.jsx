import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { getPulse } from "../../../services/intelligence.service";
import { useCoupleEvents } from "../../../hooks/useCoupleEvents";
import RadarChart from "../../charts/RadarChart";

import "./RelationshipPulseCard.css";

const SUB_LABELS = {
  communication: "Communication",
  consistency: "Consistency",
  engagement: "Engagement",
  support: "Support",
  activity: "Activity",
  growth: "Growth",
  connection: "Connection",
};

const TREND_EMOJI = { improving: "↗", declining: "↘", stable: "→" };

/**
 * Relationship Pulse — the live 7-signal reading (identical for both
 * partners). Seeds from the dashboard payload (`initial`), refreshes once for
 * the full breakdown, then stays live over the shared socket (`pulse:update`).
 */
const RelationshipPulseCard = ({ initial = null }) => {
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(initial);

  useEffect(() => {
    let active = true;
    getPulse()
      .then((res) => {
        if (active && res.data) setPulse(res.data);
      })
      .catch(() => {
        /* keep the seeded snapshot */
      });
    return () => {
      active = false;
    };
  }, []);

  useCoupleEvents({
    "pulse:update": (payload) => {
      if (payload?.score != null) setPulse((prev) => ({ ...prev, ...payload }));
    },
  });

  const breakdown = pulse?.breakdown || {};
  const axes = Object.entries(SUB_LABELS)
    .filter(([key]) => typeof breakdown[key] === "number")
    .map(([key, label]) => ({ key, label, value: breakdown[key] }));

  return (
    <div
      className="pulse-card"
      role="button"
      tabIndex={0}
      onClick={() => navigate("/personality-timeline")}
      onKeyDown={(e) => e.key === "Enter" && navigate("/personality-timeline")}
      aria-label="Relationship Pulse — open trends"
    >
      <div className="pulse-card__head">
        <h3 className="pulse-card__title">💓 Relationship Pulse</h3>
        {pulse?.confidence != null && (
          <span className="pulse-card__conf">{pulse.confidence}% confidence</span>
        )}
      </div>

      {pulse?.score == null ? (
        <p className="pulse-card__empty">
          Your Pulse builds itself from what you both do here — chat, moods,
          stories, calls, goals. Check back after a few active days. 💕
        </p>
      ) : (
        <>
          <div className="pulse-card__hero">
            <span className="pulse-card__score">{pulse.score}</span>
            <div className="pulse-card__hero-meta">
              <span className="pulse-card__level">{pulse.level}</span>
              {pulse.trend?.direction && (
                <span className={`pulse-card__trend pulse-card__trend--${pulse.trend.direction}`}>
                  {TREND_EMOJI[pulse.trend.direction] || "→"} vs your own baseline
                </span>
              )}
            </div>
            <span className="pulse-card__beat" aria-hidden="true">💗</span>
          </div>

          {axes.length >= 3 && <RadarChart axes={axes} color="var(--chart-1)" />}
        </>
      )}

      <p className="pulse-card__basis">
        From your CoupleCare activity only · tap for trends
      </p>
    </div>
  );
};

export default RelationshipPulseCard;
