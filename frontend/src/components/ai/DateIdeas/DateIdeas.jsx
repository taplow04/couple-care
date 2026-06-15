import { useState, useCallback } from "react";
import "./DateIdeas.css";

const DATE_IDEAS = [
  { id: 1,  emoji: "🌅", title: "Sunset Picnic",        desc: "Pack your favorite snacks, find a scenic spot, and watch the sun melt into the horizon.",       cat: "Romantic",   effort: "Easy",   time: "2–3h" },
  { id: 2,  emoji: "🍳", title: "Cook Together",         desc: "Pick a new recipe neither of you has tried. The mess is half the fun.",                          cat: "Cozy",       effort: "Medium", time: "2–3h" },
  { id: 3,  emoji: "🎬", title: "Living Room Cinema",    desc: "Build a blanket fort, dim the lights, make popcorn, and lose yourselves in a trilogy.",          cat: "Cozy",       effort: "Easy",   time: "Evening" },
  { id: 4,  emoji: "🧗", title: "Try Something New",     desc: "Rock climbing, pottery, axe throwing — step out of your comfort zones together.",                cat: "Adventure",  effort: "Active", time: "3–4h" },
  { id: 5,  emoji: "🌿", title: "Nature Walk",           desc: "Find a trail you've never been on. Bring a camera and no agenda.",                               cat: "Adventure",  effort: "Easy",   time: "2–3h" },
  { id: 6,  emoji: "🎨", title: "Paint Night",           desc: "Set up canvases at home and paint each other's portrait. No talent required — just laughter.",   cat: "Creative",   effort: "Medium", time: "2h" },
  { id: 7,  emoji: "⭐", title: "Stargazing",            desc: "Drive somewhere dark, lay out blankets, and find constellations while talking about everything.", cat: "Romantic",   effort: "Easy",   time: "2–3h" },
  { id: 8,  emoji: "📚", title: "Bookstore Date",        desc: "Each pick 3 books for the other to read. Grab coffee and spend an hour comparing choices.",      cat: "Cozy",       effort: "Easy",   time: "2h" },
  { id: 9,  emoji: "🎭", title: "Comedy Night",          desc: "Find a local improv show or play 'yes and' at home. Guaranteed to bring you closer.",            cat: "Fun",        effort: "Easy",   time: "2h" },
  { id: 10, emoji: "💆", title: "Spa Night In",          desc: "Trade massages, face masks, candles, and your favorite chill playlist.",                         cat: "Romantic",   effort: "Easy",   time: "2h" },
  { id: 11, emoji: "🌊", title: "Beach Day",             desc: "Pack towels, snacks, sunscreen, and a speaker. No plans — just the sea.",                        cat: "Adventure",  effort: "Active", time: "Full day" },
  { id: 12, emoji: "🍕", title: "Homemade Pizza",        desc: "Make pizzas from scratch. Go wild with toppings and vote on whose is better.",                   cat: "Cozy",       effort: "Medium", time: "2h" },
  { id: 13, emoji: "🎮", title: "Game Night",            desc: "Board games, video games, card games — keep score. Trash talk is encouraged.",                   cat: "Fun",        effort: "Easy",   time: "2–3h" },
  { id: 14, emoji: "🌃", title: "City Night Walk",       desc: "Explore a neighborhood you've never been to after dark. Get intentionally lost.",                 cat: "Adventure",  effort: "Easy",   time: "2h" },
  { id: 15, emoji: "🥂", title: "Wine & Cheese Night",   desc: "Create a tasting board, open a special bottle, and just talk — no phones.",                     cat: "Romantic",   effort: "Easy",   time: "2h" },
  { id: 16, emoji: "🌸", title: "Farmers Market Morning","desc": "Explore a local market and cook a full meal from what you find.",                              cat: "Adventure",  effort: "Easy",   time: "Half day" },
  { id: 17, emoji: "✍️", title: "Letter Exchange",       desc: "Write each other heartfelt letters. Take turns reading them aloud.",                             cat: "Deep",       effort: "Easy",   time: "1h" },
  { id: 18, emoji: "🧩", title: "Puzzle Night",          desc: "Pick a 1000-piece puzzle and work on it over wine. No bedtime until it's done.",                 cat: "Cozy",       effort: "Easy",   time: "Evening" },
  { id: 19, emoji: "🎵", title: "Live Music Night",      desc: "Find a local gig — any genre. There's something magical about live music together.",             cat: "Fun",        effort: "Medium", time: "3–4h" },
  { id: 20, emoji: "🚴", title: "Bike Ride Exploration", desc: "Rent bikes and explore somewhere new. Stop wherever looks interesting.",                          cat: "Adventure",  effort: "Active", time: "2–3h" },
];

const CAT_COLOR = {
  Romantic:  { color: "#ff5c8a", bg: "rgba(255,92,138,0.1)" },
  Cozy:      { color: "#ffaa00", bg: "rgba(255,170,0,0.1)" },
  Adventure: { color: "#32c36c", bg: "rgba(50,195,108,0.1)" },
  Fun:       { color: "#7c5cff", bg: "rgba(124,92,255,0.1)" },
  Creative:  { color: "#ff7043", bg: "rgba(255,112,67,0.1)" },
  Deep:      { color: "#4a90d9", bg: "rgba(74,144,217,0.1)" },
};

const pick = (arr, n) => [...arr].sort(() => Math.random() - 0.5).slice(0, n);

const DateIdeas = () => {
  const [shown, setShown] = useState(() => pick(DATE_IDEAS, 3));
  const [refreshed, setRefreshed] = useState(false);

  const handleRefresh = useCallback(() => {
    setShown(pick(DATE_IDEAS, 3));
    setRefreshed(true);
    setTimeout(() => setRefreshed(false), 1200);
  }, []);

  return (
    <section className="di">
      <div className="di__head">
        <div className="di__title-row">
          <span className="di__title-icon">💑</span>
          <div>
            <h2 className="di__title">Date Ideas</h2>
            <p className="di__sub">Curated for you</p>
          </div>
        </div>
        <button
          className={`di__refresh-btn ${refreshed ? "di__refresh-btn--done" : ""}`}
          onClick={handleRefresh}
          aria-label="Get new date ideas"
        >
          {refreshed ? "✓ Refreshed!" : "🎲 New Ideas"}
        </button>
      </div>

      <div className="di__list">
        {shown.map((idea) => {
          const cc = CAT_COLOR[idea.cat] ?? CAT_COLOR.Fun;
          return (
            <div key={idea.id} className="di-card">
              <div className="di-card__emoji-wrap" style={{ background: cc.bg }}>
                <span className="di-card__emoji">{idea.emoji}</span>
              </div>
              <div className="di-card__body">
                <div className="di-card__top-row">
                  <h3 className="di-card__title">{idea.title}</h3>
                  <span className="di-card__cat" style={{ color: cc.color, background: cc.bg }}>
                    {idea.cat}
                  </span>
                </div>
                <p className="di-card__desc">{idea.desc}</p>
                <div className="di-card__meta">
                  <span className="di-card__tag">⏱ {idea.time}</span>
                  <span className="di-card__tag">💪 {idea.effort}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default DateIdeas;
