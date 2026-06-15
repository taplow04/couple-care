import "./RelationshipHealth.css";

const CIRC = 2 * Math.PI * 46;

const LEVEL_CONFIG = {
  Excellent: {
    color: "#32c36c",
    desc: "Your relationship is flourishing. The effort you're both putting in is clearly working — keep celebrating each other and nurturing those beautiful habits.",
    tips: ["Keep logging moods daily", "Create new memories together", "Express gratitude often"],
  },
  Healthy: {
    color: "#ff5c8a",
    desc: "Your relationship has a strong, healthy foundation. There's always room to deepen your connection and explore new ways to grow together.",
    tips: ["Try a new activity together", "Have deeper conversations", "Surprise each other"],
  },
  Moderate: {
    color: "#ffaa00",
    desc: "Your relationship has real potential. Small, intentional actions each day can make a meaningful difference in how connected and in-sync you feel.",
    tips: ["Log moods more regularly", "Plan a meaningful date", "Share what's on your mind"],
  },
  "Needs Attention": {
    color: "#ff5252",
    desc: "Every relationship goes through difficult seasons. The fact you're tracking and reflecting shows deep care. Small steps toward connection can shift everything.",
    tips: ["Start with one honest conversation", "Create a positive memory today", "Use the conversation starters below"],
  },
};

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M21 2v6h-6M3 22v-6h6M3.5 9a9 9 0 0 1 14.83-3.36L21 8M20.5 15a9 9 0 0 1-14.83 3.36L3 16"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ShimmerBlock = ({ h = 12, w = "100%" }) => (
  <div className="rh-shimmer" style={{ height: h, width: w }} />
);

const RelationshipHealth = ({ score, level, loading, onRefresh }) => {
  const cfg    = LEVEL_CONFIG[level] ?? LEVEL_CONFIG["Healthy"];
  const color  = loading ? "var(--border)" : (cfg?.color ?? "#ff5c8a");
  const offset = loading || !score ? CIRC : CIRC - (score / 100) * CIRC;

  return (
    <section className="rh">
      <div className="rh__head">
        <div className="rh__title-row">
          <span className="rh__title-icon">❤️‍🔥</span>
          <h2 className="rh__title">Relationship Health</h2>
        </div>
        <button
          className={`rh__refresh ${loading ? "rh__refresh--spin" : ""}`}
          onClick={onRefresh}
          disabled={loading}
          aria-label="Refresh health score"
        >
          <RefreshIcon />
        </button>
      </div>

      <div className="rh__card">
        <div className="rh__ring-area">
          <div className="rh__ring-wrap">
            <svg width="140" height="140" viewBox="0 0 110 110">
              <circle
                cx="55" cy="55" r="46" fill="none" strokeWidth="8"
                stroke={`${color}28`}
              />
              <circle
                cx="55" cy="55" r="46" fill="none" strokeWidth="8"
                stroke={color}
                strokeLinecap="round"
                strokeDasharray={CIRC}
                strokeDashoffset={offset}
                transform="rotate(-90 55 55)"
                className="rh__arc"
              />
            </svg>
            <div className="rh__ring-center">
              {loading ? (
                <span className="rh__score-dash">—</span>
              ) : (
                <>
                  <span className="rh__score" style={{ color }}>{score ?? 0}</span>
                  <span className="rh__score-label">/ 100</span>
                </>
              )}
            </div>
          </div>

          {loading ? (
            <div className="rh__level-shimmer">
              <ShimmerBlock h={20} w="90px" />
            </div>
          ) : (
            <span className="rh__level-badge" style={{ color, background: `${color}18` }}>
              {level ?? "—"}
            </span>
          )}
        </div>

        <div className="rh__info">
          {loading ? (
            <div className="rh__text-shimmer">
              <ShimmerBlock h={12} w="100%" />
              <ShimmerBlock h={12} w="92%" />
              <ShimmerBlock h={12} w="78%" />
            </div>
          ) : (
            <p className="rh__desc">{cfg?.desc}</p>
          )}

          <div className="rh__tips">
            <p className="rh__tips-label">What helps your score</p>
            <ul className="rh__tips-list">
              {(cfg?.tips ?? []).map((tip) => (
                <li key={tip} className="rh__tip">
                  <span className="rh__tip-check">✓</span>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RelationshipHealth;
