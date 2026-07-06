import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { getFirstName } from "../../../utils/getFirstName";
import { useCoupleEvents } from "../../../hooks/useCoupleEvents";
import { getGrowthSummary, getMoodSummary, getDailyTip } from "../../../services/growth.service";
import { getRelationshipSummary } from "../../../services/lifecycle.service";

import GrowthXPBar from "../../../components/growth/GrowthXPBar";
import HealingProgressCard from "../../../components/intelligence/HealingProgressCard";
import ChallengeCard from "../../../components/growth/ChallengeCard";
import JournalQuickCard from "../../../components/growth/JournalQuickCard";
import GrowthAchievements from "../../../components/growth/GrowthAchievements";

import "./HealingDashboard.css";

const MOOD_EMOJI = {
  happy: "😊", sad: "😢", angry: "😠", stressed: "😰",
  loved: "🥰", excited: "🤩", anxious: "😟",
};

const HealingDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = getFirstName(user?.name, "there");

  const [summary, setSummary] = useState(null);
  const [mood, setMood] = useState(null);
  const [tip, setTip] = useState(null);
  const [relSummary, setRelSummary] = useState(null);

  useEffect(() => {
    let active = true;
    getGrowthSummary().then((r) => active && setSummary(r.data)).catch(() => {});
    getMoodSummary().then((r) => active && setMood(r.data)).catch(() => {});
    getDailyTip().then((r) => active && setTip(r.data)).catch(() => {});
    getRelationshipSummary().then((r) => active && setRelSummary(r.data)).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useCoupleEvents({
    "growth:update": (p) => p && setSummary((prev) => ({ ...prev, ...p })),
  });

  const daily = summary?.daily;
  const s = relSummary?.summary;

  return (
    <div className="heal-dash">
      <div className="heal-dash__content">
        <header className="heal-dash__header">
          <span className="heal-dash__badge">🌤 Healing Journey</span>
          <h1 className="heal-dash__greeting">Take care, {name}</h1>
          <p className="heal-dash__sub">
            Endings are part of growth. Heal at your own pace.
          </p>
        </header>

        {/* Gentle daily tip */}
        <div className="heal-tip">
          <span className="heal-tip__icon">🌱</span>
          <p className="heal-tip__text">{tip ? tip.tip : "Finding a gentle thought for you…"}</p>
        </div>

        {/* Healing progress */}
        <div className="heal-section-label">Healing Progress</div>
        <GrowthXPBar summary={summary} />
        <HealingProgressCard />

        {/* Mood recovery */}
        <div className="gcard">
          <div className="gcard__head">
            <h3 className="gcard__title">💗 Mood Recovery</h3>
            <span className="gcard__hint" style={{ cursor: "pointer" }} onClick={() => navigate("/moods")}>
              Log →
            </span>
          </div>
          {mood?.total ? (
            <p className="heal-mood__line">
              <span className="heal-mood__emoji">{MOOD_EMOJI[mood.dominant] || "🙂"}</span>
              Mostly <strong>{mood.dominant}</strong> lately · tracking helps you heal
            </p>
          ) : (
            <p className="heal-mood__line heal-mood__empty">
              Logging how you feel each day gently maps your recovery.
            </p>
          )}
        </div>

        {/* Reflection + challenge */}
        <JournalQuickCard type="reflection" prompt={daily?.reflectionPrompt} done={summary?.reflectionDoneToday} />
        <ChallengeCard
          challenge={summary?.todayChallenge}
          onComplete={(c) => setSummary((p) => ({ ...p, todayChallenge: c }))}
        />

        {/* Recovery coach */}
        <button className="heal-link-card" onClick={() => navigate("/ai-coach")}>
          <span className="heal-link-card__icon">💬</span>
          <div className="heal-link-card__body">
            <div className="heal-link-card__title">Recovery Coach</div>
            <div className="heal-link-card__sub">Talk it through, judgment-free</div>
          </div>
          <span className="heal-link-card__chev">›</span>
        </button>

        {/* Relationship summary */}
        <button className="heal-summary-card" onClick={() => navigate("/summary")}>
          <div className="heal-summary-card__head">
            <span>📜 Relationship Summary</span>
            <span className="heal-link-card__chev">›</span>
          </div>
          {s ? (
            <div className="heal-summary-card__stats">
              <div><strong>{s.durationDays}</strong><span>days</span></div>
              <div><strong>{s.messagesExchanged}</strong><span>messages</span></div>
              <div><strong>{s.memoriesCount}</strong><span>memories</span></div>
            </div>
          ) : (
            <p className="heal-summary-card__pending">Your permanent summary of the journey.</p>
          )}
        </button>

        {/* Relationship maturity */}
        <button className="heal-link-card" onClick={() => navigate("/maturity")}>
          <span className="heal-link-card__icon">🧭</span>
          <div className="heal-link-card__body">
            <div className="heal-link-card__title">Relationship Maturity</div>
            <div className="heal-link-card__sub">Watch your growth carry forward</div>
          </div>
          <span className="heal-link-card__chev">›</span>
        </button>

        {/* Growth report */}
        <button className="heal-link-card" onClick={() => navigate("/growth-report")}>
          <span className="heal-link-card__icon">📝</span>
          <div className="heal-link-card__body">
            <div className="heal-link-card__title">Growth Report</div>
            <div className="heal-link-card__sub">A private reflection, just for you</div>
          </div>
          <span className="heal-link-card__chev">›</span>
        </button>

        {/* Achievements */}
        {summary?.achievements && (
          <GrowthAchievements
            achievements={summary.achievements}
            unlocked={summary.achievementsUnlocked}
            total={summary.achievementsTotal}
          />
        )}

        {/* Reconnect */}
        <section className="heal-card heal-card--reconnect">
          <h2 className="heal-card__title">When you're ready</h2>
          <p className="heal-card__text">
            There's no rush. Whenever you feel ready, you can begin again.
          </p>
          <button className="heal-btn" onClick={() => navigate("/couple")}>
            Begin Again
          </button>
        </section>
      </div>
    </div>
  );
};

export default HealingDashboard;
