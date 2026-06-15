import "./AIInsightCard.css";

const FALLBACK_INSIGHTS = {
  high: (partnerName) => ({
    text: `Your connection with ${partnerName || "your partner"} is radiating beautiful energy. The positive moods you've shared reflect a relationship that's truly flourishing.`,
    action: "Keep nurturing these joyful moments together",
  }),
  mid: (partnerName) => ({
    text: `You and ${partnerName || "your partner"} are navigating this journey together. Small, consistent acts of care build something extraordinary over time.`,
    action: "Plan a meaningful moment this week",
  }),
  low: () => ({
    text: "Every relationship has seasons of challenge and growth. This is a powerful opportunity to deepen your understanding and reconnect.",
    action: "Start with an honest, gentle conversation",
  }),
  empty: () => ({
    text: "Your journey is just beginning. Start logging your moods to unlock personalized AI insights about your relationship.",
    action: "Log your first mood today",
  }),
};

const getFallbackInsight = (moodAnalytics, partnerName) => {
  if (!moodAnalytics) return FALLBACK_INSIGHTS.empty();
  const { happy = 0, loved = 0, excited = 0, sad = 0, angry = 0, stressed = 0, anxious = 0 } = moodAnalytics;
  const positive = happy + loved + excited;
  const negative = sad + angry + stressed + anxious;
  const total = positive + negative;
  if (total === 0) return FALLBACK_INSIGHTS.empty();
  const score = (positive / total) * 100;
  if (score >= 70) return FALLBACK_INSIGHTS.high(partnerName);
  if (score >= 45) return FALLBACK_INSIGHTS.mid(partnerName);
  return FALLBACK_INSIGHTS.low();
};

const InsightSkeleton = () => (
  <div className="aic-skeleton">
    <div className="aic-skeleton-line aic-skeleton-line--80" />
    <div className="aic-skeleton-line aic-skeleton-line--100" />
    <div className="aic-skeleton-line aic-skeleton-line--60" />
  </div>
);

const AIInsightCard = ({ aiSummary, moodAnalytics, partner, loading = false }) => {
  const isLoading = loading || (aiSummary === null && !moodAnalytics);
  const partnerName = partner?.name?.split(" ")[0];

  let displayText = "";
  let displayAction = "";
  let isAI = false;

  if (aiSummary) {
    const truncated =
      aiSummary.length > 220
        ? aiSummary.substring(0, 220).trim() + "…"
        : aiSummary;
    displayText = truncated;
    displayAction = "View full insight in AI section";
    isAI = true;
  } else if (!isLoading) {
    const fallback = getFallbackInsight(moodAnalytics, partnerName);
    displayText = fallback.text;
    displayAction = fallback.action;
  }

  return (
    <div className="aic-card">
      <div className="aic-header">
        <div className="aic-icon-wrap" aria-hidden="true">
          <span className="aic-icon">✨</span>
        </div>
        <div>
          <p className="aic-label">AI Insight</p>
          {isAI && <span className="aic-badge">Weekly Summary</span>}
        </div>
      </div>

      {isLoading ? (
        <InsightSkeleton />
      ) : (
        <>
          <p className="aic-text">{displayText}</p>
          <div className="aic-action">
            <span className="aic-arrow" aria-hidden="true">→</span>
            <span className="aic-action-text">{displayAction}</span>
          </div>
        </>
      )}
    </div>
  );
};

export default AIInsightCard;
