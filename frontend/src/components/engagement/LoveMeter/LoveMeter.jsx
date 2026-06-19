import { useEffect, useMemo, useState } from "react";
import "./LoveMeter.css";

/**
 * Love Meter — the animated replacement for the static Relationship Health card.
 * It's "alive": five hearts fill based on a love level blended from the couple's
 * Relationship Health (authoritative) + the daily streak, and the whole meter
 * breathes/pulses. Health is still the backbone — this is the romantic UI layer.
 */
const STAGES = [
  { min: 90, label: "Soulmates", emoji: "💞" },
  { min: 75, label: "Flourishing", emoji: "🌸" },
  { min: 60, label: "Blooming", emoji: "🌷" },
  { min: 40, label: "Growing", emoji: "🌱" },
  { min: 1, label: "Budding", emoji: "🌰" },
];

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

const LoveMeter = ({ value, health, aiScore, engagement }) => {
  const [animated, setAnimated] = useState(false);

  // Relationship Health is the couple metric (identical for both partners).
  const score = aiScore?.score ?? health?.score ?? null;
  const streak = engagement?.currentStreak ?? 0;

  // The Love Meter is ONE couple value. The canonical formula matches the
  // server's: round(health*0.9 + min(streak,30)*0.4). Health is now a cached
  // couple value (identical for both partners), so this blend yields the SAME
  // number for both and updates live. The server `value` is only a fallback for
  // the brief moment before health has loaded.
  const love = useMemo(() => {
    if (score != null) {
      const streakBoost = Math.min(streak, 30) * 0.4;
      return clamp(Math.round(score * 0.9 + streakBoost));
    }
    if (value != null) return clamp(Math.round(value));
    return null;
  }, [value, score, streak]);

  const hasData = love != null;
  const filled = hasData ? Math.round(love / 20) : 0;
  const stage = hasData
    ? STAGES.find((s) => love >= s.min) ?? STAGES[STAGES.length - 1]
    : null;

  useEffect(() => {
    const t = setTimeout(() => setAnimated(true), 120);
    return () => clearTimeout(t);
  }, [love]);

  return (
    <div className={`lovemeter ${hasData ? "lovemeter--alive" : ""}`}>
      <div className="lovemeter__aura" aria-hidden="true" />

      <p className="lovemeter__label">Love Meter</p>

      <div
        className="lovemeter__hearts"
        role="img"
        aria-label={
          hasData ? `Love level ${love} of 100 — ${stage.label}` : "No data yet"
        }
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const isFilled = animated && i < filled;
          return (
            <span
              key={i}
              className={`lovemeter__heart ${
                isFilled ? "lovemeter__heart--on" : "lovemeter__heart--off"
              }`}
              style={{ animationDelay: `${i * 120}ms` }}
            >
              {isFilled ? "❤️" : "🤍"}
            </span>
          );
        })}
      </div>

      {hasData ? (
        <div className="lovemeter__info">
          <span className="lovemeter__stage">
            {stage.emoji} {stage.label}
          </span>
          <div className="lovemeter__meta">
            <span className="lovemeter__score">{love}/100</span>
            {streak > 0 && (
              <span className="lovemeter__streak">🔥 {streak}d</span>
            )}
          </div>
        </div>
      ) : (
        <p className="lovemeter__empty">Log moods to grow your love</p>
      )}
    </div>
  );
};

export default LoveMeter;
