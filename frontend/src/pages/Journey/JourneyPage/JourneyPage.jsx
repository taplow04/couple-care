import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { useCoupleEvents } from "../../../hooks/useCoupleEvents";
import { getDashboard } from "../../../services/dashboard.service";
import {
  getMemoriesTimeline,
  getUpcomingEvents,
  getMemoryStats,
} from "../../../services/memories.service";
import {
  getRelationshipInsights,
  getHealthScore,
  getMemoryRecap,
} from "../../../services/ai.service";
import AIReport           from "../../../components/ai/AIReport/AIReport";
import JourneyHeader      from "../../../components/journey/JourneyHeader/JourneyHeader";
import RelationshipStats  from "../../../components/journey/RelationshipStats/RelationshipStats";
import MilestoneProgress  from "../../../components/journey/MilestoneProgress/MilestoneProgress";
import MilestoneCard      from "../../../components/journey/MilestoneCard/MilestoneCard";
import TimelineCard       from "../../../components/journey/TimelineCard/TimelineCard";
import StoryChapters      from "../../../components/journey/StoryChapters/StoryChapters";
import "./JourneyPage.css";

/* ── Skeleton ── */
const Skeleton = ({ className }) => <div className={`jp-sk ${className ?? ""}`} />;

const JourneySkeleton = () => (
  <div className="jp-skeleton">
    <Skeleton className="jp-sk--header" />
    <div className="jp-skeleton__body">
      <div className="jp-sk--stats-grid">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="jp-sk--stat" />)}
      </div>
      <Skeleton className="jp-sk--section" />
      <div className="jp-sk--timeline">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="jp-sk--tcard" />)}
      </div>
    </div>
  </div>
);

/* ── No-partner state ── */
const NoPartnerState = () => (
  <div className="jp-no-partner">
    <span className="jp-no-partner__emoji">💔</span>
    <h2 className="jp-no-partner__title">No Active Relationship</h2>
    <p className="jp-no-partner__sub">
      Pair with your partner first to start your journey together.
    </p>
    <Link to="/profile" className="jp-no-partner__btn">Go to Profile</Link>
  </div>
);

/* ── AI Card ── */
const AICard = ({ title, text, badge, loading }) => (
  <div className="jp-ai-card">
    <div className="jp-ai-card__top">
      <p className="jp-ai-card__label">{title}</p>
      <span className="jp-ai-card__badge">{badge}</span>
    </div>
    {loading ? (
      <div className="jp-ai-shimmer">
        {[90, 100, 75, 85].map((w, i) => (
          <div key={i} className="jp-ai-shimmer__line" style={{ width: `${w}%` }} />
        ))}
      </div>
    ) : text ? (
      <div className="jp-ai-card__body"><AIReport text={text} /></div>
    ) : (
      <p className="jp-ai-card__empty">
        Add more memories to unlock AI insights about your journey.
      </p>
    )}
  </div>
);

/* ── Main Page ── */
const JourneyPage = () => {
  const { user } = useAuth();

  const [dashboard,    setDashboard]    = useState(null);
  const [timeline,     setTimeline]     = useState({});
  const [upcoming,     setUpcoming]     = useState([]);
  const [memStats,     setMemStats]     = useState(null);
  const [aiInsights,   setAiInsights]   = useState(null);
  const [memoryRecap,  setMemoryRecap]  = useState(null);
  const [healthScore,  setHealthScore]  = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [aiLoading,    setAiLoading]    = useState(true);
  const [noPartner,    setNoPartner]    = useState(false);

  useEffect(() => {
    const load = async () => {
      /* Step 1: dashboard is required (determines no-partner state) */
      try {
        const res = await getDashboard();
        setDashboard(res.data);
      } catch (err) {
        const msg = err.response?.data?.message ?? err.message ?? "";
        if (msg.toLowerCase().includes("no active relationship")) {
          setNoPartner(true);
          setLoading(false);
          return;
        }
      }

      /* Step 2: load all secondary data in parallel */
      const [timelineRes, upcomingRes, statsRes] = await Promise.allSettled([
        getMemoriesTimeline(),
        getUpcomingEvents(),
        getMemoryStats(),
      ]);

      if (timelineRes.status === "fulfilled") setTimeline(timelineRes.value.data ?? {});
      if (upcomingRes.status === "fulfilled") setUpcoming(upcomingRes.value.data ?? []);
      if (statsRes.status === "fulfilled")    setMemStats(statsRes.value.data ?? null);

      setLoading(false);

      /* Step 3: AI calls last (slow — don't block the timeline) */
      const [insightsRes, scoreRes, recapRes] = await Promise.allSettled([
        getRelationshipInsights(),
        getHealthScore(),
        getMemoryRecap(),
      ]);

      if (insightsRes.status === "fulfilled") setAiInsights(insightsRes.value.data?.insights ?? null);
      if (scoreRes.status    === "fulfilled") setHealthScore(scoreRes.value.data ?? null);
      if (recapRes.status    === "fulfilled") setMemoryRecap(recapRes.value.data?.recap ?? null);

      setAiLoading(false);
    };

    load();
  }, []);

  /* Live updates: shared health score + memory stats when either partner acts. */
  const refresh = useCallback(async () => {
    const [dashRes, statsRes, timelineRes] = await Promise.allSettled([
      getDashboard(),
      getMemoryStats(),
      getMemoriesTimeline(),
    ]);
    if (dashRes.status === "fulfilled") {
      setDashboard(dashRes.value.data);
      if (dashRes.value.data?.health) setHealthScore(dashRes.value.data.health);
    }
    if (statsRes.status === "fulfilled") setMemStats(statsRes.value.data ?? null);
    if (timelineRes.status === "fulfilled")
      setTimeline(timelineRes.value.data ?? {});
  }, []);

  useCoupleEvents({
    "health:update": (payload) => {
      if (payload?.score != null) setHealthScore(payload);
    },
    "couple:activity": refresh,
  });

  if (loading) return <div className="jp"><JourneySkeleton /></div>;
  if (noPartner) return <div className="jp"><NoPartnerState /></div>;

  const daysTogether   = dashboard?.relationship?.daysTogether ?? 0;
  const partner        = dashboard?.partner ?? null;
  const timelineYears  = Object.keys(timeline).sort((a, b) => b - a);
  const totalMemories  = memStats?.totalMemories ?? 0;

  return (
    <div className="jp">
      <JourneyHeader
        user={user}
        partner={partner}
        relationship={dashboard?.relationship}
      />

      <div className="jp__body">

        {/* Stats grid */}
        <RelationshipStats
          daysTogether={daysTogether}
          totalMemories={totalMemories}
          healthScore={healthScore}
          loading={aiLoading}
        />

        {/* Milestone progress track */}
        <MilestoneProgress daysTogether={daysTogether} />

        {/* Story Timeline — auto-assembled chapters of the relationship */}
        <section className="jp__section">
          <StoryChapters />
        </section>

        {/* AI Insights */}
        <section className="jp__section">
          <AICard
            title="Relationship Insights"
            text={aiInsights}
            badge="✨ AI"
            loading={aiLoading}
          />
          <AICard
            title="Memory Recap"
            text={memoryRecap}
            badge="🧠 AI"
            loading={aiLoading}
          />
        </section>

        {/* Upcoming events */}
        {upcoming.length > 0 && (
          <section className="jp__section">
            <h2 className="jp__section-title">Coming Up 🎉</h2>
            <div className="jp__upcoming-list">
              {upcoming.slice(0, 5).map((ev) => (
                <MilestoneCard key={ev._id} event={ev} />
              ))}
            </div>
          </section>
        )}

        {/* Memory Timeline */}
        <section className="jp__section">
          <div className="jp__section-head">
            <h2 className="jp__section-title">Memory Timeline</h2>
            <Link to="/memories" className="jp__add-link">+ Add</Link>
          </div>

          {timelineYears.length === 0 ? (
            <div className="jp__empty">
              <span className="jp__empty-emoji">📸</span>
              <p className="jp__empty-text">
                No memories yet. Start adding moments you want to remember forever.
              </p>
              <Link to="/memories" className="jp__empty-btn">Add First Memory</Link>
            </div>
          ) : (
            timelineYears.map((year) => (
              <div key={year} className="jp__year-group">
                <div className="jp__year-badge">
                  <span>{year}</span>
                </div>
                <div className="jp__timeline-list">
                  {timeline[year].map((mem, idx) => (
                    <TimelineCard
                      key={mem._id}
                      memory={mem}
                      isLast={idx === timeline[year].length - 1}
                    />
                  ))}
                </div>
              </div>
            ))
          )}
        </section>

      </div>
    </div>
  );
};

export default JourneyPage;
