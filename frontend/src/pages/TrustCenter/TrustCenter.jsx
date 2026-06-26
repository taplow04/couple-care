import { useEffect, useState } from "react";
import BackHeader from "../../components/common/BackHeader/BackHeader";
import "./TrustCenter.css";

const ScoreBar = ({ label, value, accent }) => (
  <div className="tc-bar">
    <div className="tc-bar__head">
      <span className="tc-bar__label">{label}</span>
      <span className="tc-bar__value">{value == null ? "—" : `${value}%`}</span>
    </div>
    <div className="tc-bar__track">
      <div
        className="tc-bar__fill"
        style={{ width: `${value || 0}%`, background: accent }}
      />
    </div>
  </div>
);

const TrustCenter = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    import("../../services/profile.service")
      .then((m) => m.getTrustCenter())
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Couldn't load the Trust Center."),
      )
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="tc">
        <BackHeader title="Trust Center" fallback="/profile" />
        <div className="tc__loading">Loading…</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="tc">
        <BackHeader title="Trust Center" fallback="/profile" />
        <p className="tc__error">{error || "No data yet."}</p>
      </div>
    );
  }

  const { scores, activitySummary, sharedProgress, transparency, trustBadge, aiInsight } = data;

  return (
    <div className="tc">
      <BackHeader title="Trust Center" fallback="/profile" />

      <div className="tc__content">
        {/* Trust badge hero */}
        <div className="tc__hero">
          <span className="tc__hero-emoji">{trustBadge?.emoji || "🛡"}</span>
          <div>
            <p className="tc__hero-badge">{trustBadge?.label || "Building Trust"}</p>
            <p className="tc__hero-sub">
              Generated only from your CoupleCare activity — never external apps or
              device data.
            </p>
          </div>
        </div>

        {/* Scores */}
        <div className="tc__card">
          <h2 className="tc__card-title">Scores</h2>
          <ScoreBar label="Communication" value={scores.communication} accent="var(--primary)" />
          <ScoreBar label="Participation" value={scores.participation} accent="var(--secondary)" />
          <ScoreBar label="Consistency" value={scores.consistency} accent="var(--success)" />
          <ScoreBar label="Relationship Health" value={scores.relationshipHealth} accent="var(--warning)" />
        </div>

        {/* Activity summary */}
        <div className="tc__card">
          <h2 className="tc__card-title">Activity Summary</h2>
          <div className="tc__grid">
            <Stat label="Messages" value={activitySummary.messages} />
            <Stat label="By you" value={activitySummary.messagesByYou} />
            <Stat label="By partner" value={activitySummary.messagesByPartner} />
            <Stat label="Memories" value={activitySummary.memories} />
            <Stat label="Current streak" value={`${activitySummary.currentStreak}🔥`} />
            <Stat label="Longest streak" value={activitySummary.longestStreak} />
            <Stat label="Days together" value={activitySummary.daysTogether} />
            <Stat label="Achievements" value={activitySummary.achievements} />
          </div>
        </div>

        {/* Shared progress */}
        <div className="tc__card">
          <h2 className="tc__card-title">Shared Progress</h2>
          <div className="tc__grid">
            <Stat label="Level" value={sharedProgress.level} />
            <Stat label="XP" value={sharedProgress.xp} />
            <Stat label="Love Meter" value={sharedProgress.loveMeter != null ? `${sharedProgress.loveMeter}%` : "—"} />
          </div>
        </div>

        {/* Transparency */}
        <div className="tc__card">
          <h2 className="tc__card-title">Transparency Level</h2>
          <ScoreBar label={transparency.level} value={transparency.percent} accent="var(--secondary)" />
          <p className="tc__muted">
            Based on how much of your profile you share with your partner.
          </p>
        </div>

        {/* AI insight */}
        {aiInsight && (
          <div className="tc__insight">
            <span className="tc__insight-emoji">💡</span>
            <p className="tc__insight-text">{aiInsight}</p>
          </div>
        )}
      </div>
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="tc__stat">
    <span className="tc__stat-num">{value}</span>
    <span className="tc__stat-label">{label}</span>
  </div>
);

export default TrustCenter;
