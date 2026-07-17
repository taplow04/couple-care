import { useEffect, useState } from "react";

import BackHeader from "../../../components/common/BackHeader/BackHeader";
import { getRelationshipTimeline } from "../../../services/intelligence.service";

import "./TimelinePage.css";

const PERIODS = [
  { key: "daily", label: "Today" },
  { key: "weekly", label: "Week" },
  { key: "monthly", label: "Month" },
  { key: "yearly", label: "Year" },
];

const COUNT_META = [
  { key: "messages", label: "Messages", emoji: "💬" },
  { key: "moods", label: "Moods", emoji: "😊" },
  { key: "moments", label: "Stories", emoji: "📷" },
  { key: "memories", label: "Memories", emoji: "📔" },
  { key: "calls", label: "Calls", emoji: "📞" },
  { key: "achievements", label: "Milestones", emoji: "🎉" },
];

const CHAPTER_EMOJI = {
  memory: "📔",
  daily_moment: "❤️",
  achievement: "🏆",
};

const fmtDate = (at) => {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return String(at);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
};

// Child remounted via key={period} — fresh loading state per switch.
const TimelineBody = ({ period }) => {
  const [recap, setRecap] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    getRelationshipTimeline(period)
      .then((res) => {
        if (active) setRecap(res.data || null);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [period]);

  if (failed) return <div className="tl-card tl-empty">The timeline isn't available right now — try again in a moment.</div>;
  if (!recap) return <div className="tl-skeleton" />;

  const counts = COUNT_META.filter((c) => (recap.counts?.[c.key] || 0) > 0);
  const quiet = !counts.length && !(recap.chapters || []).length;

  return (
    <div>
      {(recap.highlights || []).length > 0 && (
        <div className="tl-card tl-highlights">
          {recap.highlights.map((h) => (
            <div key={h} className="tl-highlight">
              {h}
            </div>
          ))}
        </div>
      )}

      {counts.length > 0 && (
        <div className="tl-card">
          <h3 className="tl-card__title">By the numbers</h3>
          <div className="tl-counts">
            {counts.map((c) => (
              <div key={c.key} className="tl-count">
                <span className="tl-count__emoji" aria-hidden="true">{c.emoji}</span>
                <strong>{recap.counts[c.key]}</strong>
                <span>{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {(recap.chapters || []).length > 0 && (
        <div className="tl-card">
          <h3 className="tl-card__title">Chapters</h3>
          <ol className="tl-chapters">
            {recap.chapters.map((ch, i) => (
              <li key={`${ch.kind}-${ch.at}-${i}`} className="tl-chapter">
                <span className="tl-chapter__dot" aria-hidden="true">{CHAPTER_EMOJI[ch.kind] || "✨"}</span>
                <div className="tl-chapter__body">
                  <span className="tl-chapter__title">{ch.title}</span>
                  <span className="tl-chapter__date">{fmtDate(ch.at)}</span>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {quiet && (
        <div className="tl-card tl-empty">
          A quiet {period === "daily" ? "day" : period.replace("ly", "")} so far — every message, mood,
          story and memory you share will show up here automatically. 💕
        </div>
      )}
    </div>
  );
};

const TimelinePage = () => {
  const [period, setPeriod] = useState("daily");

  return (
    <div className="tl-page">
      <BackHeader
        title="Your Story, Daily"
        subtitle="An automatic recap of life together"
        fallback="/dashboard"
      />
      <div className="tl-page__content">
        <div className="tl-periods" role="tablist">
          {PERIODS.map((p) => (
            <button
              key={p.key}
              role="tab"
              aria-selected={period === p.key}
              className={`tl-period ${period === p.key ? "tl-period--active" : ""}`}
              onClick={() => setPeriod(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>
        <TimelineBody key={period} period={period} />
        <p className="tl-privacy">
          🔒 Assembled only from what you both share inside CoupleCare — nothing
          is read from any other app.
        </p>
      </div>
    </div>
  );
};

export default TimelinePage;
