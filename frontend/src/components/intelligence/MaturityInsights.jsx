import { useEffect, useState } from "react";
import { getMaturity, getIntelHistory } from "../../services/intelligence.service";
import ScoreRing from "./ScoreRing";
import DimensionBars from "./DimensionBars";
import TrendSparkline from "./TrendSparkline";
import "./intelligence.css";

const DIMENSION_LABELS = {
  emotionalRegulation: "Emotional regulation",
  communication: "Communication",
  conflictResolution: "Conflict resolution",
  trustBuilding: "Trust building",
  consistency: "Consistency",
  empathy: "Empathy",
  accountability: "Accountability",
  respect: "Respect",
  patience: "Patience",
  reliability: "Reliability",
};

const TREND_META = {
  improving: { emoji: "↗", text: "Improving vs your recent baseline" },
  declining: { emoji: "↘", text: "A little below your recent baseline" },
  stable: { emoji: "→", text: "Steady vs your recent baseline" },
};

/**
 * Relationship Maturity panel — score ring, trend, ten dimension bars,
 * strengths & growth areas. Self-fetching; works in every lifecycle stage.
 */
const MaturityInsights = () => {
  const [data, setData] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getMaturity(), getIntelHistory("maturity", 30)]).then(([m, h]) => {
      if (!active) return;
      if (m.status === "fulfilled") setData(m.value.data);
      if (h.status === "fulfilled") setHistory(h.value.data?.series || []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) return <div className="intel-skeleton" />;
  if (!data) {
    return (
      <div className="intel-card">
        <p className="intel-ring__note">Maturity insights aren't available right now — try again in a moment.</p>
      </div>
    );
  }

  const dims = Object.entries(data.breakdown || {}).map(([key, score]) => ({
    key,
    label: DIMENSION_LABELS[key] || key,
    score,
  }));
  const trend = TREND_META[data.trend?.direction] || TREND_META.stable;
  const strengths = data.factors?.strengths || [];
  const growthAreas = data.factors?.growthAreas || [];

  return (
    <div>
      {/* Score + trend */}
      <div className="intel-card">
        <div className="intel-card__head">
          <h3 className="intel-card__title">🧭 Relationship Maturity</h3>
          <span className="intel-conf">{data.confidence}% confidence</span>
        </div>
        <div className="intel-ring">
          <ScoreRing score={data.score} />
          <div className="intel-ring__body">
            <p className="intel-ring__level">{data.level}</p>
            <span className={`intel-trend intel-trend--${data.trend?.direction || "stable"}`}>
              {trend.emoji} {trend.text}
            </span>
            <p className="intel-ring__note" style={{ marginTop: 6 }}>
              A continuously evolving estimate from your recent behaviour — how you
              communicate, recover, show up and follow through. Not a test, and
              never a verdict on who you are.
            </p>
          </div>
        </div>
        {history.length >= 2 && (
          <div style={{ marginTop: 14 }}>
            <TrendSparkline series={history} />
          </div>
        )}
      </div>

      {/* Dimensions */}
      {dims.length > 0 && (
        <div className="intel-card">
          <div className="intel-card__head">
            <h3 className="intel-card__title">Dimensions</h3>
            <span className="intel-card__hint">{dims.length} of 10 observable</span>
          </div>
          <DimensionBars items={dims} />
          <p className="intel-footnote">
            Only behaviours CoupleCare can actually observe are scored — dimensions
            without enough activity are left out rather than guessed.
          </p>
        </div>
      )}

      {/* Strengths & growth areas */}
      {(strengths.length > 0 || growthAreas.length > 0) && (
        <div className="intel-card">
          <div className="intel-factors">
            {strengths.length > 0 && (
              <div>
                <p className="intel-factors__group-title">💪 Strengths</p>
                {strengths.map((s) => (
                  <div className="intel-factor" key={s.component}>
                    <span className="intel-factor__emoji">✨</span>
                    <div>
                      <div className="intel-factor__label">{s.label} · {s.score}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {growthAreas.length > 0 && (
              <div>
                <p className="intel-factors__group-title">🌱 Growth areas</p>
                {growthAreas.map((g) => (
                  <div className="intel-factor" key={g.component}>
                    <span className="intel-factor__emoji">🌿</span>
                    <div>
                      <div className="intel-factor__label">{g.label} · {g.score}</div>
                      {g.suggestion && <div className="intel-factor__tip">{g.suggestion}</div>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <p className="intel-footnote" style={{ padding: "0 4px" }}>
        {data.statement}
      </p>
    </div>
  );
};

export default MaturityInsights;
