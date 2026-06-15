import { useRef, useEffect } from "react";
import "./MilestoneProgress.css";

const MILESTONES = [
  { days: 30,   label: "1 Month",  emoji: "🌹" },
  { days: 90,   label: "3 Months", emoji: "💑" },
  { days: 180,  label: "6 Months", emoji: "💎" },
  { days: 365,  label: "1 Year",   emoji: "🎊" },
  { days: 730,  label: "2 Years",  emoji: "💍" },
  { days: 1095, label: "3 Years",  emoji: "🌟" },
  { days: 1825, label: "5 Years",  emoji: "👑" },
];

const MilestoneProgress = ({ daysTogether }) => {
  const trackRef = useRef(null);
  const nextIdx  = MILESTONES.findIndex((m) => daysTogether < m.days);
  const achieved = nextIdx === -1 ? MILESTONES.length : nextIdx;

  const fillPct =
    nextIdx === -1
      ? 100
      : nextIdx === 0
      ? Math.min((daysTogether / MILESTONES[0].days) * (1 / (MILESTONES.length - 1)) * 100, 100)
      : (() => {
          const prev = MILESTONES[nextIdx - 1].days;
          const next = MILESTONES[nextIdx].days;
          const seg  = (daysTogether - prev) / (next - prev);
          return ((nextIdx - 1 + seg) / (MILESTONES.length - 1)) * 100;
        })();

  useEffect(() => {
    if (!trackRef.current || nextIdx === -1) return;
    const container = trackRef.current;
    const nodes = container.querySelectorAll(".mp__node");
    if (nodes[nextIdx]) {
      nodes[nextIdx].scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
  }, [nextIdx]);

  return (
    <section className="mp">
      <div className="mp__header">
        <h2 className="mp__title">Milestones</h2>
        <span className="mp__count">
          {achieved}/{MILESTONES.length} reached
        </span>
      </div>

      <div className="mp__scroll-wrap">
        <div className="mp__track" ref={trackRef}>
          <div className="mp__line-bg" />
          <div
            className="mp__line-fill"
            style={{ width: `${fillPct}%` }}
          />

          {MILESTONES.map((m, i) => {
            const done = daysTogether >= m.days;
            const isNext = i === nextIdx;

            return (
              <div
                key={m.days}
                className={`mp__node ${done ? "mp__node--done" : isNext ? "mp__node--next" : ""}`}
              >
                <div className={`mp__circle ${done ? "mp__circle--done" : isNext ? "mp__circle--next" : ""}`}>
                  {done ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="mp__check">
                      <path d="M20 6L9 17L4 12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : (
                    <span className="mp__emoji">{m.emoji}</span>
                  )}
                </div>
                <span className="mp__emoji-done">{done ? m.emoji : ""}</span>
                <span className="mp__label">{m.label}</span>
                {isNext && (
                  <span className="mp__days-left">
                    {m.days - daysTogether}d left
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MilestoneProgress;
