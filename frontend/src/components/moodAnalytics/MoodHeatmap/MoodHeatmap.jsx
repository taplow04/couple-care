import "./MoodHeatmap.css";

const MOOD_TYPES = ["happy", "loved", "excited", "sad", "anxious", "stressed", "angry"];
const DAYS       = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MOOD_META = {
  happy:   { emoji: "😊", rgba: "255,170,0" },
  loved:   { emoji: "🥰", rgba: "255,92,138" },
  excited: { emoji: "🤩", rgba: "124,92,255" },
  sad:     { emoji: "😔", rgba: "74,144,217" },
  anxious: { emoji: "😰", rgba: "50,195,108" },
  stressed:{ emoji: "😤", rgba: "255,112,67" },
  angry:   { emoji: "😠", rgba: "255,82,82" },
};

/* JS day index: 0=Sun, 1=Mon…6=Sat → map to our DAYS array (0=Mon) */
const dayToIdx = (jsDay) => (jsDay === 0 ? 6 : jsDay - 1);

const buildGrid = (moods) => {
  const grid = {};
  MOOD_TYPES.forEach((mt) => {
    grid[mt] = Array(7).fill(0);
  });

  moods.forEach((m) => {
    const di = dayToIdx(new Date(m.createdAt).getDay());
    if (grid[m.moodType]) grid[m.moodType][di]++;
  });

  const maxCount = Math.max(1, ...MOOD_TYPES.flatMap((mt) => grid[mt]));
  return { grid, maxCount };
};

const MoodHeatmap = ({ myMoods }) => {
  const moods = myMoods ?? [];

  if (moods.length < 3) {
    return (
      <div className="mhm">
        <h2 className="mhm__title">Weekly Patterns</h2>
        <div className="mhm__empty">
          <span className="mhm__empty-emoji">🗓️</span>
          <p className="mhm__empty-text">Log at least 3 moods to reveal your weekly patterns.</p>
        </div>
      </div>
    );
  }

  const { grid, maxCount } = buildGrid(moods);

  return (
    <div className="mhm">
      <div className="mhm__head">
        <h2 className="mhm__title">Weekly Patterns</h2>
        <p className="mhm__sub">{moods.length} entries</p>
      </div>

      <div className="mhm__card">
        <div className="mhm__grid-wrap">
          {/* Day headers */}
          <div className="mhm__corner" />
          {DAYS.map((d) => (
            <div key={d} className="mhm__day-header">{d}</div>
          ))}

          {/* Rows: one per mood type */}
          {MOOD_TYPES.map((mt) => {
            const meta = MOOD_META[mt];
            return [
              <div key={`row-${mt}`} className="mhm__row-label">
                <span className="mhm__row-emoji">{meta.emoji}</span>
              </div>,
              ...DAYS.map((_, di) => {
                const count = grid[mt][di];
                const alpha = count === 0
                  ? 0
                  : 0.15 + (count / maxCount) * 0.75;
                return (
                  <div
                    key={`${mt}-${di}`}
                    className={`mhm__cell ${count > 0 ? "mhm__cell--active" : ""}`}
                    style={{
                      background: count > 0
                        ? `rgba(${meta.rgba},${alpha.toFixed(2)})`
                        : "transparent",
                    }}
                    title={count > 0 ? `${DAYS[di]}: ${count} ${mt}` : undefined}
                  >
                    {count > 0 && (
                      <span className="mhm__cell-count">{count}</span>
                    )}
                  </div>
                );
              }),
            ];
          })}
        </div>

        <div className="mhm__legend">
          <span className="mhm__legend-text">Less</span>
          <div className="mhm__legend-scale">
            {[0.1, 0.3, 0.55, 0.75, 0.9].map((a) => (
              <div
                key={a}
                className="mhm__legend-dot"
                style={{ background: `rgba(255,92,138,${a})` }}
              />
            ))}
          </div>
          <span className="mhm__legend-text">More</span>
        </div>
      </div>
    </div>
  );
};

export default MoodHeatmap;
