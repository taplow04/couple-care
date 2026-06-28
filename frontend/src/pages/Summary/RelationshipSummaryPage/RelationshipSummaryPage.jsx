import { useEffect, useState } from "react";

import BackHeader from "../../../components/common/BackHeader/BackHeader";
import { getRelationshipSummary } from "../../../services/lifecycle.service";
import "./RelationshipSummaryPage.css";

const fmtDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—";

const STAT_DEFS = [
  { key: "messagesExchanged", label: "Messages", icon: "💬" },
  { key: "memoriesCount", label: "Memories", icon: "📸" },
  { key: "momentsShared", label: "Moments", icon: "✨" },
  { key: "photosShared", label: "Photos", icon: "🖼️" },
  { key: "videosShared", label: "Videos", icon: "🎬" },
  { key: "bucketGoalsCompleted", label: "Bucket goals", icon: "🎯" },
  { key: "storyChapters", label: "Story chapters", icon: "📖" },
  { key: "achievementsEarned", label: "Achievements", icon: "🏅" },
  { key: "longestStreak", label: "Longest streak", icon: "🔥" },
  { key: "relationshipXp", label: "Total XP", icon: "⭐" },
];

const RelationshipSummaryPage = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let active = true;
    getRelationshipSummary()
      .then((r) => active && setData(r.data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const s = data?.summary;
  const reflection = data?.reflection;

  return (
    <div className="rsum">
      <BackHeader title="Relationship Summary" fallback="/dashboard" />

      <div className="rsum__body">
        {loading ? (
          <p className="rsum__msg">Loading your journey…</p>
        ) : error || !s ? (
          <p className="rsum__msg">No past relationship to summarize yet.</p>
        ) : (
          <>
            <section className="rsum__hero" style={data.coverUrl ? { backgroundImage: `url(${data.coverUrl})` } : undefined}>
              <div className="rsum__hero-wash" />
              <div className="rsum__hero-content">
                <div className="rsum__duration">{s.durationDays} days together</div>
                <div className="rsum__dates">
                  {fmtDate(s.startDate)} – {fmtDate(s.endDate)}
                </div>
              </div>
            </section>

            {reflection?.text && (
              <section className="rsum__reflection">
                <h3 className="rsum__reflection-title">A reflection</h3>
                <p className="rsum__reflection-text">{reflection.text}</p>
              </section>
            )}
            {reflection?.status === "pending" && (
              <p className="rsum__msg rsum__msg--soft">Writing a gentle reflection…</p>
            )}

            <div className="rsum__grid">
              {STAT_DEFS.map((def) => (
                <div key={def.key} className="rsum__stat">
                  <div className="rsum__stat-icon">{def.icon}</div>
                  <div className="rsum__stat-value">{s[def.key] ?? 0}</div>
                  <div className="rsum__stat-label">{def.label}</div>
                </div>
              ))}
            </div>

            {s.favoriteMemory && (
              <section className="rsum__highlight">
                <span className="rsum__highlight-label">Favorite memory</span>
                <span className="rsum__highlight-value">💖 {s.favoriteMemory}</span>
              </section>
            )}
            {s.mostActiveMonth && (
              <section className="rsum__highlight">
                <span className="rsum__highlight-label">Most active month</span>
                <span className="rsum__highlight-value">📅 {s.mostActiveMonth}</span>
              </section>
            )}
            {s.topMood && (
              <section className="rsum__highlight">
                <span className="rsum__highlight-label">Most common mood</span>
                <span className="rsum__highlight-value rsum__highlight-value--cap">{s.topMood}</span>
              </section>
            )}

            <p className="rsum__footer">
              This summary is yours to keep. It's private unless you choose to share
              the count of your journeys in Privacy settings.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default RelationshipSummaryPage;
