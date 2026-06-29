import { useCallback, useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

import BackHeader from "../../components/common/BackHeader/BackHeader";
import Loader from "../../components/common/Loader/Loader";
import {
  getMomentTimeline,
  getMomentByDay,
  getMonthlyReplay,
  getYearlyReplay,
} from "../../services/dailyMoment.service";
import "./OurDayPage.css";

const longDay = (day) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
const shortDay = (day) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

/* ── Stat chip ─────────────────────────────────────────────────── */
const Chip = ({ icon, value, label }) => (
  <div className="od-chip">
    <span className="od-chip__icon">{icon}</span>
    <span className="od-chip__value">{value}</span>
    <span className="od-chip__label">{label}</span>
  </div>
);

/* ── Full recap for one day ────────────────────────────────────── */
const RecapDetail = ({ day, onBack }) => {
  const [recap, setRecap] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Mounted with key={day}, so this fetches exactly once per day (no synchronous
  // setState in the effect body — react-compiler safe).
  useEffect(() => {
    let active = true;
    getMomentByDay(day)
      .then((res) => active && setRecap(res.data))
      .catch(() => active && setError(true))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [day]);

  if (loading) return <Loader />;
  if (error || !recap)
    return (
      <div className="od-empty">
        <span className="od-empty__emoji">📭</span>
        <p>No Couple Moment was created for this day.</p>
        <button className="od-btn" onClick={onBack}>
          Back to timeline
        </button>
      </div>
    );

  const c = recap.counts || {};
  return (
    <div className="od-recap">
      <button className="od-recap__back" onClick={onBack}>
        ← All days
      </button>

      <div
        className="od-hero"
        style={recap.coverUrl ? { backgroundImage: `url(${recap.coverUrl})` } : undefined}
      >
        <div className="od-hero__veil" />
        <div className="od-hero__text">
          <span className="od-hero__badge">❤️ Our Day</span>
          <h2 className="od-hero__date">{longDay(recap.day)}</h2>
        </div>
      </div>

      <div className="od-chips">
        <Chip icon="📸" value={c.moments || 0} label="Moments" />
        <Chip icon="🎥" value={c.videos || 0} label="Videos" />
        <Chip icon="🎙️" value={c.voices || 0} label="Voice" />
        <Chip icon="💬" value={recap.messageCount || 0} label="Messages" />
        {recap.topMood && (
          <Chip icon={recap.topMoodEmoji || "🙂"} value={recap.topMood} label="Mood" />
        )}
        {recap.streak > 0 && <Chip icon="🔥" value={recap.streak} label="Streak" />}
        <Chip icon="⭐" value={`+${recap.xpAwarded || 0}`} label="XP" />
      </div>

      {recap.ai?.summary && (
        <blockquote className="od-summary">
          {recap.ai.summary}
          <cite>— CoupleCare AI</cite>
        </blockquote>
      )}

      {recap.moments?.length > 0 && (
        <>
          <h3 className="od-section-title">The moments you shared</h3>
          <div className="od-grid">
            {recap.moments.map((m) => (
              <div key={m._id} className="od-tile">
                <img
                  src={m.thumbnailUrl || m.mediaUrl}
                  alt={m.author?.name ? `Moment by ${m.author.name}` : "Moment"}
                  loading="lazy"
                />
                {m.type === "video" && <span className="od-tile__play">▶</span>}
                {m.type === "voice" && <span className="od-tile__play">🎙️</span>}
                {m.author?.name && (
                  <span className="od-tile__author">{m.author.name.split(" ")[0]}</span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/* ── Replay panel (monthly / yearly) ───────────────────────────── */
const ReplayPanel = ({ scope, onClose }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mounted with key={scope} — fetches once per scope (no synchronous setState).
  useEffect(() => {
    const now = new Date();
    const fetcher =
      scope === "year"
        ? getYearlyReplay(now.getUTCFullYear())
        : getMonthlyReplay(now.getUTCFullYear(), now.getUTCMonth() + 1);
    let active = true;
    fetcher
      .then((res) => active && setData(res.data))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [scope]);

  const t = data?.totals || {};
  return (
    <div className="od-replay" role="dialog" aria-modal="true">
      <div className="od-replay__sheet">
        <button className="od-replay__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {loading ? (
          <Loader />
        ) : !data || data.daysWithMoment === 0 ? (
          <div className="od-empty">
            <span className="od-empty__emoji">🌱</span>
            <p>
              No shared days yet this {scope}. Keep sharing Moments together to
              fill your replay!
            </p>
          </div>
        ) : (
          <>
            <h2 className="od-replay__title">
              ❤️ {scope === "year" ? "Our Year" : data.label}
            </h2>
            <p className="od-replay__sub">
              {data.daysWithMoment} day{data.daysWithMoment === 1 ? "" : "s"} you
              both showed up
            </p>
            <div className="od-replay__grid">
              <Chip icon="📸" value={t.moments || 0} label="Moments" />
              <Chip icon="🎥" value={t.videos || 0} label="Videos" />
              <Chip icon="💬" value={t.messages || 0} label="Messages" />
              <Chip icon="⭐" value={t.xp || 0} label="XP earned" />
              {data.mostCommonMood && (
                <Chip
                  icon={data.mostCommonMoodEmoji || "🙂"}
                  value={data.mostCommonMood}
                  label="Top mood"
                />
              )}
              <Chip icon="🔥" value={data.longestStreak || 0} label="Best streak" />
            </div>

            {scope === "year" && (
              <div className="od-replay__highlights">
                {data.happiestMonth && (
                  <p>
                    😊 Happiest month: <strong>{data.happiestMonth}</strong>
                  </p>
                )}
                {data.bestTrip && (
                  <p>
                    🏖 Best trip: <strong>{data.bestTrip.title}</strong>
                  </p>
                )}
                {data.favoriteMemory && (
                  <p>
                    💖 A favorite memory: <strong>{data.favoriteMemory.title}</strong>
                  </p>
                )}
              </div>
            )}
            {scope === "month" && data.biggestAchievement && (
              <div className="od-replay__highlights">
                <p>
                  🏆 Biggest win: {data.biggestAchievement.emoji}{" "}
                  <strong>{data.biggestAchievement.title}</strong>
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

/* ── Page ──────────────────────────────────────────────────────── */
const OurDayPage = () => {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const day = params.get("day");
  // Deep-link support: /our-day?replay=month|year opens the replay immediately
  // (used by the dashboard Quick Access shortcuts). Seeded once from the URL.
  const replayParam = params.get("replay");

  const [items, setItems] = useState(null);
  const [replay, setReplay] = useState(
    replayParam === "month" || replayParam === "year" ? replayParam : null,
  ); // "month" | "year" | null

  const loadTimeline = useCallback(() => {
    let active = true;
    getMomentTimeline({ limit: 90 })
      .then((res) => active && setItems(res.data || []))
      .catch(() => active && setItems([]));
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!day) return loadTimeline();
  }, [day, loadTimeline]);

  const openDay = (d) => setParams({ day: d });
  const backToTimeline = () => {
    setParams({});
    navigate("/our-day", { replace: true });
  };

  return (
    <div className="ourday-page">
      <BackHeader
        title="Our Days"
        subtitle="Every shared day, kept forever"
        fallback="/dashboard"
      />

      <div className="ourday-page__content">
        {day ? (
          <RecapDetail key={day} day={day} onBack={backToTimeline} />
        ) : (
          <>
            <div className="od-replays">
              <button className="od-replay-btn" onClick={() => setReplay("month")}>
                <span>🗓️</span> This Month
              </button>
              <button
                className="od-replay-btn od-replay-btn--year"
                onClick={() => setReplay("year")}
              >
                <span>✨</span> Our Year
              </button>
            </div>

            {items === null ? (
              <Loader />
            ) : items.length === 0 ? (
              <div className="od-empty">
                <span className="od-empty__emoji">❤️</span>
                <h3>No shared days yet</h3>
                <p>
                  When you and your partner both share a Moment on the same day, it
                  becomes a lasting memory here.
                </p>
                <button className="od-btn" onClick={() => navigate("/moments")}>
                  Share a Moment
                </button>
              </div>
            ) : (
              <ul className="od-timeline">
                {items.map((it) => (
                  <li key={it._id} className="od-timeline__item">
                    <button className="od-timeline__btn" onClick={() => openDay(it.day)}>
                      <div
                        className="od-timeline__thumb"
                        style={
                          it.coverUrl ? { backgroundImage: `url(${it.coverUrl})` } : undefined
                        }
                      >
                        {!it.coverUrl && <span>❤️</span>}
                      </div>
                      <div className="od-timeline__body">
                        <span className="od-timeline__date">{shortDay(it.day)}</span>
                        <span className="od-timeline__meta">
                          📸 {it.counts?.moments || 0} · 💬 {it.messageCount || 0}
                          {it.topMood ? ` · ${it.topMoodEmoji || ""}` : ""}
                        </span>
                        {it.ai?.summary && (
                          <span className="od-timeline__summary">{it.ai.summary}</span>
                        )}
                      </div>
                      <span className="od-timeline__chev">›</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {replay && (
        <ReplayPanel key={replay} scope={replay} onClose={() => setReplay(null)} />
      )}
    </div>
  );
};

export default OurDayPage;
