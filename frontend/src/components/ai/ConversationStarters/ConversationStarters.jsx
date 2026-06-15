import { useState, useCallback, useRef } from "react";
import { addToHistory } from "../../../utils/aiHistory";
import "./ConversationStarters.css";

const ALL_STARTERS = [
  { id: 1,  cat: "Deep",     emoji: "💭", text: "What is a dream you have never told anyone about?" },
  { id: 2,  cat: "Deep",     emoji: "💭", text: "What moment in your life do you wish you could relive?" },
  { id: 3,  cat: "Deep",     emoji: "💭", text: "What is something about yourself that took you a long time to love?" },
  { id: 4,  cat: "Deep",     emoji: "💭", text: "When do you feel most like yourself?" },
  { id: 5,  cat: "Deep",     emoji: "💭", text: "What is a fear you have not fully faced yet?" },
  { id: 6,  cat: "Deep",     emoji: "💭", text: "What is something you are proud of that almost no one knows?" },
  { id: 7,  cat: "Deep",     emoji: "💭", text: "What part of your childhood shaped you the most?" },
  { id: 8,  cat: "Deep",     emoji: "💭", text: "What belief did you hold before us that I changed?" },
  { id: 9,  cat: "Fun",      emoji: "😄", text: "If you could live in any movie universe, which would you pick?" },
  { id: 10, cat: "Fun",      emoji: "😄", text: "What is the most ridiculous thing you believed as a kid?" },
  { id: 11, cat: "Fun",      emoji: "😄", text: "If we could teleport anywhere right now, where do we go?" },
  { id: 12, cat: "Fun",      emoji: "😄", text: "What is your most underrated, weird talent?" },
  { id: 13, cat: "Fun",      emoji: "😄", text: "If our relationship were a movie, what would the title be?" },
  { id: 14, cat: "Fun",      emoji: "😄", text: "What is the best prank you have ever successfully pulled off?" },
  { id: 15, cat: "Fun",      emoji: "😄", text: "If we swapped lives for a day, what would you do first?" },
  { id: 16, cat: "Romantic", emoji: "❤️", text: "What is the exact moment you knew this was something real?" },
  { id: 17, cat: "Romantic", emoji: "❤️", text: "What small thing do I do that makes you feel most loved?" },
  { id: 18, cat: "Romantic", emoji: "❤️", text: "What is your favorite memory of us so far?" },
  { id: 19, cat: "Romantic", emoji: "❤️", text: "What is one thing I do that makes you feel completely safe?" },
  { id: 20, cat: "Romantic", emoji: "❤️", text: "When did you first realize I was someone truly special to you?" },
  { id: 21, cat: "Romantic", emoji: "❤️", text: "Where do you see us together in ten years from now?" },
  { id: 22, cat: "Romantic", emoji: "❤️", text: "What does love look like to you on your hardest days?" },
  { id: 23, cat: "Growth",   emoji: "🌱", text: "What is one thing we could do differently as a couple?" },
  { id: 24, cat: "Growth",   emoji: "🌱", text: "What is a goal you want us to achieve together this year?" },
  { id: 25, cat: "Growth",   emoji: "🌱", text: "How can I better support you on your hardest days?" },
  { id: 26, cat: "Growth",   emoji: "🌱", text: "What is something new we should learn or experience together?" },
  { id: 27, cat: "Growth",   emoji: "🌱", text: "What is a habit you would like us to build together as a team?" },
  { id: 28, cat: "Growth",   emoji: "🌱", text: "What does your ideal relationship dynamic look like day to day?" },
  { id: 29, cat: "Dreams",   emoji: "🌟", text: "What is your biggest goal for the next five years?" },
  { id: 30, cat: "Dreams",   emoji: "🌟", text: "What would you do if money and time were not a concern?" },
  { id: 31, cat: "Dreams",   emoji: "🌟", text: "Where in the world would you most want us to live someday?" },
  { id: 32, cat: "Dreams",   emoji: "🌟", text: "What kind of life do you want to look back on when you are old?" },
];

const CATS = ["All", "Deep", "Fun", "Romantic", "Growth", "Dreams"];

const CAT_CFG = {
  All:      { color: "#ff5c8a", bg: "var(--primary-light)" },
  Deep:     { color: "#7c5cff", bg: "var(--secondary-light)" },
  Fun:      { color: "#ffaa00", bg: "rgba(255,170,0,0.1)" },
  Romantic: { color: "#ff5c8a", bg: "var(--primary-light)" },
  Growth:   { color: "#32c36c", bg: "rgba(50,195,108,0.1)" },
  Dreams:   { color: "#c94bcc", bg: "rgba(201,75,204,0.1)" },
};

const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

const ConversationStarters = ({ onSaved }) => {
  const [activeCat, setActiveCat] = useState("All");
  const [shown, setShown]         = useState(() => pick(ALL_STARTERS, 4));
  const [copied, setCopied]       = useState(null);
  const [saved, setSaved]         = useState(null);
  const [shuffled, setShuffled]   = useState(false);
  const copyTimer = useRef(null);
  const saveTimer = useRef(null);

  const getPool = useCallback((cat) =>
    cat === "All" ? ALL_STARTERS : ALL_STARTERS.filter((s) => s.cat === cat),
  []);

  const handleCatChange = (cat) => {
    setActiveCat(cat);
    setShown(pick(getPool(cat), 4));
  };

  const handleShuffle = () => {
    setShown(pick(getPool(activeCat), 4));
    setShuffled(true);
    setTimeout(() => setShuffled(false), 1200);
  };

  const handleCopy = (text, id) => {
    if (copyTimer.current) clearTimeout(copyTimer.current);
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    copyTimer.current = setTimeout(() => setCopied(null), 2000);
  };

  const handleSave = (starter) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    addToHistory({ type: "starter", title: "Conversation Starter", content: starter.text, emoji: starter.emoji });
    setSaved(starter.id);
    saveTimer.current = setTimeout(() => setSaved(null), 2000);
    onSaved?.();
  };

  return (
    <section className="cs2">
      <div className="cs2__head">
        <div className="cs2__title-row">
          <span className="cs2__ico">💬</span>
          <div>
            <h2 className="cs2__title">Conversation Starters</h2>
            <p className="cs2__sub">Break the silence beautifully</p>
          </div>
        </div>
        <button
          className={`cs2__shuffle ${shuffled ? "cs2__shuffle--done" : ""}`}
          onClick={handleShuffle}
        >
          {shuffled ? "✓ Fresh!" : "🔀 New"}
        </button>
      </div>

      <div className="cs2__cats">
        {CATS.map((cat) => {
          const cc = CAT_CFG[cat];
          return (
            <button
              key={cat}
              className={`cs2__cat ${activeCat === cat ? "cs2__cat--on" : ""}`}
              style={activeCat === cat ? { color: cc.color, background: cc.bg, borderColor: cc.color } : {}}
              onClick={() => handleCatChange(cat)}
            >
              {cat}
            </button>
          );
        })}
      </div>

      <div className="cs2__grid">
        {shown.map((s) => {
          const cc = CAT_CFG[s.cat] ?? CAT_CFG.All;
          return (
            <div key={s.id} className="cs2-card" style={{ "--cs2-c": cc.color, "--cs2-bg": cc.bg }}>
              <div className="cs2-card__top">
                <span className="cs2-card__emoji">{s.emoji}</span>
                <span className="cs2-card__cat">{s.cat}</span>
              </div>
              <p className="cs2-card__text">{s.text}</p>
              <div className="cs2-card__actions">
                <button
                  className={`cs2-card__btn ${copied === s.id ? "cs2-card__btn--done" : ""}`}
                  onClick={() => handleCopy(s.text, s.id)}
                >
                  {copied === s.id ? "✓ Copied" : "Copy"}
                </button>
                <button
                  className={`cs2-card__btn cs2-card__btn--save ${saved === s.id ? "cs2-card__btn--done" : ""}`}
                  onClick={() => handleSave(s)}
                  aria-label="Save to history"
                >
                  {saved === s.id ? "✓ Saved" : "💾 Save"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ConversationStarters;
