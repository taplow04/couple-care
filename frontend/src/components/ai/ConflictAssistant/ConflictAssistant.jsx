import { useState } from "react";
import "./ConflictAssistant.css";

const TYPES = [
  {
    id: "communication",
    emoji: "💬",
    title: "Communication",
    color: "#7c5cff",
    bg: "rgba(124,92,255,0.1)",
    tagline: "Feeling unheard or misunderstood",
    understanding: "Communication conflicts arise when partners have different processing styles. One may prefer to talk things out immediately while the other needs quiet time to process first. Neither is wrong — the friction comes from assuming your style is the obvious one.",
    steps: ["Choose a calm moment, not mid-argument", "Use 'I feel...' instead of 'You always...'", "Ask questions to understand, not to counter", "Reflect back what you heard before replying"],
    use: ["\"I felt unheard when... can we talk about it?\"", "\"Help me understand what you meant by that.\"", "\"I need a moment to think before I respond.\""],
    avoid: ["\"You never listen to me.\"", "\"You always do this.\"", "Bringing up unrelated old conflicts."],
  },
  {
    id: "trust",
    emoji: "🔒",
    title: "Trust & Jealousy",
    color: "#ff5252",
    bg: "rgba(255,82,82,0.1)",
    tagline: "Insecurity, doubt, or past hurt surfacing",
    understanding: "Trust issues often stem from past experiences — in this relationship or previous ones. Jealousy is usually fear of loss dressed as anger. The real question underneath is almost always: 'Am I enough? Am I safe here?' Acknowledging the fear is the first step.",
    steps: ["Identify the fear underneath the jealousy", "Share the feeling without making it an accusation", "Discuss what reassurance looks like to you specifically", "Agree on boundaries that feel safe for both of you"],
    use: ["\"I felt insecure when... it's not your fault, but can we talk?\"", "\"What would help me feel more secure is...\"", "\"I trust you — I'm working through my own feelings.\""],
    avoid: ["\"Why were you talking to them?\"", "\"You're always flirting.\"", "Checking phones or messages without consent."],
  },
  {
    id: "time",
    emoji: "⏰",
    title: "Quality Time",
    color: "#ff8c00",
    bg: "rgba(255,140,0,0.1)",
    tagline: "Feeling disconnected or deprioritized",
    understanding: "When quality time is someone's love language, feeling deprived of it can register as feeling unloved. This conflict is rarely about the schedule — it's about the feeling that other things are consistently being prioritized over the relationship.",
    steps: ["Express how disconnection makes you feel — not what they're doing wrong", "Propose a specific, simple shared routine you'd both enjoy", "Protect that time like an important appointment", "Put phones away during that time without exception"],
    use: ["\"I've been missing us lately — can we plan something just for two?\"", "\"Even 30 minutes of real time together matters a lot to me.\"", "\"I feel most connected when we...\""],
    avoid: ["\"You never make time for me.\"", "\"Your work/friends are more important than me.\"", "Keeping a mental score of who makes more effort."],
  },
  {
    id: "finances",
    emoji: "💰",
    title: "Finances",
    color: "#32c36c",
    bg: "rgba(50,195,108,0.1)",
    tagline: "Money disagreements or different values",
    understanding: "Money conflicts are rarely about money — they're about values, security, and control. Spenders and savers see financial decisions through entirely different lenses. The conflict happens when you assume your approach is the obvious, rational one.",
    steps: ["Separate the facts from the feelings around money", "Understand each other's money history and early beliefs", "Create shared financial goals you're both genuinely excited about", "Build a system that honors both your spending and saving styles"],
    use: ["\"I feel anxious about this — can we create a plan together?\"", "\"What does financial security feel like to you?\"", "\"Let's set a goal we're both working toward.\""],
    avoid: ["\"You spend too much.\"", "\"You're too cheap.\"", "Making significant financial decisions without discussing first."],
  },
  {
    id: "intimacy",
    emoji: "💕",
    title: "Intimacy",
    color: "#ff5c8a",
    bg: "rgba(255,92,138,0.1)",
    tagline: "Emotional or physical distance growing",
    understanding: "Intimacy gaps develop gradually — stress, routine, and unresolved tension all push partners apart slowly. The gap rarely means love is fading. It usually means emotional safety and connection aren't being actively maintained. Rebuilding starts with small, consistent moments.",
    steps: ["Create low-pressure moments of physical closeness with no expectations", "Prioritize non-sexual touch — it builds connection without pressure", "Address unresolved emotional tension before physical intimacy", "Be explicit about your needs — don't expect your partner to guess"],
    use: ["\"I've been feeling disconnected lately. I miss us.\"", "\"What would help you feel closer to me right now?\"", "\"I need to feel emotionally connected first.\""],
    avoid: ["Pressuring or using guilt as leverage.", "Comparing to how things were early in the relationship.", "Withdrawing further as a form of punishment."],
  },
  {
    id: "family",
    emoji: "👨‍👩‍👧",
    title: "Family & Friends",
    color: "#c94bcc",
    bg: "rgba(201,75,204,0.1)",
    tagline: "External relationships creating tension",
    understanding: "These conflicts are hard because loyalty feels like it's being tested. The truth is you can love your partner and your family deeply. The conflict is rarely about who you love more — it's about how to protect your relationship while honoring those other bonds.",
    steps: ["Acknowledge that both relationships are real and matter", "Clarify the shared values and limits of your partnership", "Present a united front on decisions that affect you both", "Never share your partner's private feelings with family before discussing with them"],
    use: ["\"I love my family, and I also need to protect what we have.\"", "\"How can we navigate this together?\"", "\"I'll talk to them. This is our decision to make together.\""],
    avoid: ["\"Choose — me or them.\"", "Using family opinions to win arguments.", "Sharing relationship conflicts with family before your partner."],
  },
];

const CALM = [
  { key: "C", label: "Clarify", desc: "Define the actual problem. Ask yourself: 'What am I really feeling, and what do I actually need right now?'" },
  { key: "A", label: "Acknowledge", desc: "Validate your partner's feelings out loud, even if you disagree completely with their view of what happened." },
  { key: "L", label: "Listen", desc: "Listen to understand — not to defend, not to plan your response. Stay in their world for a moment." },
  { key: "M", label: "Move Forward", desc: "Agree on one small, concrete step you'll both take. Progress, not perfection, is the goal here." },
];

const ConflictAssistant = () => {
  const [selected, setSelected] = useState(null);
  const [activeTab, setActiveTab] = useState("steps");

  const type = TYPES.find((t) => t.id === selected);

  const handleSelect = (id) => {
    setSelected(selected === id ? null : id);
    setActiveTab("steps");
  };

  return (
    <section className="ca">
      <div className="ca__head">
        <h2 className="ca__title">🕊️ Conflict Resolution</h2>
        <p className="ca__sub">Evidence-based guidance for your toughest conversations</p>
      </div>

      <div className="ca__grid">
        {TYPES.map((t) => (
          <button
            key={t.id}
            className={`ca-type ${selected === t.id ? "ca-type--on" : ""}`}
            style={selected === t.id ? { borderColor: t.color, background: t.bg } : {}}
            onClick={() => handleSelect(t.id)}
          >
            <span className="ca-type__emoji">{t.emoji}</span>
            <span className="ca-type__label" style={selected === t.id ? { color: t.color } : {}}>{t.title}</span>
          </button>
        ))}
      </div>

      {!type && (
        <div className="ca__prompt">
          <p>Choose a conflict type above to get step-by-step guidance, example scripts, and the CALM framework to navigate it with care.</p>
        </div>
      )}

      {type && (
        <div className="ca-panel" style={{ "--ca-c": type.color, "--ca-bg": type.bg }}>
          <div className="ca-panel__header">
            <span className="ca-panel__emoji">{type.emoji}</span>
            <div>
              <h3 className="ca-panel__title">{type.title}</h3>
              <p className="ca-panel__tagline">{type.tagline}</p>
            </div>
          </div>

          <p className="ca-panel__understanding">{type.understanding}</p>

          <div className="ca-panel__tabs">
            {[["steps","📋 Steps"],["scripts","💬 Scripts"],["calm","🧘 CALM"]].map(([id, label]) => (
              <button
                key={id}
                className={`ca-tab ${activeTab === id ? "ca-tab--on" : ""}`}
                onClick={() => setActiveTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === "steps" && (
            <ol className="ca-steps">
              {type.steps.map((s, i) => (
                <li key={i} className="ca-step">
                  <span className="ca-step__num">{i + 1}</span>
                  <span className="ca-step__text">{s}</span>
                </li>
              ))}
            </ol>
          )}

          {activeTab === "scripts" && (
            <div className="ca-scripts">
              <div className="ca-script-group">
                <p className="ca-script-label ca-script-label--use">✅ Try saying</p>
                {type.use.map((s, i) => (
                  <div key={i} className="ca-script ca-script--use">{s}</div>
                ))}
              </div>
              <div className="ca-script-group">
                <p className="ca-script-label ca-script-label--avoid">❌ Avoid saying</p>
                {type.avoid.map((s, i) => (
                  <div key={i} className="ca-script ca-script--avoid">{s}</div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "calm" && (
            <div className="ca-calm">
              {CALM.map((s) => (
                <div key={s.key} className="ca-calm-item">
                  <div className="ca-calm-letter">{s.key}</div>
                  <div>
                    <p className="ca-calm-title">{s.label}</p>
                    <p className="ca-calm-desc">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default ConflictAssistant;
