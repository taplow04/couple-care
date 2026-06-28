import BackHeader from "../../../components/common/BackHeader/BackHeader";
import CoachChat from "../../../components/ai/CoachChat/CoachChat";
import { useStage } from "../../../hooks/useStage";
import "./PrepCoachPage.css";

const PREP = {
  headerTitle: "Preparation Coach",
  headerSub: "Grow into your best self",
  chatTitle: "🌱 Preparation Coach",
  chatSub: "Your mentor for getting ready for love",
  suggestions: [
    "How can I communicate better?",
    "How do I build confidence?",
    "How do I stop overthinking?",
    "What are healthy boundaries?",
    "Green flags vs red flags?",
  ],
  empty:
    "Ask anything about communication, confidence, boundaries, attachment, or getting ready for a healthy relationship.",
};

const RECOVERY = {
  headerTitle: "Recovery Coach",
  headerSub: "Heal at your own pace",
  chatTitle: "🌤 Recovery Coach",
  chatSub: "Gentle support for healing and growth",
  suggestions: [
    "How do I move on?",
    "How do I manage these emotions?",
    "How do I rebuild my confidence?",
    "How do I practice self-care?",
    "How do I find acceptance?",
  ],
  empty:
    "This is a safe space. Ask anything about healing, managing emotions, self-care, forgiveness, or moving forward — at your own pace.",
};

/**
 * Solo coach page (Stage 1 Preparation / Stage 3 Recovery). The coach backend is
 * stage-aware, so the same CoachChat becomes the right mentor automatically —
 * here we only swap the copy + starter prompts to match the stage.
 */
const PrepCoachPage = () => {
  const { isHealing } = useStage();
  const c = isHealing ? RECOVERY : PREP;

  return (
    <div className="prep-coach-page">
      <BackHeader title={c.headerTitle} subtitle={c.headerSub} fallback="/dashboard" />
      <div className="prep-coach-page__body">
        <CoachChat
          title={c.chatTitle}
          subtitle={c.chatSub}
          suggestions={c.suggestions}
          emptyText={c.empty}
        />
        {isHealing && (
          <p className="prep-coach-page__disclaimer">
            This coach supports your growth and isn't a substitute for professional
            mental-health care. If you're in crisis, please reach out to a
            professional or a crisis line.
          </p>
        )}
      </div>
    </div>
  );
};

export default PrepCoachPage;
