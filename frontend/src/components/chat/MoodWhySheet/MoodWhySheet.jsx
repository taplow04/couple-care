import { useEffect } from "react";
import { createPortal } from "react-dom";
import "./MoodWhySheet.css";

/**
 * Bottom sheet explaining WHY the AI estimated the partner's current mood —
 * mood + confidence + the top contributing reasons. Transparency builds trust.
 * Reuses the mood DTO (which now carries `reasons`); no extra fetch.
 *
 * @param {boolean} open
 * @param {object}  mood   partner AI-mood DTO { emoji, display, confidence, reasons[] }
 * @param {string}  name   partner first name (for copy)
 * @param {function} onClose
 */
const MoodWhySheet = ({ open, mood, name = "Your partner", onClose }) => {
  // Close on Escape; lock body scroll while open.
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || !mood) return null;

  const confidence = Math.round(mood.confidence || 0);
  const reasons = mood.reasons?.length ? mood.reasons : ["Based on recent activity together"];

  return createPortal(
    <div className="mws-overlay" onClick={onClose} role="presentation">
      <div
        className="mws-sheet"
        data-valence={mood.valence || "neutral"}
        role="dialog"
        aria-modal="true"
        aria-label="Why this mood"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mws-grab" aria-hidden="true" />

        <div className="mws-head">
          <span className="mws-emoji" aria-hidden="true">{mood.emoji}</span>
          <div className="mws-head-text">
            <h3 className="mws-title">{mood.display}</h3>
            <p className="mws-conf">Confidence • {confidence}%</p>
          </div>
        </div>

        <div className="mws-conf-track">
          <div className="mws-conf-fill" style={{ width: `${confidence}%` }} />
        </div>

        <p className="mws-reasons-label">Why we think this</p>
        <ul className="mws-reasons">
          {reasons.map((r) => (
            <li key={r} className="mws-reason">
              <span className="mws-reason-dot" aria-hidden="true" />
              <span>{r}</span>
            </li>
          ))}
        </ul>

        <p className="mws-note">
          This is {name === "Your partner" ? "an" : `${name}'s`} AI estimate from recent
          activity — never a certainty.
        </p>

        <button type="button" className="mws-done" onClick={onClose}>
          Got it
        </button>
      </div>
    </div>,
    document.body,
  );
};

export default MoodWhySheet;
