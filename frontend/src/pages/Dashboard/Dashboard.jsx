import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../context/AuthContext";
import { getDashboard } from "../../services/dashboard.service";
import { getMemories } from "../../services/memories.service";
import { getHealthScore, getWeeklySummary } from "../../services/ai.service";

import TopHeader from "../../components/navigation/TopHeader/TopHeader";
import WelcomeCard from "../../components/dashboard/WelcomeCard/WelcomeCard";
import HealthScoreCard from "../../components/dashboard/HealthScoreCard/HealthScoreCard";
import RelationshipStatusCard from "../../components/dashboard/RelationshipStatusCard/RelationshipStatusCard";
import RecentMoodCard from "../../components/dashboard/RecentMoodCard/RecentMoodCard";
import AIInsightCard from "../../components/dashboard/AIInsightCard/AIInsightCard";
import QuickActionsCard from "../../components/dashboard/QuickActionsCard/QuickActionsCard";
import RecentMemoriesCard from "../../components/dashboard/RecentMemoriesCard/RecentMemoriesCard";

import "./Dashboard.css";

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

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [dashData, setDashData] = useState(null);
  const [memories, setMemories] = useState(undefined);
  const [aiScore, setAiScore] = useState(null);
  const [aiSummary, setAiSummary] = useState(null);
  const [aiSummaryLoading, setAiSummaryLoading] = useState(true);
  const [memoriesLoading, setMemoriesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [noPartner, setNoPartner] = useState(false);

  useEffect(() => {
    loadPrimary();
  }, []);

  const loadPrimary = async () => {
    try {
      const res = await getDashboard();
      setDashData(res.data);
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
    const [memoriesRes, scoreRes, summaryRes] = await Promise.allSettled([
      getMemories(),
      getHealthScore(),
      getWeeklySummary(),
    ]);

    if (memoriesRes.status === "fulfilled") {
      setMemories(memoriesRes.value.data || []);
    } else {
      setMemories([]);
    }
    setMemoriesLoading(false);

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
        <TopHeader />

        <div className="db-fade-in" style={{ animationDelay: "0ms" }}>
          <WelcomeCard
            user={user}
            partner={dashData?.partner}
            onPartnerClick={() => navigate("/partner")}
          />
        </div>

        <div className="dashboard-grid-2">
          <div className="db-fade-in" style={{ animationDelay: "60ms" }}>
            <HealthScoreCard
              aiScore={aiScore}
              moodAnalytics={dashData?.moodAnalytics}
            />
          </div>
          <div className="db-fade-in" style={{ animationDelay: "100ms" }}>
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

        <div className="db-fade-in" style={{ animationDelay: "220ms" }}>
          <QuickActionsCard />
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

export default Dashboard;
