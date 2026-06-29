import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { getDashboard } from "../../../services/dashboard.service";
import { getMemories } from "../../../services/memories.service";
import { getHealthScore, getWeeklySummary } from "../../../services/ai.service";
import { getBucketStats } from "../../../services/bucket.service";
import { getMySleep } from "../../../services/sleep.service";
import { useCoupleEvents } from "../../../hooks/useCoupleEvents";
import { useDailyMoment } from "../../../hooks/useDailyMoment";

import TopHeader from "../../../components/navigation/TopHeader/TopHeader";
import WelcomeCard from "../../../components/dashboard/WelcomeCard/WelcomeCard";
import UpcomingBirthdayCard from "../../../components/dashboard/UpcomingBirthdayCard/UpcomingBirthdayCard";
import StreakCard from "../../../components/engagement/StreakCard/StreakCard";
import LoveMeter from "../../../components/engagement/LoveMeter/LoveMeter";
import RelationshipStatusCard from "../../../components/dashboard/RelationshipStatusCard/RelationshipStatusCard";
import RecentMoodCard from "../../../components/dashboard/RecentMoodCard/RecentMoodCard";
import AIInsightCard from "../../../components/dashboard/AIInsightCard/AIInsightCard";
import QuickActionsCard from "../../../components/dashboard/QuickActionsCard/QuickActionsCard";
import RecentMemoriesCard from "../../../components/dashboard/RecentMemoriesCard/RecentMemoriesCard";
import BucketListCard from "../../../components/dashboard/BucketListCard/BucketListCard";
import SleepCard from "../../../components/dashboard/SleepCard/SleepCard";
import SurpriseBox from "../../../components/surprise/SurpriseBox/SurpriseBox";
import MomentsBar from "../../../components/moments/MomentsBar/MomentsBar";
import DailyMomentCard from "../../../components/dashboard/DailyMomentCard/DailyMomentCard";

import "../Dashboard.css";

const DashboardSkeleton = () => (
  <div className="dashboard">
    <div className="dashboard-content">
      <div className="db-skeleton db-skeleton--welcome" />
      <div className="dashboard-grid-2">
        <div className="db-skeleton db-skeleton--card" />
        <div className="db-skeleton db-skeleton--card" />
      </div>
      <div className="db-skeleton db-skeleton--md" />
      <div className="db-skeleton db-skeleton--md" />
      <div className="db-skeleton db-skeleton--sm" />
      <div className="db-skeleton db-skeleton--md" />
    </div>
  </div>
);

const NoPartnerState = () => {
  const navigate = useNavigate();
  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <div className="db-no-partner">
          <div className="db-no-partner-graphic" aria-hidden="true">
            <span className="db-no-partner-emoji">💕</span>
          </div>
          <h2 className="db-no-partner-title">Connect with Your Partner</h2>
          <p className="db-no-partner-text">
            You haven't linked with your partner yet. Share your pair code or
            enter theirs to start your journey together.
          </p>
          <button
            className="db-no-partner-btn"
            onClick={() => navigate("/couple")}
          >
            Connect Now
          </button>
        </div>
      </div>
    </div>
  );
};

// Renders only after the dashboard payload resolves, so the hook seeds from
// `initial` (no extra fetch) and then stays live over the shared socket.
const DailyMomentSection = ({ initial }) => {
  const { today, loading } = useDailyMoment(initial);
  return <DailyMomentCard today={today} loading={loading} />;
};

// Subtle section divider — gives the dashboard hierarchy/grouping.
const Section = ({ label, delay = 0 }) => (
  <div className="db-section db-fade-in" style={{ animationDelay: `${delay}ms` }}>
    <span className="db-section__label">{label}</span>
    <span className="db-section__line" />
  </div>
);

const GrowingDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashData, setDashData] = useState(null);
  const [memories, setMemories] = useState(undefined);
  const [engagement, setEngagement] = useState(null);
  const [aiScore, setAiScore] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(true);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [bucketStats, setBucketStats] = useState(null);
  const [lastSleep, setLastSleep] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noPartner, setNoPartner] = useState(false);

  useEffect(() => {
    loadPrimary();
  }, []);

  // Live couple updates: when either partner logs a mood / adds a memory, the
  // server recomputes the shared health score and broadcasts to both. Update
  // the score instantly and refresh recent activity — no manual reload.
  const refreshDashboard = async () => {
    try {
      const res = await getDashboard();
      setDashData(res.data);
      if (res.data?.health) setAiScore(res.data.health);
      if (res.data?.engagement) setEngagement(res.data.engagement);
    } catch {
      /* keep current data on a failed refresh */
    }
  };

  useCoupleEvents({
    "health:update": (payload) => {
      if (payload?.score != null) setAiScore(payload);
    },
    "engagement:update": (payload) => {
      if (payload) setEngagement((prev) => ({ ...prev, ...payload }));
    },
    "couple:activity": () => {
      refreshDashboard();
    },
  });

  const loadPrimary = async () => {
    try {
      const res = await getDashboard();
      setDashData(res.data);
      if (res.data?.engagement) setEngagement(res.data.engagement);
      setLoading(false);
      loadSecondary();
    } catch (err) {
      const msg = err.response?.data?.message || "";
      if (msg === "No active relationship") {
        setNoPartner(true);
      }
      setLoading(false);
    }
  };

  const loadSecondary = async () => {
    const [memoriesRes, scoreRes, summaryRes, bucketRes, sleepRes] = await Promise.allSettled([
      getMemories(),
      getHealthScore(),
      getWeeklySummary(),
      getBucketStats(),
      getMySleep(),
    ]);

    if (memoriesRes.status === "fulfilled") {
      setMemories(memoriesRes.value.data || []);
    } else {
      setMemories([]);
    }
    setMemoriesLoading(false);

    if (bucketRes.status === "fulfilled") {
      setBucketStats(bucketRes.value.data || null);
    }

    if (sleepRes.status === "fulfilled") {
      setLastSleep(sleepRes.value.data?.[0] || null);
    }

    if (scoreRes.status === "fulfilled") {
      setAiScore(scoreRes.value.data);
    }

    if (summaryRes.status === "fulfilled") {
      setAiSummary(summaryRes.value.data?.summary || null);
    }
    setAiSummaryLoading(false);
  };

  if (loading) return <DashboardSkeleton />;
  if (noPartner) return <NoPartnerState />;

  return (
    <div className="dashboard">
      <div className="dashboard-content">
        <TopHeader partner={dashData?.partner} />

        <div className="db-fade-in" style={{ animationDelay: "0ms" }}>
          <WelcomeCard
            user={user}
            partner={dashData?.partner}
            onPartnerClick={() => navigate("/partner")}
            onSelfClick={() => navigate("/profile")}
          />
        </div>

        <Section label="Today" delay={15} />

        {/* CoupleCare Moments — Instagram-style story circles (self + partner) */}
        <div className="db-fade-in" style={{ animationDelay: "20ms" }}>
          <MomentsBar />
        </div>

        {/* ❤️ Daily Couple Moment — today's recap (or share-together nudge) */}
        <div className="db-fade-in" style={{ animationDelay: "25ms" }}>
          <DailyMomentSection initial={dashData?.dailyMoment} />
        </div>

        {dashData?.partner?.birthday && (
          <div className="db-fade-in" style={{ animationDelay: "30ms" }}>
            <UpcomingBirthdayCard partner={dashData.partner} />
          </div>
        )}

        <div className="db-fade-in" style={{ animationDelay: "40ms" }}>
          <SurpriseBox />
        </div>

        <div className="db-fade-in" style={{ animationDelay: "50ms" }}>
          <StreakCard engagement={engagement} loading={loading} />
        </div>

        <Section label="Your Connection" delay={70} />

        <div className="dashboard-grid-2">
          <div className="db-fade-in" style={{ animationDelay: "80ms" }}>
            <LoveMeter
              value={dashData?.loveMeter}
              health={dashData?.health}
              aiScore={aiScore}
              engagement={engagement}
            />
          </div>
          <div className="db-fade-in" style={{ animationDelay: "110ms" }}>
            <RelationshipStatusCard relationship={dashData?.relationship} />
          </div>
        </div>

        <div className="db-fade-in" style={{ animationDelay: "140ms" }}>
          <RecentMoodCard recentMoods={dashData?.recentMoods} />
        </div>

        <div className="db-fade-in" style={{ animationDelay: "180ms" }}>
          <AIInsightCard
            aiSummary={aiSummary}
            moodAnalytics={dashData?.moodAnalytics}
            partner={dashData?.partner}
            loading={aiSummaryLoading}
          />
        </div>

        <Section label="Explore Together" delay={210} />

        <div className="db-fade-in" style={{ animationDelay: "220ms" }}>
          <QuickActionsCard />
        </div>

        <div className="db-fade-in" style={{ animationDelay: "240ms" }}>
          <BucketListCard stats={bucketStats} loading={memoriesLoading} />
        </div>

        <div className="db-fade-in" style={{ animationDelay: "260ms" }}>
          <SleepCard lastLog={lastSleep} />
        </div>

        <div className="db-fade-in" style={{ animationDelay: "260ms" }}>
          <RecentMemoriesCard
            memories={memories}
            loading={memoriesLoading}
          />
        </div>
      </div>
    </div>
  );
};

export default GrowingDashboard;
