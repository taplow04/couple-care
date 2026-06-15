import "./RelationshipInsights.css";

const RefreshIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
    <path d="M21 2v6h-6M3 22v-6h6M3.5 9a9 9 0 0 1 14.83-3.36L21 8M20.5 15a9 9 0 0 1-14.83 3.36L3 16"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const INSIGHT_CHIPS = [
  "Communication", "Emotional Bond", "Shared Moments", "Growth",
  "Connection", "Trust", "Appreciation",
];

const RelationshipInsights = ({ insights, loading, onRefresh }) => (
  <section className="ri">
    <div className="ri__head">
      <div className="ri__title-row">
        <span className="ri__title-icon">✨</span>
        <h2 className="ri__title">Relationship Insights</h2>
      </div>
      <button
        className={`ri__refresh ${loading ? "ri__refresh--spin" : ""}`}
        onClick={onRefresh}
        disabled={loading}
        aria-label="Refresh insights"
      >
        <RefreshIcon />
      </button>
    </div>

    <div className="ri__card">
      <div className="ri__card-top">
        <span className="ri__ai-badge">✨ AI Generated</span>
        <span className="ri__model">llama-3.3-70b</span>
      </div>

      {loading ? (
        <div className="ri-shimmer">
          {["95%", "100%", "88%", "75%", "92%", "60%"].map((w, i) => (
            <div key={i} className="ri-shimmer__line" style={{ width: w }} />
          ))}
        </div>
      ) : insights ? (
        <>
          <p className="ri__body">{insights}</p>
          <div className="ri__chips">
            {INSIGHT_CHIPS.slice(0, 4).map((c) => (
              <span key={c} className="ri__chip">{c}</span>
            ))}
          </div>
        </>
      ) : (
        <div className="ri__empty">
          <span className="ri__empty-emoji">🔮</span>
          <p className="ri__empty-text">
            Add memories and log moods over time to unlock personalized relationship insights.
          </p>
        </div>
      )}

      <div className="ri__footer">
        <span className="ri__footer-icon">🔒</span>
        <span className="ri__footer-text">Analysis is private and never shared</span>
      </div>
    </div>
  </section>
);

export default RelationshipInsights;
