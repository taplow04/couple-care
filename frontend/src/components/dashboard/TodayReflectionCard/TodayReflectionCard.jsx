import { useNavigate } from "react-router-dom";
import "./TodayReflectionCard.css";

const CHIPS = [
  { key: "mood", label: "Mood", emoji: "😊" },
  { key: "energy", label: "Energy", emoji: "⚡" },
  { key: "stress", label: "Stress", emoji: "🌊" },
  { key: "relationshipSatisfaction", label: "Us", emoji: "❤️" },
];

/**
 * Today's Reflection — done state (today's key ratings) or a gentle CTA.
 * `reflection` comes straight from the dashboard payload (one fetch).
 */
const TodayReflectionCard = ({ reflection }) => {
  const navigate = useNavigate();
  const done = Boolean(reflection);
  const chips = done ? CHIPS.filter((c) => reflection[c.key] != null) : [];

  return (
    <div
      className="today-refl"
      role="button"
      tabIndex={0}
      onClick={() => navigate("/reflection")}
      onKeyDown={(e) => e.key === "Enter" && navigate("/reflection")}
      aria-label={done ? "Today's reflection — view or edit" : "Log today's reflection"}
    >
      <div className="today-refl__icon" aria-hidden="true">🪞</div>
      <div className="today-refl__body">
        <span className="today-refl__title">
          {done ? "Today's reflection ✅" : "Today's reflection"}
        </span>
        {done && chips.length > 0 ? (
          <div className="today-refl__chips">
            {chips.map((c) => (
              <span key={c.key} className="today-refl__chip">
                {c.emoji} {c.label} {reflection[c.key]}/10
              </span>
            ))}
          </div>
        ) : (
          <span className="today-refl__hint">
            {done
              ? "Saved — tap to review or add more."
              : "One optional minute: energy, mood, gratitude. Just for you."}
          </span>
        )}
      </div>
      <span className="today-refl__chev" aria-hidden="true">›</span>
    </div>
  );
};

export default TodayReflectionCard;
