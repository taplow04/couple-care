import { useState } from "react";
import "./GrowthRoadmap.css";

const AREAS = [
  {
    id: "communication",
    emoji: "💬",
    title: "Communication",
    color: "#7c5cff",
    bg: "rgba(124,92,255,0.1)",
    desc: "Build deeper understanding and practice active listening",
    actions: ["Have a 10-minute feelings check-in each evening", "Practice listening without planning your response", "Share one specific appreciation daily"],
  },
  {
    id: "quality-time",
    emoji: "⏰",
    title: "Quality Time",
    color: "#ff5c8a",
    bg: "rgba(255,92,138,0.1)",
    desc: "Prioritize real presence over mere physical proximity",
    actions: ["One phone-free dinner per week", "Plan a monthly date that is new for both of you", "Create a weekly ritual that belongs only to you two"],
  },
  {
    id: "trust",
    emoji: "🔒",
    title: "Trust & Openness",
    color: "#32c36c",
    bg: "rgba(50,195,108,0.1)",
    desc: "Create safety for honesty and genuine vulnerability",
    actions: ["Share one vulnerable feeling per week without minimizing it", "Follow through on every small promise you make", "Ask: 'What can I do to help you feel safer with me?'"],
  },
  {
    id: "adventures",
    emoji: "🌍",
    title: "Shared Adventures",
    color: "#ff8c00",
    bg: "rgba(255,140,0,0.1)",
    desc: "Create new experiences and memories together",
    actions: ["Try one completely new activity per month", "Build a bucket list of things to do together", "Say yes to spontaneity at least once this week"],
  },
  {
    id: "support",
    emoji: "🤝",
    title: "Emotional Support",
    color: "#c94bcc",
    bg: "rgba(201,75,204,0.1)",
    desc: "Be each other's safe harbor through every storm",
    actions: ["Ask 'What kind of support do you need right now?'", "Celebrate each other's wins, big and small", "Check in during the day when you know they're stressed"],
  },
  {
    id: "fun",
    emoji: "🎉",
    title: "Fun & Playfulness",
    color: "#ffaa00",
    bg: "rgba(255,170,0,0.1)",
    desc: "Keep lightness, laughter, and joy alive between you",
    actions: ["Have one silly competition each week", "Watch something that makes you both laugh out loud", "Send each other funny things throughout the day"],
  },
];

const STORAGE_KEY = "cc_growth";

const GrowthRoadmap = ({ insights, insightsLoading }) => {
  const [focus, setFocus] = useState(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"); }
    catch { return {}; }
  });
  const [expanded, setExpanded] = useState(null);

  const toggleFocus = (id) => {
    setFocus((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  const focusCount = Object.values(focus).filter(Boolean).length;
  const pct = Math.round((focusCount / AREAS.length) * 100);

  return (
    <section className="gr">
      <div className="gr__head">
        <div>
          <h2 className="gr__title">🌱 Growth Roadmap</h2>
          <p className="gr__sub">Track the areas you are actively nurturing</p>
        </div>
        <div className="gr__score">
          <span className="gr__score-num">{focusCount}</span>
          <span className="gr__score-den">/{AREAS.length}</span>
        </div>
      </div>

      <div className="gr__bar-wrap">
        <div className="gr__bar-track">
          <div
            className="gr__bar-fill"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="gr__bar-label">
          {pct === 0
            ? "Tap + Focus on any area to start tracking"
            : pct === 100
            ? "🌟 All areas in focus — incredible!"
            : `${focusCount} of ${AREAS.length} areas in focus`}
        </p>
      </div>

      {(insightsLoading || insights) && (
        <div className="gr__ai">
          <span className="gr__ai-badge">✨ AI Insights</span>
          {insightsLoading ? (
            <div className="gr-shimmer">
              {["92%", "100%", "74%"].map((w, i) => (
                <div key={i} className="gr-shimmer__line" style={{ width: w }} />
              ))}
            </div>
          ) : (
            <p className="gr__ai-text">{insights}</p>
          )}
        </div>
      )}

      <div className="gr__areas">
        {AREAS.map((area) => {
          const isFocus   = !!focus[area.id];
          const isExpanded = expanded === area.id;
          return (
            <div
              key={area.id}
              className={`gr-area ${isFocus ? "gr-area--focus" : ""}`}
              style={isFocus ? { borderColor: area.color } : {}}
            >
              <div className="gr-area__row">
                <div className="gr-area__ico-wrap" style={{ background: area.bg }}>
                  <span className="gr-area__ico">{area.emoji}</span>
                </div>
                <div className="gr-area__info">
                  <h3 className="gr-area__title" style={isFocus ? { color: area.color } : {}}>{area.title}</h3>
                  <p className="gr-area__desc">{area.desc}</p>
                </div>
                <div className="gr-area__controls">
                  <button
                    className="gr-area__expand-btn"
                    onClick={() => setExpanded(isExpanded ? null : area.id)}
                    aria-label={isExpanded ? "Collapse" : "See action ideas"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "none", transition: "transform 0.2s ease" }}>
                      <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                  <button
                    className={`gr-area__focus-btn ${isFocus ? "gr-area__focus-btn--on" : ""}`}
                    style={isFocus ? { background: area.color, borderColor: area.color } : {}}
                    onClick={() => toggleFocus(area.id)}
                    aria-pressed={isFocus}
                  >
                    {isFocus ? "✓ Focus" : "+ Focus"}
                  </button>
                </div>
              </div>

              {isExpanded && (
                <div className="gr-area__actions">
                  <p className="gr-area__actions-label">Actions to try</p>
                  <ul className="gr-area__actions-list">
                    {area.actions.map((a, i) => (
                      <li key={i} className="gr-area__action">
                        <span className="gr-area__action-dot" style={{ background: area.color }} />
                        {a}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default GrowthRoadmap;
