import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";

import BackHeader from "../../components/common/BackHeader/BackHeader";
import {
  getTodayMoment,
  getMomentTimeline,
  getMonthlyReplay,
  getYearlyReplay,
} from "../../services/dailyMoment.service";
import { getDashboard } from "../../services/dashboard.service";
import "./OurMomentsPage.css";

const TABS = [
  { key: "today", label: "Today", icon: "❤️" },
  { key: "month", label: "This Month", icon: "📅" },
  { key: "year", label: "This Year", icon: "🗓" },
  { key: "timeline", label: "Timeline", icon: "📖" },
];

const MOOD_EMOJI = {
  happy: "😊", sad: "😢", angry: "😠", stressed: "😣",
  loved: "🥰", excited: "🤩", anxious: "😰",
};

const shortDay = (day) =>
  new Date(`${day}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" });

// ── Shared bits ──
const Chip = ({ icon, value, label }) => (
  <div className="om-chip">
    <span className="om-chip__icon">{icon}</span>
    <span className="om-chip__value">{value}</span>
    <span className="om-chip__label">{label}</span>
  </div>
);

const SectionTitle = ({ children }) => <h3 className="om-section-title">{children}</h3>;

const Loading = () => (
  <div className="om-skeletons">
    {[1, 2, 3].map((s) => <div key={s} className="om-sk" />)}
  </div>
);

const Empty = ({ emoji, title, text, action, onAction }) => (
  <div className="om-empty">
    <span className="om-empty__emoji">{emoji}</span>
    {title && <h3 className="om-empty__title">{title}</h3>}
    {text && <p className="om-empty__text">{text}</p>}
    {action && <button className="om-btn" onClick={onAction}>{action}</button>}
  </div>
);

const AISummary = ({ text, label = "CoupleCare AI" }) =>
  text ? (
    <blockquote className="om-summary">
      <span className="om-summary__spark">✨</span>
      {text}
      <cite>— {label}</cite>
    </blockquote>
  ) : null;

// ── Today ──
const TodayTab = () => {
  const navigate = useNavigate();
  const [today, setToday] = useState(null);
  const [dash, setDash] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([getTodayMoment(), getDashboard()])
      .then(([t, d]) => {
        if (!active) return;
        if (t.status === "fulfilled") setToday(t.value.data);
        if (d.status === "fulfilled") setDash(d.value.data);
      })
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (loading) return <Loading />;

  const recap = today || {};
  const c = recap.counts || {};
  const hasRecap = recap.exists || recap.finalized || (c.moments || 0) > 0;

  const eng = dash?.engagement || {};
  const loveMeter = dash?.loveMeter ?? dash?.health?.score ?? null;
  const analytics = dash?.moodAnalytics || {};
  const topMood =
    recap.topMood ||
    Object.entries(analytics)
      .filter(([k]) => k !== "averageIntensity")
      .sort((a, b) => b[1] - a[1])[0]?.[0] ||
    null;
  const xpToday = recap.xpAwarded ?? 0;

  return (
    <div className="om-tab">
      {/* Today's Couple Moment */}
      <div
        className="om-hero"
        style={recap.coverUrl ? { backgroundImage: `url(${recap.coverUrl})` } : undefined}
      >
        <div className="om-hero__veil" />
        <div className="om-hero__text">
          <span className="om-hero__badge">❤️ Our Day</span>
          <h2 className="om-hero__title">
            {hasRecap ? "Today, together" : "Your day is unfolding"}
          </h2>
          <p className="om-hero__sub">
            {new Date().toLocaleDateString("en-US", {
              weekday: "long", month: "long", day: "numeric",
            })}
          </p>
        </div>
      </div>

      <AISummary text={recap.ai?.summary} />

      {/* Today's numbers */}
      <div className="om-chips">
        <Chip icon="📸" value={c.moments || 0} label="Stories" />
        <Chip icon="🖼️" value={c.photos || 0} label="Photos" />
        <Chip icon="🎥" value={c.videos || 0} label="Videos" />
        <Chip icon="💬" value={recap.messageCount || 0} label="Messages" />
        {topMood && <Chip icon={MOOD_EMOJI[topMood] || "🙂"} value={topMood} label="Mood" />}
        <Chip icon="⭐" value={`+${xpToday}`} label="XP today" />
      </div>

      {/* Love meter + growth */}
      <div className="om-cards-2">
        <div className="om-mini-card">
          <span className="om-mini-card__label">💗 Love Meter</span>
          <span className="om-mini-card__value">
            {loveMeter != null ? `${Math.round(loveMeter)}%` : "—"}
          </span>
          <div className="om-bar">
            <div className="om-bar__fill" style={{ width: `${Math.round(loveMeter || 0)}%` }} />
          </div>
        </div>
        <div className="om-mini-card">
          <span className="om-mini-card__label">🔥 Streak</span>
          <span className="om-mini-card__value">{eng.currentStreak ?? 0} days</span>
          <span className="om-mini-card__hint">Level {eng.level ?? 1} · {eng.totalXP ?? 0} XP</span>
        </div>
      </div>

      {!hasRecap && (
        <Empty
          emoji="💞"
          text="When you and your partner both share a Moment today, it becomes a lasting recap here."
          action="Share a Moment"
          onAction={() => navigate("/moments")}
        />
      )}
    </div>
  );
};

// ── This Month ──
const MonthTab = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    let active = true;
    getMonthlyReplay(now.getUTCFullYear(), now.getUTCMonth() + 1)
      .then((res) => active && setData(res.data))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (loading) return <Loading />;
  const t = data?.totals || {};
  const hasData = data && data.daysWithMoment > 0;

  return (
    <div className="om-tab">
      <div className="om-hero om-hero--month">
        <div className="om-hero__text">
          <span className="om-hero__badge">📅 {data?.label || "This Month"}</span>
          <h2 className="om-hero__title">
            {hasData ? `${data.daysWithMoment} shared days` : "This month so far"}
          </h2>
        </div>
      </div>

      <AISummary text={data?.ai?.summary} label="AI Monthly Recap" />

      <div className="om-chips">
        <Chip icon="📸" value={t.moments || 0} label="Moments" />
        <Chip icon="🎥" value={t.videos || 0} label="Videos" />
        <Chip icon="💬" value={t.messages || 0} label="Messages" />
        <Chip icon="⭐" value={t.xp || 0} label="XP" />
        {data?.mostCommonMood && (
          <Chip icon={MOOD_EMOJI[data.mostCommonMood] || "🙂"} value={data.mostCommonMood} label="Top mood" />
        )}
        <Chip icon="🔥" value={data?.longestStreak || 0} label="Best streak" />
      </div>

      {data?.biggestAchievement && (
        <div className="om-highlight">
          🏆 Biggest win: {data.biggestAchievement.emoji}{" "}
          <strong>{data.biggestAchievement.title}</strong>
        </div>
      )}

      <SectionTitle>Go deeper</SectionTitle>
      <div className="om-links">
        {[
          { to: "/memories", emoji: "📷", label: "Memories" },
          { to: "/mood-analytics", emoji: "📊", label: "Mood Analytics" },
          { to: "/bucket-list", emoji: "🪄", label: "Bucket Goals" },
          { to: "/journey", emoji: "🧭", label: "Relationship Growth" },
        ].map((l) => (
          <button key={l.to} className="om-link" onClick={() => navigate(l.to)}>
            <span>{l.emoji} {l.label}</span>
            <span className="om-link__chev">›</span>
          </button>
        ))}
      </div>

      {!hasData && (
        <Empty emoji="🌱" text="Keep sharing Moments together to fill this month's recap." />
      )}
    </div>
  );
};

// ── This Year ──
const YearTab = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    let active = true;
    getYearlyReplay(now.getUTCFullYear())
      .then((res) => active && setData(res.data))
      .catch(() => active && setData(null))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  if (loading) return <Loading />;
  const t = data?.totals || {};
  const hasData = data && data.daysWithMoment > 0;

  return (
    <div className="om-tab">
      <div className="om-hero om-hero--year">
        <div className="om-hero__text">
          <span className="om-hero__badge">✨ Our Year {new Date().getFullYear()}</span>
          <h2 className="om-hero__title">
            {hasData ? `${data.daysWithMoment} days you both showed up` : "Your year in love"}
          </h2>
        </div>
      </div>

      <AISummary text={data?.ai?.summary} label="AI Yearbook" />

      <div className="om-chips">
        <Chip icon="📸" value={t.moments || 0} label="Moments" />
        <Chip icon="🎥" value={t.videos || 0} label="Videos" />
        <Chip icon="💬" value={t.messages || 0} label="Messages" />
        <Chip icon="⭐" value={t.xp || 0} label="XP earned" />
        {data?.mostCommonMood && (
          <Chip icon={MOOD_EMOJI[data.mostCommonMood] || "🙂"} value={data.mostCommonMood} label="Top mood" />
        )}
        <Chip icon="🔥" value={data?.longestStreak || 0} label="Best streak" />
      </div>

      {(data?.happiestMonth || data?.bestTrip || data?.favoriteMemory) && (
        <>
          <SectionTitle>Best moments</SectionTitle>
          <div className="om-best">
            {data.happiestMonth && (
              <div className="om-best__row">😊 Happiest month <strong>{data.happiestMonth}</strong></div>
            )}
            {data.bestTrip && (
              <div className="om-best__row">🏖 Best trip <strong>{data.bestTrip.title}</strong></div>
            )}
            {data.favoriteMemory && (
              <div className="om-best__row">💖 Most loved memory <strong>{data.favoriteMemory.title}</strong></div>
            )}
          </div>
        </>
      )}

      <div className="om-links">
        <button className="om-link" onClick={() => navigate("/journey")}>
          <span>🧭 Full Relationship Journey</span>
          <span className="om-link__chev">›</span>
        </button>
      </div>

      {!hasData && (
        <Empty emoji="🌅" text="Your yearly replay fills up as you share days together. It's just getting started." />
      )}
    </div>
  );
};

// ── Timeline ──
const RELATIVE_ORDER = ["Today", "Yesterday", "Last Week", "Last Month"];

const bucketFor = (day) => {
  const d = new Date(`${day}T00:00:00`);
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.floor((startToday - d) / 86400000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 7) return "Last Week";
  if (diff <= 31) return "Last Month";
  return String(d.getFullYear());
};

const TimelineTab = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState(null);

  useEffect(() => {
    let active = true;
    getMomentTimeline({ limit: 150 })
      .then((res) => active && setItems(res.data || []))
      .catch(() => active && setItems([]));
    return () => { active = false; };
  }, []);

  if (items === null) return <Loading />;
  if (!items.length) {
    return (
      <Empty
        emoji="📖"
        title="Your story starts here"
        text="Every day you and your partner both share a Moment becomes a chapter in this timeline."
        action="Share a Moment"
        onAction={() => navigate("/moments")}
      />
    );
  }

  // Group newest-first items into ordered buckets.
  const groups = {};
  for (const it of items) {
    const b = bucketFor(it.day);
    (groups[b] = groups[b] || []).push(it);
  }
  const years = Object.keys(groups)
    .filter((k) => !RELATIVE_ORDER.includes(k))
    .sort((a, b) => Number(b) - Number(a));
  const order = [...RELATIVE_ORDER.filter((k) => groups[k]), ...years];

  return (
    <div className="om-tab">
      {order.map((bucket, i) => (
        <details key={bucket} className="om-group" open={i < 2}>
          <summary className="om-group__summary">
            <span>{bucket}</span>
            <span className="om-group__count">{groups[bucket].length}</span>
          </summary>
          <ul className="om-timeline">
            {groups[bucket].map((it) => (
              <li key={it._id} className="om-timeline__item">
                <button
                  className="om-timeline__btn"
                  onClick={() => navigate(`/our-day?day=${it.day}`)}
                >
                  <span
                    className="om-timeline__thumb"
                    style={it.coverUrl ? { backgroundImage: `url(${it.coverUrl})` } : undefined}
                  >
                    {!it.coverUrl && <span>❤️</span>}
                  </span>
                  <span className="om-timeline__body">
                    <span className="om-timeline__date">{shortDay(it.day)}</span>
                    <span className="om-timeline__meta">
                      📸 {it.counts?.moments || 0} · 💬 {it.messageCount || 0}
                      {it.topMood ? ` · ${MOOD_EMOJI[it.topMood] || ""}` : ""}
                    </span>
                    {it.ai?.summary && (
                      <span className="om-timeline__summary">{it.ai.summary}</span>
                    )}
                  </span>
                  <span className="om-timeline__chev">›</span>
                </button>
              </li>
            ))}
          </ul>
        </details>
      ))}
    </div>
  );
};

// ── Page ──
const OurMomentsPage = () => {
  const [params, setParams] = useSearchParams();
  const initial = TABS.some((t) => t.key === params.get("tab")) ? params.get("tab") : "today";
  const [tab, setTab] = useState(initial);

  const switchTab = (key) => {
    setTab(key);
    setParams({ tab: key }, { replace: true });
  };

  return (
    <div className="om-pg">
      <BackHeader title="Our Moments" subtitle="Relive your love, over time" fallback="/dashboard" />

      {/* Premium segmented control */}
      <div className="om-segments">
        <div className="om-segments__track">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              className={`om-segment${tab === t.key ? " is-active" : ""}`}
              onClick={() => switchTab(t.key)}
            >
              <span className="om-segment__icon">{t.icon}</span>
              <span className="om-segment__label">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="om-pg__content">
        {/* Mounting only the active tab makes each fetch on show — no duplicate data. */}
        {tab === "today" && <TodayTab />}
        {tab === "month" && <MonthTab />}
        {tab === "year" && <YearTab />}
        {tab === "timeline" && <TimelineTab />}
      </div>
    </div>
  );
};

export default OurMomentsPage;
