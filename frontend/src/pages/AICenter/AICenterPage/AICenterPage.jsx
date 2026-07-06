import { useState, useEffect, useRef, useCallback } from "react";
import {
  getHealthScore,
  getWeeklySummary,
  getMoodAnalysis,
  getRelationshipInsights,
  getMemoryRecap,
} from "../../../services/ai.service";
import { getMemoryStats } from "../../../services/memories.service";

import RelationshipHealth   from "../../../components/ai/RelationshipHealth/RelationshipHealth";
import RelationshipCoach    from "../../../components/ai/RelationshipCoach/RelationshipCoach";
import DatePlanner          from "../../../components/ai/DatePlanner/DatePlanner";
import ConversationStarters from "../../../components/ai/ConversationStarters/ConversationStarters";
import ConflictAssistant    from "../../../components/ai/ConflictAssistant/ConflictAssistant";
import MemoryIntelligence   from "../../../components/ai/MemoryIntelligence/MemoryIntelligence";
import GrowthRoadmap        from "../../../components/ai/GrowthRoadmap/GrowthRoadmap";
import LoveLetterGenerator  from "../../../components/ai/LoveLetterGenerator/LoveLetterGenerator";
import CoachChat            from "../../../components/ai/CoachChat/CoachChat";
import AIHistory            from "../../../components/ai/AIHistory/AIHistory";
import BehaviorInsights     from "../../../components/intelligence/BehaviorInsights";
import MaturityInsights     from "../../../components/intelligence/MaturityInsights";
import "./AICenterPage.css";

const TABS = [
  { id: "coach",   emoji: "🤖", label: "Coach"   },
  { id: "ask",     emoji: "🫂", label: "Ask AI"  },
  { id: "health",  emoji: "❤️", label: "Health"  },
  { id: "signals", emoji: "💞", label: "Signals" },
  { id: "maturity", emoji: "🧭", label: "Maturity" },
  { id: "letter",  emoji: "💌", label: "Letter"  },
  { id: "dates",   emoji: "💑", label: "Dates"   },
  { id: "talk",    emoji: "💬", label: "Talk"    },
  { id: "resolve", emoji: "🕊️", label: "Resolve" },
  { id: "memory",  emoji: "📸", label: "Memory"  },
  { id: "growth",  emoji: "🌱", label: "Growth"  },
  { id: "saved",   emoji: "📌", label: "Saved"   },
];

const INIT = {
  health:   { score: null, level: null, loading: true },
  summary:  { text: null, loading: true },
  analysis: { text: null, loading: true },
  insights: { text: null, loading: true },
  recap:    { text: null, loading: true },
  memStats: { data: null, loading: false },
};

const fmtRelative = (d) => {
  if (!d) return null;
  const m = Math.floor((Date.now() - d.getTime()) / 60000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
};

const RefreshSVG = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M21 2v6h-6M3 22v-6h6M3.5 9a9 9 0 0 1 14.83-3.36L21 8M20.5 15a9 9 0 0 1-14.83 3.36L3 16"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const AICenterPage = () => {
  const [tab, setTab]           = useState("coach");
  const [slices, setSlices]     = useState(INIT);
  const [lastRefresh, setLR]    = useState(null);
  const [historyKey, setHK]     = useState(0);
  const mountedRef              = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const patch = useCallback((key, updates) => {
    if (!mountedRef.current) return;
    setSlices((prev) => ({ ...prev, [key]: { ...prev[key], ...updates } }));
  }, []);

  /* ── Loaders ── */
  const loadHealth = useCallback(async () => {
    patch("health", { loading: true });
    try {
      const res = await getHealthScore();
      patch("health", { score: res.data?.score ?? null, level: res.data?.level ?? null, loading: false });
    } catch { patch("health", { loading: false }); }
  }, [patch]);

  const loadSummary = useCallback(async () => {
    patch("summary", { loading: true });
    try {
      const res = await getWeeklySummary();
      patch("summary", { text: res.data?.summary ?? null, loading: false });
    } catch { patch("summary", { loading: false }); }
  }, [patch]);

  const loadAnalysis = useCallback(async () => {
    patch("analysis", { loading: true });
    try {
      const res = await getMoodAnalysis();
      patch("analysis", { text: res.data?.analysis ?? null, loading: false });
    } catch { patch("analysis", { loading: false }); }
  }, [patch]);

  const loadInsights = useCallback(async () => {
    patch("insights", { loading: true });
    try {
      const res = await getRelationshipInsights();
      patch("insights", { text: res.data?.insights ?? null, loading: false });
    } catch { patch("insights", { loading: false }); }
  }, [patch]);

  const loadRecap = useCallback(async () => {
    patch("recap", { loading: true });
    try {
      const res = await getMemoryRecap();
      patch("recap", { text: res.data?.recap ?? null, loading: false });
    } catch { patch("recap", { loading: false }); }
  }, [patch]);

  const loadMemStats = useCallback(async () => {
    try {
      const res = await getMemoryStats();
      patch("memStats", { data: res.data ?? null });
    } catch { /* stats are optional */ }
  }, [patch]);

  const refreshCoach  = useCallback(() => Promise.all([loadSummary(), loadAnalysis(), loadInsights()]), [loadSummary, loadAnalysis, loadInsights]);
  const refreshMemory = useCallback(() => Promise.all([loadRecap(), loadMemStats()]), [loadRecap, loadMemStats]);

  const refreshAll = useCallback(async () => {
    await Promise.allSettled([loadHealth(), loadSummary(), loadAnalysis(), loadInsights(), loadRecap()]);
    if (mountedRef.current) setLR(new Date());
  }, [loadHealth, loadSummary, loadAnalysis, loadInsights, loadRecap]);

  /* ── Initial load ── */
  useEffect(() => {
    const init = async () => {
      await Promise.allSettled([loadHealth()]);
      await Promise.allSettled([loadSummary(), loadAnalysis(), loadInsights(), loadRecap(), loadMemStats()]);
      if (mountedRef.current) setLR(new Date());
    };
    init();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const allLoading = [slices.health, slices.summary, slices.analysis, slices.insights, slices.recap].every((s) => s.loading);
  const handleSaved = () => setHK((k) => k + 1);

  const handleTabChange = (id) => {
    setTab(id);
    if (id === "saved") setHK((k) => k + 1);
  };

  /* ── Tab content ── */
  const renderTab = () => {
    switch (tab) {
      case "coach": return (
        <RelationshipCoach
          summary={slices.summary.text}
          moodAnalysis={slices.analysis.text}
          insights={slices.insights.text}
          loading={slices.summary.loading || slices.analysis.loading}
          onRefresh={refreshCoach}
          onSaved={handleSaved}
        />
      );
      case "health": return (
        <RelationshipHealth
          score={slices.health.score}
          level={slices.health.level}
          loading={slices.health.loading}
          onRefresh={loadHealth}
        />
      );
      case "ask":     return <CoachChat />;
      case "signals": return <BehaviorInsights />;
      case "maturity": return <MaturityInsights />;
      case "letter":  return <LoveLetterGenerator />;
      case "dates":   return <DatePlanner />;
      case "talk":    return <ConversationStarters onSaved={handleSaved} />;
      case "resolve": return <ConflictAssistant />;
      case "memory":  return (
        <MemoryIntelligence
          recap={slices.recap.text}
          memStats={slices.memStats.data}
          loading={slices.recap.loading}
          onRefresh={refreshMemory}
          onSaved={handleSaved}
        />
      );
      case "growth":  return (
        <GrowthRoadmap
          insights={slices.insights.text}
          insightsLoading={slices.insights.loading}
        />
      );
      case "saved":   return <AIHistory refreshTrigger={historyKey} />;
      default:        return null;
    }
  };

  return (
    <div className="aic">
      {/* ── Hero ── */}
      <div className="aic-hero">
        <div className="aic-hero__orb aic-hero__orb--tl" />
        <div className="aic-hero__orb aic-hero__orb--br" />
        <div className="aic-hero__floats" aria-hidden="true">
          <span className="aic-hero__f aic-hero__f--1">✨</span>
          <span className="aic-hero__f aic-hero__f--2">🤖</span>
          <span className="aic-hero__f aic-hero__f--3">💫</span>
        </div>

        <div className="aic-hero__content">
          <p className="aic-hero__eyebrow">CoupleCare</p>
          <h1 className="aic-hero__title">AI Center</h1>
          <p className="aic-hero__sub">Your Relationship Intelligence Hub</p>
          {!slices.health.loading && slices.health.score != null && (
            <div className="aic-hero__pill">
              <span className="aic-hero__pill-score">{slices.health.score}</span>
              <span className="aic-hero__pill-sep">/100</span>
              <span className="aic-hero__pill-level">{slices.health.level}</span>
            </div>
          )}
        </div>

        <div className="aic-hero__actions">
          <button
            className={`aic-hero__refresh ${allLoading ? "aic-hero__refresh--spin" : ""}`}
            onClick={refreshAll}
            disabled={allLoading}
          >
            <RefreshSVG />
            {allLoading ? "Refreshing…" : "Refresh All"}
          </button>
          {lastRefresh && (
            <span className="aic-hero__updated">Updated {fmtRelative(lastRefresh)}</span>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <nav className="aic-tabs" aria-label="AI Center sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            className={`aic-tab ${tab === t.id ? "aic-tab--on" : ""}`}
            onClick={() => handleTabChange(t.id)}
            role="tab"
            aria-selected={tab === t.id}
          >
            <span className="aic-tab__emoji">{t.emoji}</span>
            <span className="aic-tab__label">{t.label}</span>
          </button>
        ))}
      </nav>

      {/* ── Content ── */}
      <div className="aic-body">
        {renderTab()}
      </div>
    </div>
  );
};

export default AICenterPage;
