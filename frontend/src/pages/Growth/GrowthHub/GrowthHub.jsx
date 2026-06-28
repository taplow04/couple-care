import { useEffect, useState } from "react";

import BackHeader from "../../../components/common/BackHeader/BackHeader";
import { useCoupleEvents } from "../../../hooks/useCoupleEvents";
import { getGrowthSummary, getQuizzes } from "../../../services/growth.service";

import GrowthXPBar from "../../../components/growth/GrowthXPBar";
import ReadinessRing from "../../../components/growth/ReadinessRing";
import ChallengeCard from "../../../components/growth/ChallengeCard";
import JournalQuickCard from "../../../components/growth/JournalQuickCard";
import SelfKnowledgeCard from "../../../components/growth/SelfKnowledgeCard";
import GrowthAchievements from "../../../components/growth/GrowthAchievements";
import QuizModal from "../../../components/growth/QuizModal";

import "./GrowthHub.css";

const GrowthHub = () => {
  const [summary, setSummary] = useState(null);
  const [quizzes, setQuizzes] = useState(null);
  const [activeQuiz, setActiveQuiz] = useState(null);

  useEffect(() => {
    let active = true;
    getGrowthSummary().then((r) => active && setSummary(r.data)).catch(() => {});
    getQuizzes().then((r) => active && setQuizzes(r.data)).catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  useCoupleEvents({
    "growth:update": (p) => p && setSummary((prev) => ({ ...prev, ...p })),
  });

  const daily = summary?.daily;

  return (
    <div className="growth-hub">
      <BackHeader title="Growth" subtitle="Your personal journey" fallback="/dashboard" />

      <div className="growth-hub__body">
        <GrowthXPBar summary={summary} />
        <ReadinessRing
          score={summary?.readinessScore}
          onTakeQuiz={() => setActiveQuiz("readiness")}
        />
        <ChallengeCard
          challenge={summary?.todayChallenge}
          onComplete={(c) => setSummary((p) => ({ ...p, todayChallenge: c }))}
        />
        <JournalQuickCard type="reflection" prompt={daily?.reflectionPrompt} done={summary?.reflectionDoneToday} />
        <JournalQuickCard type="gratitude" prompt={daily?.gratitudePrompt} done={summary?.gratitudeDoneToday} />
        <SelfKnowledgeCard
          loveLanguage={summary?.loveLanguage}
          attachmentStyle={summary?.attachmentStyle}
          onTakeQuiz={(kind) => setActiveQuiz(kind)}
        />
        {summary?.achievements && (
          <GrowthAchievements
            achievements={summary.achievements}
            unlocked={summary.achievementsUnlocked}
            total={summary.achievementsTotal}
          />
        )}
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
          onDone={(data) => data?.summary && setSummary((p) => ({ ...p, ...data.summary }))}
        />
      )}
    </div>
  );
};

export default GrowthHub;
