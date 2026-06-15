import { useState, useRef } from "react";
import { addToHistory } from "../../../utils/aiHistory";
import InsightCard from "../InsightCard/InsightCard";
import "./RelationshipCoach.css";

const DAILY_TIPS = [
  "Send an unexpected 'thinking of you' message right now.",
  "Ask your partner about their biggest dream for this year.",
  "Put your phone down and give them 30 minutes of fully present time.",
  "Express one specific thing you appreciate about your partner today.",
  "Plan something small and spontaneous — a surprise coffee, a note, a hug.",
  "Ask about their day and really listen, without offering solutions.",
  "Share a memory from when you first fell in love with them.",
  "Tell them one thing they do that makes you feel completely safe.",
  "Take a walk together with no destination in mind.",
  "Cook or order their favorite meal as a surprise.",
  "Write down 3 things you love most about your relationship.",
  "Ask: 'What can I do today to make your day better?'",
  "Give a compliment that is specific and unexpected.",
  "Watch a new show or movie together — let them pick tonight.",
  "Share a song that makes you think of them.",
  "Ask about their childhood — something you have never heard before.",
  "Put a sticky note somewhere they will find it with a kind message.",
  "Plan your next adventure together, no matter how small it is.",
  "Revisit a place that has special meaning in your relationship.",
  "Take a photo together right now and set it as your lock screen.",
  "Ask: 'What has been on your mind a lot lately?'",
  "Do one of their chores without being asked or mentioning it.",
  "Create a playlist of songs that tell your love story.",
  "Have a tech-free dinner tonight and just talk.",
  "Ask about their five-year vision for their life — listen without judgment.",
  "Give them a long hug and do not let go first.",
  "Send them a voice note instead of a text today.",
  "Watch the sunset or sunrise together.",
  "Start an 'us jar' — write one good memory down each week.",
  "Say 'I love you' at a random, unexpected moment today.",
];

const getDailyTip = () => {
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
  return DAILY_TIPS[dayOfYear % DAILY_TIPS.length];
};

const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
    <path d="M21 2v6h-6M3 22v-6h6M3.5 9a9 9 0 0 1 14.83-3.36L21 8M20.5 15a9 9 0 0 1-14.83 3.36L3 16"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const SaveIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="17 21 17 13 7 13 7 21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    <polyline points="7 3 7 8 15 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CardIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
    <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2"/>
    <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

const Shimmer = ({ lines = 3 }) => {
  const ws = ["92%", "100%", "76%", "84%"];
  return (
    <div className="rc2-shimmer">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="rc2-shimmer__line" style={{ width: ws[i % 4] }} />
      ))}
    </div>
  );
};

const RelationshipCoach = ({ summary, moodAnalysis, insights, loading, onRefresh, onSaved }) => {
  const [card, setCard]   = useState(null);
  const [saved, setSaved] = useState({});
  const tip = getDailyTip();

  const handleSave = (key, type, title, content, emoji) => {
    addToHistory({ type, title, content, emoji });
    setSaved((p) => ({ ...p, [key]: true }));
    setTimeout(() => setSaved((p) => ({ ...p, [key]: false })), 2000);
    onSaved?.();
  };

  const openCard = (type, title, content, emoji) => {
    setCard({ type, title, content, emoji, savedAt: new Date().toISOString() });
  };

  return (
    <section className="rc2">
      {card && <InsightCard insight={card} onClose={() => setCard(null)} />}

      <div className="rc2__head">
        <div className="rc2__avatar-wrap">
          <div className="rc2__avatar">🤖</div>
          <div className="rc2__avatar-ring" />
        </div>
        <div className="rc2__intro">
          <h2 className="rc2__name">Your AI Coach</h2>
          <p className="rc2__role">Relationship Intelligence · Groq AI</p>
        </div>
        <button
          className={`rc2__refresh ${loading ? "rc2__refresh--spin" : ""}`}
          onClick={onRefresh}
          disabled={loading}
          aria-label="Regenerate coaching"
        >
          <RefreshIcon />
        </button>
      </div>

      {/* Daily tip */}
      <div className="rc2-tip">
        <span className="rc2-tip__label">✨ Today's tip</span>
        <p className="rc2-tip__text">{tip}</p>
      </div>

      {/* Weekly summary */}
      <div className="rc2-block">
        <div className="rc2-block__head">
          <div className="rc2-block__label-row">
            <span className="rc2-block__ico">💬</span>
            <span className="rc2-block__label">Weekly Message</span>
            <span className="rc2-block__badge rc2-block__badge--purple">✨ Weekly</span>
          </div>
          {!loading && summary && (
            <div className="rc2-block__acts">
              <button className="rc2-block__act" onClick={() => openCard("coach", "Weekly Message", summary, "💬")} aria-label="View as insight card">
                <CardIcon />
              </button>
              <button
                className={`rc2-block__act ${saved.summary ? "rc2-block__act--done" : ""}`}
                onClick={() => handleSave("summary", "coach", "Weekly Message", summary, "💬")}
                aria-label="Save to history"
              >
                {saved.summary ? "✓" : <SaveIcon />}
              </button>
            </div>
          )}
        </div>
        {loading ? <Shimmer lines={4} /> : summary ? (
          <p className="rc2-block__text">{summary}</p>
        ) : (
          <p className="rc2-block__empty">Log moods and memories throughout the week to unlock your personalized weekly message.</p>
        )}
      </div>

      {/* Mood analysis */}
      <div className="rc2-block rc2-block--accent-purple">
        <div className="rc2-block__head">
          <div className="rc2-block__label-row">
            <span className="rc2-block__ico">🧠</span>
            <span className="rc2-block__label">Mood Intelligence</span>
            <span className="rc2-block__badge rc2-block__badge--purple">🧠 Analysis</span>
          </div>
          {!loading && moodAnalysis && (
            <div className="rc2-block__acts">
              <button className="rc2-block__act" onClick={() => openCard("analysis", "Mood Intelligence", moodAnalysis, "🧠")} aria-label="View as insight card">
                <CardIcon />
              </button>
              <button
                className={`rc2-block__act ${saved.analysis ? "rc2-block__act--done" : ""}`}
                onClick={() => handleSave("analysis", "analysis", "Mood Intelligence", moodAnalysis, "🧠")}
                aria-label="Save to history"
              >
                {saved.analysis ? "✓" : <SaveIcon />}
              </button>
            </div>
          )}
        </div>
        {loading ? <Shimmer lines={3} /> : moodAnalysis ? (
          <p className="rc2-block__text">{moodAnalysis}</p>
        ) : (
          <p className="rc2-block__empty">Keep logging your moods daily to receive deep emotional pattern analysis.</p>
        )}
      </div>

      {/* Relationship insights */}
      {(loading || insights) && (
        <div className="rc2-block rc2-block--accent-pink">
          <div className="rc2-block__head">
            <div className="rc2-block__label-row">
              <span className="rc2-block__ico">✨</span>
              <span className="rc2-block__label">Relationship Insights</span>
              <span className="rc2-block__badge rc2-block__badge--pink">✨ AI</span>
            </div>
            {!loading && insights && (
              <div className="rc2-block__acts">
                <button className="rc2-block__act" onClick={() => openCard("insight", "Relationship Insights", insights, "✨")} aria-label="View as insight card">
                  <CardIcon />
                </button>
                <button
                  className={`rc2-block__act ${saved.insights ? "rc2-block__act--done" : ""}`}
                  onClick={() => handleSave("insights", "insight", "Relationship Insights", insights, "✨")}
                  aria-label="Save to history"
                >
                  {saved.insights ? "✓" : <SaveIcon />}
                </button>
              </div>
            )}
          </div>
          {loading ? <Shimmer lines={5} /> : insights ? (
            <p className="rc2-block__text">{insights}</p>
          ) : null}
        </div>
      )}

      <p className="rc2-footer">🔒 Powered by Groq llama-3.3-70b-versatile · Private to you</p>
    </section>
  );
};

export default RelationshipCoach;
