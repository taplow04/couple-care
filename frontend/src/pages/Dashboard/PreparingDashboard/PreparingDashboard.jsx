import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "../../../context/AuthContext";
import { getFirstName } from "../../../utils/getFirstName";
import { useCoupleEvents } from "../../../hooks/useCoupleEvents";
import {
  getGrowthSummary,
  getMoodSummary,
  getDailyTip,
  getQuizzes,
} from "../../../services/growth.service";

import GrowthXPBar from "../../../components/growth/GrowthXPBar";
import ReadinessRing from "../../../components/growth/ReadinessRing";
import ChallengeCard from "../../../components/growth/ChallengeCard";
import JournalQuickCard from "../../../components/growth/JournalQuickCard";
import SelfKnowledgeCard from "../../../components/growth/SelfKnowledgeCard";
import GrowthAchievements from "../../../components/growth/GrowthAchievements";
import QuizModal from "../../../components/growth/QuizModal";

import "./PreparingDashboard.css";

const MOOD_EMOJI = {
  happy: "😊", sad: "😢", angry: "😠", stressed: "😰",
  loved: "🥰", excited: "🤩", anxious: "😟",
};

const PreparingDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const name = getFirstName(user?.name, "there");

  const [summary, setSummary] = useState(null);
  const [mood, setMood] = useState(null);
  const [tip, setTip] = useState(null);
  const [quizzes, setQuizzes] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null); // "readiness" | "loveLanguage" | "attachment"

  useEffect(() => {
    let active = true;
    getGrowthSummary()
      .then((res) => active && setSummary(res.data))
      .catch(() => {});
    getMoodSummary()
      .then((res) => active && setMood(res.data))
      .catch(() => {});
    getQuizzes()
      .then((res) => active && setQuizzes(res.data))
      .catch(() => {});
    // AI tip is slower — load it independently so the page isn't blocked.
    getDailyTip()
      .then((res) => active && setTip(res.data))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  // Live personal XP / streak / achievements.
  useCoupleEvents({
    "growth:update": (payload) => {
      if (payload) setSummary((prev) => ({ ...prev, ...payload }));
    },
  });

  const daily = summary?.daily;

  const handleQuizDone = (data) => {
    // Merge the refreshed summary the quiz endpoints return.
    if (data?.summary) setSummary((prev) => ({ ...prev, ...data.summary }));
  };

  return (
    <div className="prep-dash">
      <div className="prep-dash__content">
        <header className="prep-dash__header">
          <span className="prep-dash__badge">🌱 Preparing For Love</span>
          <h1 className="prep-dash__greeting">Hi {name}</h1>
          <p className="prep-dash__sub">
            Your journey starts with you. Grow, reflect, and get ready.
          </p>
        </header>

        {/* Connect */}
        <section className="prep-card prep-card--connect">
          <div className="prep-card__icon" aria-hidden="true">💞</div>
          <h2 className="prep-card__title">Connect with your partner</h2>
          <p className="prep-card__text">
            Share your pair code or enter theirs to begin Growing Together.
          </p>
          <div className="prep-card__actions">
            <button className="prep-btn prep-btn--primary" onClick={() => navigate("/couple/create")}>
              Share Pair Code
            </button>
            <button className="prep-btn prep-btn--ghost" onClick={() => navigate("/couple/join")}>
              Join With Code
            </button>
          </div>
        </section>

        {/* AI tip */}
        <div className="prep-tip">
          <span className="prep-tip__icon">💡</span>
          <div>
            <div className="prep-tip__label">Today's Tip</div>
            <p className="prep-tip__text">
              {tip ? tip.tip : "Finding a thought for you…"}
            </p>
          </div>
        </div>

        {/* Readiness */}
        <ReadinessRing
          score={summary?.readinessScore}
          onTakeQuiz={() => setActiveQuiz("readiness")}
        />

        {/* Growth progress */}
        <GrowthXPBar summary={summary} />

        {/* Daily challenge */}
        <ChallengeCard
          challenge={summary?.todayChallenge}
          onComplete={(c) => setSummary((p) => ({ ...p, todayChallenge: c }))}
        />

        {/* Reflection + gratitude */}
        <JournalQuickCard
          type="reflection"
          prompt={daily?.reflectionPrompt}
          done={summary?.reflectionDoneToday}
        />
        <JournalQuickCard
          type="gratitude"
          prompt={daily?.gratitudePrompt}
          done={summary?.gratitudeDoneToday}
        />

        {/* Self-knowledge */}
        <SelfKnowledgeCard
          loveLanguage={summary?.loveLanguage}
          attachmentStyle={summary?.attachmentStyle}
          onTakeQuiz={(kind) => setActiveQuiz(kind)}
        />

        {/* Mood summary */}
        <div className="gcard">
          <div className="gcard__head">
            <h3 className="gcard__title">🎭 Your Mood</h3>
            <span className="gcard__hint" onClick={() => navigate("/moods")} style={{ cursor: "pointer" }}>
              Log →
            </span>
          </div>
          {mood?.total ? (
            <p className="prep-mood__line">
              <span className="prep-mood__emoji">{MOOD_EMOJI[mood.dominant] || "🙂"}</span>
              Mostly <strong>{mood.dominant}</strong> lately · {mood.total} logged
            </p>
          ) : (
            <p className="prep-mood__line prep-mood__empty">
              No moods logged yet — tracking how you feel builds self-awareness.
            </p>
          )}
        </div>

        {/* Quote */}
        {daily?.quote && (
          <blockquote className="prep-quote">
            “{daily.quote.text}”
            <cite>— {daily.quote.author}</cite>
          </blockquote>
        )}

        {/* Achievements */}
        {summary?.achievements && (
          <GrowthAchievements
            achievements={summary.achievements}
            unlocked={summary.achievementsUnlocked}
            total={summary.achievementsTotal}
          />
        )}

        {/* Quick actions */}
        <div className="prep-quick">
          <button className="prep-quick__item" onClick={() => navigate("/growth")}>
            <span>🌱</span>Growth
          </button>
          <button className="prep-quick__item" onClick={() => navigate("/journal")}>
            <span>📓</span>Journal
          </button>
          <button className="prep-quick__item" onClick={() => navigate("/ai-coach")}>
            <span>💬</span>Coach
          </button>
          <button className="prep-quick__item" onClick={() => navigate("/maturity")}>
            <span>🧭</span>Maturity
          </button>
          <button className="prep-quick__item" onClick={() => navigate("/profile")}>
            <span>👤</span>Profile
          </button>
        </div>
      </div>

      {activeQuiz && quizzes && (
        <QuizModal
          kind={activeQuiz}
          questions={
            activeQuiz === "readiness"
              ? quizzes.readiness
              : activeQuiz === "loveLanguage"
                ? quizzes.loveLanguage
                : quizzes.attachment
          }
          onClose={() => setActiveQuiz(null)}
          onDone={handleQuizDone}
        />
      )}
    </div>
  );
};

export default PreparingDashboard;
