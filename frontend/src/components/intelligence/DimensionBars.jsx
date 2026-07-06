import "./intelligence.css";

/**
 * Horizontal dimension bars (single hue — identity is carried by the label,
 * value labels wear text tokens). `items`: [{ key, label, score }].
 */
const DimensionBars = ({ items = [] }) => {
  if (!items.length) return null;
  return (
    <div className="intel-dims">
      {items.map((d) => (
        <div className="intel-dim" key={d.key}>
          <span className="intel-dim__label">{d.label}</span>
          <span className="intel-dim__value">{d.score}</span>
          <div className="intel-dim__track" role="img" aria-label={`${d.label}: ${d.score} out of 100`}>
            <div className="intel-dim__fill" style={{ width: `${Math.max(2, d.score)}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
};

export default DimensionBars;
