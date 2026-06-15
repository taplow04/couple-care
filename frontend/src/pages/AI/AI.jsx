import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getHealthScore, getWeeklySummary, getMoodAnalysis } from "../../services/ai.service";
import "./AI.css";

const CIRCUMFERENCE = 2 * Math.PI * 42;

const getScoreColor = (score) => {
  if (score >= 90) return "#32c36c";
  if (score >= 75) return "#ff5c8a";
  if (score >= 50) return "#ffaa00";
  return "#ff5252";
};

const ShimmerLines = ({ lines = 3 }) => (
  <div className="ai-pg-shimmer-wrap">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="ai-pg-shimmer-line"
        style={{ width: ["90%", "100%", "70%", "85%"][i % 4] }}
      />
    ))}
  </div>
);

const AI = () => {
  const [healthScore, setHealthScore] = useState(null);
  const [summary, setSummary]         = useState(null);
  const [analysis, setAnalysis]       = useState(null);
  const [loading, setLoading]         = useState(true);
  const [animated, setAnimated]       = useState(false);

  useEffect(() => {
    const load = async () => {
      const [scoreRes, summaryRes, analysisRes] = await Promise.allSettled([
        getHealthScore(),
        getWeeklySummary(),
        getMoodAnalysis(),
      ]);
      if (scoreRes.status   === "fulfilled") setHealthScore(scoreRes.value.data);
      if (summaryRes.status === "fulfilled") setSummary(summaryRes.value.data?.summary || null);
      if (analysisRes.status=== "fulfilled") setAnalysis(analysisRes.value.data?.analysis || null);
      setLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setAnimated(true), 120);
      return () => clearTimeout(t);
    }
  }, [loading]);

  const score    = healthScore?.score ?? 0;
  const level    = healthScore?.level ?? "—";
  const color    = getScoreColor(score);
  const offset   = animated ? CIRCUMFERENCE - (score / 100) * CIRCUMFERENCE : CIRCUMFERENCE;

  return (
    <div className="ai-pg">
      <div className="ai-pg-content">

        {/* Page header */}
        <div className="ai-pg-header">
          <h1 className="ai-pg-title">AI Insights</h1>
          <p className="ai-pg-sub">Relationship intelligence powered by AI</p>
          <Link to="/ai-center" className="ai-pg-center-link">
            ✨ Open Full AI Center →
          </Link>
        </div>

        {/* Health Score */}
        <div className="ai-pg-card">
          <p className="ai-pg-card-label">Relationship Health Score</p>
          <div className="ai-pg-ring-wrap">
            <svg width="120" height="120" viewBox="0 0 110 110">
              <circle cx="55" cy="55" r="42" fill="none" strokeWidth="9"
                stroke={`rgba(${color === "#32c36c" ? "50,195,108" : color === "#ff5c8a" ? "255,92,138" : color === "#ffaa00" ? "255,170,0" : "255,82,82"},0.12)`}
              />
              <circle
                cx="55" cy="55" r="42" fill="none" strokeWidth="9"
                stroke={color} strokeLinecap="round"
                strokeDasharray={CIRCUMFERENCE}
                strokeDashoffset={offset}
                transform="rotate(-90 55 55)"
                className="ai-pg-ring-arc"
              />
            </svg>
            <div className="ai-pg-ring-center">
              {loading ? (
                <span className="ai-pg-ring-dash">—</span>
              ) : (
                <>
                  <span className="ai-pg-ring-score" style={{ color }}>{score}</span>
                  <span className="ai-pg-ring-level">{level}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Weekly Summary */}
        <div className="ai-pg-card">
          <div className="ai-pg-card-top">
            <p className="ai-pg-card-label">Weekly Summary</p>
            <span className="ai-pg-badge">✨ AI</span>
          </div>
          {loading ? (
            <ShimmerLines lines={3} />
          ) : summary ? (
            <p className="ai-pg-body-text">{summary}</p>
          ) : (
            <p className="ai-pg-empty-text">
              Log more moods to unlock your weekly AI summary.
            </p>
          )}
        </div>

        {/* Mood Analysis */}
        <div className="ai-pg-card">
          <div className="ai-pg-card-top">
            <p className="ai-pg-card-label">Mood Analysis</p>
            <span className="ai-pg-badge ai-pg-badge--purple">🧠 AI</span>
          </div>
          {loading ? (
            <ShimmerLines lines={4} />
          ) : analysis ? (
            <p className="ai-pg-body-text">{analysis}</p>
          ) : (
            <p className="ai-pg-empty-text">
              Keep logging your moods to get a personalized analysis.
            </p>
          )}
        </div>

      </div>
    </div>
  );
};

export default AI;
