import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  getMyMoods,
  getPartnerMoods,
  getMoodAnalytics,
} from "../../../services/moods.service";
import { getMoodAnalysis } from "../../../services/ai.service";
import { getDashboard } from "../../../services/dashboard.service";
import { getFirstName } from "../../../utils/getFirstName";

import MoodOverview     from "../../../components/moodAnalytics/MoodOverview/MoodOverview";
import MoodCompatibility from "../../../components/moodAnalytics/MoodCompatibility/MoodCompatibility";
import MoodTrendChart   from "../../../components/moodAnalytics/MoodTrendChart/MoodTrendChart";
import MoodHeatmap      from "../../../components/moodAnalytics/MoodHeatmap/MoodHeatmap";
import PartnerMoodCard  from "../../../components/moodAnalytics/PartnerMoodCard/PartnerMoodCard";
import AIMoodInsight    from "../../../components/moodAnalytics/AIMoodInsight/AIMoodInsight";
import "./MoodAnalyticsPage.css";

/* ── Pure computation helpers ── */

const MOOD_TYPES = ["happy", "sad", "angry", "stressed", "loved", "excited", "anxious"];
const POS_TYPES  = ["happy", "loved", "excited"];

const computeLocalAnalytics = (moods) => {
  const result = Object.fromEntries([...MOOD_TYPES.map((t) => [t, 0]), ["averageIntensity", 0]]);
  if (!moods.length) return result;
  let totalIntensity = 0;
  moods.forEach((m) => { if (result[m.moodType] !== undefined) result[m.moodType]++; totalIntensity += m.intensity; });
  result.averageIntensity = Number((totalIntensity / moods.length).toFixed(2));
  return result;
};

const computeCompatibility = (myAn, partnerAn) => {
  const myTotal  = MOOD_TYPES.reduce((s, t) => s + (myAn[t] || 0), 0);
  const prtTotal = MOOD_TYPES.reduce((s, t) => s + (partnerAn[t] || 0), 0);

  if (myTotal === 0 && prtTotal === 0) return { score: 0, hasData: false, myPosRatio: 0, partPosRatio: 0 };

  const myPosRatio  = myTotal  > 0 ? POS_TYPES.reduce((s, t) => s + (myAn[t] || 0), 0) / myTotal  : 0;
  const partPosRatio = prtTotal > 0 ? POS_TYPES.reduce((s, t) => s + (partnerAn[t] || 0), 0) / prtTotal : 0;

  const alignment     = 1 - Math.abs(myPosRatio - partPosRatio);
  const bothPositive  = (myPosRatio + partPosRatio) / 2;
  const score         = Math.min(100, Math.round((alignment * 0.65 + bothPositive * 0.35) * 100));

  return { score, hasData: true, myPosRatio, partPosRatio };
};

/* ── Skeleton ── */
const SkeletonCard = ({ height = 160 }) => (
  <div className="map-sk" style={{ height }} />
);

const PageSkeleton = () => (
  <div className="map-skeleton">
    <SkeletonCard height={200} />
    <SkeletonCard height={260} />
    <SkeletonCard height={170} />
    <SkeletonCard height={220} />
    <SkeletonCard height={180} />
  </div>
);

/* ── Back icon ── */
const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12L12 19M5 12L12 5"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

/* ── Main Page ── */
const MoodAnalyticsPage = () => {
  const navigate         = useNavigate();
  const { user }         = useAuth();

  const [myMoods,        setMyMoods]        = useState([]);
  const [partnerMoods,   setPartnerMoods]   = useState([]);
  const [myAnalytics,    setMyAnalytics]    = useState(null);
  const [partner,        setPartner]        = useState(null);
  const [aiAnalysis,     setAiAnalysis]     = useState(null);
  const [loading,        setLoading]        = useState(true);
  const [aiLoading,      setAiLoading]      = useState(true);
  const [noPartner,      setNoPartner]      = useState(false);

  useEffect(() => {
    const load = async () => {
      /* Step 1: parallel primary loads */
      const [dashRes, myMoodsRes, partnerMoodsRes, analyticsRes] = await Promise.allSettled([
        getDashboard(),
        getMyMoods(),
        getPartnerMoods(),
        getMoodAnalytics(),
      ]);

      /* Detect no-partner from dashboard or partner moods error */
      const dashErr = dashRes.status === "rejected" ? dashRes.reason : null;
      const prtErr  = partnerMoodsRes.status === "rejected" ? partnerMoodsRes.reason : null;
      const noRel   = [dashErr, prtErr].some((e) =>
        e && (e.response?.data?.message ?? e.message ?? "").toLowerCase().includes("no active relationship")
      );

      if (noRel) {
        setNoPartner(true);
        setLoading(false);
        return;
      }

      if (dashRes.status === "fulfilled")         setPartner(dashRes.value.data?.partner ?? null);
      if (myMoodsRes.status === "fulfilled")      setMyMoods(myMoodsRes.value.data ?? []);
      if (partnerMoodsRes.status === "fulfilled") setPartnerMoods(partnerMoodsRes.value.data ?? []);
      if (analyticsRes.status === "fulfilled")    setMyAnalytics(analyticsRes.value.data ?? null);

      setLoading(false);

      /* Step 2: AI last */
      try {
        const aiRes = await getMoodAnalysis();
        setAiAnalysis(aiRes.data?.analysis ?? null);
      } catch { /* AI fails silently */ }
      finally   { setAiLoading(false); }
    };

    load();
  }, []);

  /* Derived data (cheap — no useMemo needed at this scale) */
  const partnerAnalytics = useMemo(() => computeLocalAnalytics(partnerMoods), [partnerMoods]);
  const compatibility    = useMemo(() => computeCompatibility(myAnalytics ?? {}, partnerAnalytics), [myAnalytics, partnerAnalytics]);

  /* Trend: chronological last-12 for each */
  const myTrend      = useMemo(() => [...myMoods].reverse().slice(-12),      [myMoods]);
  const partnerTrend = useMemo(() => [...partnerMoods].reverse().slice(-12), [partnerMoods]);

  /* No-partner state */
  if (!loading && noPartner) {
    return (
      <div className="map">
        <div className="map__header">
          <button className="map__back" onClick={() => navigate("/moods")} aria-label="Back">
            <BackIcon />
          </button>
          <div>
            <h1 className="map__title">Mood Analytics</h1>
            <p className="map__sub">Emotional Intelligence Insights</p>
          </div>
        </div>
        <div className="map__no-partner">
          <span className="map__np-emoji">💔</span>
          <h2 className="map__np-title">No Active Relationship</h2>
          <p className="map__np-text">Pair with your partner to unlock mood analytics.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="map">
      {/* Page header */}
      <div className="map__header">
        <button className="map__back" onClick={() => navigate("/moods")} aria-label="Back">
          <BackIcon />
        </button>
        <div>
          <h1 className="map__title">Mood Analytics</h1>
          <p className="map__sub">Emotional Intelligence Insights</p>
        </div>
      </div>

      {loading ? (
        <div className="map__body">
          <PageSkeleton />
        </div>
      ) : (
        <div className="map__body">

          {/* 1. Overview: me vs partner */}
          <MoodOverview
            myAnalytics={myAnalytics}
            partnerAnalytics={partnerAnalytics}
            myName={getFirstName(user?.name, "You")}
            partnerName={getFirstName(partner?.name, "Partner")}
            myPhoto={user?.profilePhoto}
            partnerPhoto={partner?.profilePhoto}
          />

          {/* 2. Compatibility ring */}
          <MoodCompatibility
            compatibility={compatibility}
            myName={getFirstName(user?.name, "You")}
            partnerName={getFirstName(partner?.name, "Partner")}
          />

          {/* 3. Trend chart */}
          <MoodTrendChart
            myTrend={myTrend}
            partnerTrend={partnerTrend}
            myName={getFirstName(user?.name, "You")}
            partnerName={getFirstName(partner?.name, "Partner")}
          />

          {/* 4. Weekly heatmap */}
          <MoodHeatmap myMoods={myMoods} />

          {/* 5. Partner moods list */}
          <PartnerMoodCard
            moods={partnerMoods}
            partnerName={getFirstName(partner?.name, "Partner")}
            partnerPhoto={partner?.profilePhoto}
          />

          {/* 6. AI analysis */}
          <AIMoodInsight analysis={aiAnalysis} loading={aiLoading} />

        </div>
      )}
    </div>
  );
};

export default MoodAnalyticsPage;
