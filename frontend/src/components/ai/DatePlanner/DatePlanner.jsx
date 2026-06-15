import { useState, useCallback } from "react";
import "./DatePlanner.css";

const DATE_IDEAS = [
  { id: 1,  emoji: "🌙", title: "Rooftop Stargazing",         desc: "Grab blankets, hot drinks, and spend the night counting stars and dreaming together.",       cat: "Romantic",  effort: "Low",    time: "2–3h",     budget: 0 },
  { id: 2,  emoji: "🕯️", title: "Candlelit Home Dinner",      desc: "Cook together, dim the lights, set the table like a real restaurant. Just the two of you.",   cat: "Romantic",  effort: "Medium", time: "2h",       budget: 1 },
  { id: 3,  emoji: "🌅", title: "Sunrise Date",                desc: "Set an alarm, find a beautiful spot, and watch the world wake up together in silence.",        cat: "Romantic",  effort: "Low",    time: "2h",       budget: 0 },
  { id: 4,  emoji: "💌", title: "Love Letter Exchange",        desc: "Each write a handwritten letter to the other. Exchange them over coffee and read aloud.",      cat: "Romantic",  effort: "Low",    time: "1h",       budget: 0 },
  { id: 5,  emoji: "🛁", title: "Spa Night at Home",           desc: "Face masks, candles, essential oils, soft music. Full relaxation mode — no phones allowed.",   cat: "Romantic",  effort: "Low",    time: "2h",       budget: 1 },
  { id: 6,  emoji: "🎬", title: "Blanket Fort Movie Night",    desc: "Build the most elaborate fort you can, then binge your favorite films together inside it.",     cat: "Cozy",      effort: "Low",    time: "3–4h",     budget: 0 },
  { id: 7,  emoji: "🍕", title: "Cook a New Recipe Together",  desc: "Pick something neither of you has cooked before. Embrace the mess — that's the point.",        cat: "Cozy",      effort: "Medium", time: "2h",       budget: 1 },
  { id: 8,  emoji: "🎲", title: "Board Games Night",           desc: "Pull out the board games. Keep score seriously. Loser makes the winner's next breakfast.",      cat: "Cozy",      effort: "Low",    time: "2h",       budget: 0 },
  { id: 9,  emoji: "📖", title: "Read the Same Book",          desc: "Pick a book and read it side by side — or aloud to each other. Discuss over tea after.",       cat: "Cozy",      effort: "Low",    time: "1–2h",     budget: 0 },
  { id: 10, emoji: "🍪", title: "Baking Day",                  desc: "Make cookies, cake, or bread together from scratch. Flour fights strongly encouraged.",         cat: "Cozy",      effort: "Medium", time: "2–3h",     budget: 1 },
  { id: 11, emoji: "🥾", title: "Hike a New Trail",            desc: "Find a trail neither of you has done. Pack snacks and talk without the usual distractions.",    cat: "Adventure", effort: "High",   time: "4–6h",     budget: 0 },
  { id: 12, emoji: "🚗", title: "Spontaneous Road Trip",       desc: "Pick a direction, drive for two hours, and explore whatever you discover together.",            cat: "Adventure", effort: "Medium", time: "Full day", budget: 2 },
  { id: 13, emoji: "🧗", title: "Try a New Sport",             desc: "Climbing wall, kayaking, cycling — something neither of you has done before. Be beginners.",    cat: "Adventure", effort: "High",   time: "3h",       budget: 2 },
  { id: 14, emoji: "🔐", title: "Escape Room Challenge",       desc: "Test your teamwork and communication under pressure. Celebrate afterwards, whatever the result.", cat: "Adventure", effort: "Medium", time: "2h",       budget: 2 },
  { id: 15, emoji: "⛺", title: "Camp Under Stars",            desc: "One night outside — tent, fire, sleeping bags, and stories. Disconnect to reconnect.",          cat: "Adventure", effort: "High",   time: "Overnight",budget: 1 },
  { id: 16, emoji: "🎤", title: "Karaoke Night",               desc: "Your living room or a private booth — belt out songs and laugh until it hurts.",                cat: "Fun",       effort: "Low",    time: "2h",       budget: 1 },
  { id: 17, emoji: "⛳", title: "Mini Golf Battle",            desc: "Keep score seriously. Trash talk is mandatory. Winner picks the next date night.",              cat: "Fun",       effort: "Low",    time: "2h",       budget: 1 },
  { id: 18, emoji: "🎳", title: "Bowling Date",                desc: "Retro, fun, and competitive. Add milkshakes after to make it even more iconic.",                cat: "Fun",       effort: "Low",    time: "2h",       budget: 1 },
  { id: 19, emoji: "🕹️", title: "Arcade Games Night",          desc: "Find a proper arcade. Spend tokens until you win each other something wonderfully silly.",      cat: "Fun",       effort: "Low",    time: "2h",       budget: 1 },
  { id: 20, emoji: "🎨", title: "Paint & Sip Night",           desc: "Buy canvases, wine, and a tutorial online. Paint the same thing — see who does it better.",    cat: "Fun",       effort: "Medium", time: "2h",       budget: 1 },
];

const CATS   = ["All", "Romantic", "Cozy", "Adventure", "Fun"];
const BUDGETS = ["Any", "Free", "Affordable", "Special"];

const CAT_CFG = {
  All:       { color: "#ff5c8a", bg: "rgba(255,92,138,0.1)" },
  Romantic:  { color: "#ff5c8a", bg: "rgba(255,92,138,0.1)" },
  Cozy:      { color: "#7c5cff", bg: "rgba(124,92,255,0.1)" },
  Adventure: { color: "#ff8c00", bg: "rgba(255,140,0,0.1)"  },
  Fun:       { color: "#32c36c", bg: "rgba(50,195,108,0.1)" },
};

const EFFORT_COLOR = { Low: "#32c36c", Medium: "#ffaa00", High: "#ff5252" };

const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

const filterPool = (cat, budget) => {
  let pool = cat === "All" ? DATE_IDEAS : DATE_IDEAS.filter((d) => d.cat === cat);
  if (budget !== "Any") {
    const idx = BUDGETS.indexOf(budget) - 1;
    pool = pool.filter((d) => d.budget === idx);
  }
  return pool.length >= 1 ? pool : DATE_IDEAS;
};

const DatePlanner = () => {
  const [cat, setCat]       = useState("All");
  const [budget, setBudget] = useState("Any");
  const [shown, setShown]   = useState(() => pick(DATE_IDEAS, 3));
  const [favs, setFavs]     = useState(() => {
    try { return JSON.parse(localStorage.getItem("cc_date_favs") || "[]"); }
    catch { return []; }
  });
  const [showFavs, setShowFavs] = useState(false);

  const shuffle = useCallback(() => {
    setShown(pick(filterPool(cat, budget), 3));
  }, [cat, budget]);

  const handleCat = (c) => {
    setCat(c);
    setShown(pick(filterPool(c, budget), 3));
  };

  const handleBudget = (b) => {
    setBudget(b);
    setShown(pick(filterPool(cat, b), 3));
  };

  const toggleFav = (id) => {
    setFavs((prev) => {
      const next = prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id];
      localStorage.setItem("cc_date_favs", JSON.stringify(next));
      return next;
    });
  };

  const displayIdeas = showFavs
    ? DATE_IDEAS.filter((d) => favs.includes(d.id))
    : shown;

  return (
    <section className="dp">
      <div className="dp__head">
        <div>
          <h2 className="dp__title">💑 Date Planner</h2>
          <p className="dp__sub">Curated ideas for every mood and budget</p>
        </div>
        <div className="dp__head-btns">
          <button
            className={`dp__favs-btn ${showFavs ? "dp__favs-btn--on" : ""}`}
            onClick={() => setShowFavs((p) => !p)}
          >
            ❤️ {favs.length}
          </button>
          {!showFavs && (
            <button className="dp__shuffle-btn" onClick={shuffle}>🎲 New</button>
          )}
        </div>
      </div>

      {!showFavs && (
        <>
          <div className="dp__cats">
            {CATS.map((c) => {
              const cc = CAT_CFG[c];
              return (
                <button
                  key={c}
                  className={`dp__cat ${cat === c ? "dp__cat--on" : ""}`}
                  style={cat === c ? { color: cc.color, background: cc.bg, borderColor: cc.color } : {}}
                  onClick={() => handleCat(c)}
                >
                  {c}
                </button>
              );
            })}
          </div>

          <div className="dp__budgets">
            {BUDGETS.map((b, bi) => (
              <button
                key={b}
                className={`dp__budget ${budget === b ? "dp__budget--on" : ""}`}
                onClick={() => handleBudget(b)}
              >
                {bi === 0 ? "💰 Any" : bi === 1 ? "🆓 Free" : bi === 2 ? "💸 Affordable" : "💎 Special"}
              </button>
            ))}
          </div>
        </>
      )}

      <div className="dp__list">
        {displayIdeas.length === 0 ? (
          <div className="dp__empty">
            <span className="dp__empty-ico">{showFavs ? "❤️" : "🔍"}</span>
            <p className="dp__empty-txt">
              {showFavs
                ? "No saved ideas yet. Tap ❤️ on any idea to save it."
                : "No ideas match these filters — try a different combination."}
            </p>
          </div>
        ) : (
          displayIdeas.map((idea) => {
            const cc = CAT_CFG[idea.cat];
            const isFav = favs.includes(idea.id);
            return (
              <div key={idea.id} className="dp-card">
                <div className="dp-card__top">
                  <div className="dp-card__ico-wrap" style={{ background: `${cc.color}18` }}>
                    <span className="dp-card__ico">{idea.emoji}</span>
                  </div>
                  <div className="dp-card__meta">
                    <span className="dp-card__cat" style={{ color: cc.color, background: cc.bg }}>{idea.cat}</span>
                    <span className="dp-card__time">⏱ {idea.time}</span>
                  </div>
                  <button
                    className="dp-card__fav-btn"
                    onClick={() => toggleFav(idea.id)}
                    aria-label={isFav ? "Remove from saved" : "Save idea"}
                  >
                    {isFav ? "❤️" : "🤍"}
                  </button>
                </div>
                <h3 className="dp-card__title">{idea.title}</h3>
                <p className="dp-card__desc">{idea.desc}</p>
                <div className="dp-card__footer">
                  <span className="dp-card__effort" style={{ color: EFFORT_COLOR[idea.effort] }}>
                    ● {idea.effort} effort
                  </span>
                  <span className="dp-card__budget">
                    {idea.budget === 0 ? "🆓 Free" : idea.budget === 1 ? "💸 Affordable" : "💎 Special"}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
};

export default DatePlanner;
