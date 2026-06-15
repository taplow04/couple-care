import "./AIMoodInsight.css";

const ShimmerLines = ({ lines = 4 }) => (
  <div className="ami-shimmer">
    {Array.from({ length: lines }).map((_, i) => (
      <div
        key={i}
        className="ami-shimmer__line"
        style={{ width: ["92%", "100%", "78%", "88%", "65%"][i % 5] }}
      />
    ))}
  </div>
);

const AIMoodInsight = ({ analysis, loading }) => (
  <div className="ami">
    <h2 className="ami__title">AI Mood Analysis</h2>

    <div className="ami__card">
      <div className="ami__top">
        <div className="ami__label-wrap">
          <span className="ami__badge">🧠 AI</span>
          <p className="ami__label">Personalized Insight</p>
        </div>
        <span className="ami__powered">Powered by Groq</span>
      </div>

      {loading ? (
        <ShimmerLines lines={4} />
      ) : analysis ? (
        <p className="ami__body">{analysis}</p>
      ) : (
        <p className="ami__empty">
          Log more moods over time to get a personalized AI analysis of your emotional patterns.
        </p>
      )}

      {!loading && analysis && (
        <div className="ami__footer">
          <span className="ami__footer-icon">✨</span>
          <span className="ami__footer-text">Analysis is based on your recent mood history</span>
        </div>
      )}
    </div>
  </div>
);

export default AIMoodInsight;
