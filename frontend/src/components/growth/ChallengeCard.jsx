import { useState } from "react";
import { completeChallenge } from "../../services/growth.service";
import "./growth.css";

/**
 * Today's deterministic growth challenge. Completing it awards personal XP.
 */
const ChallengeCard = ({ challenge, onComplete }) => {
  const [done, setDone] = useState(!!challenge?.completed);
  const [busy, setBusy] = useState(false);

  const complete = async () => {
    if (done || busy) return;
    setBusy(true);
    setDone(true); // optimistic
    try {
      const res = await completeChallenge();
      onComplete?.(res.data);
    } catch {
      setDone(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={`gcard gchallenge ${done ? "gchallenge--done" : ""}`}>
      <div className="gcard__head">
        <h3 className="gcard__title">🎯 Today's Challenge</h3>
      </div>
      <p className="gchallenge__title">{challenge?.title || "Loading…"}</p>
      {challenge?.category && (
        <p className="gchallenge__cat">{challenge.category.replace(/_/g, " ")}</p>
      )}
      {done ? (
        <span className="gchallenge__check">✓ Completed</span>
      ) : (
        <button className="gbtn gbtn--block" onClick={complete} disabled={busy || !challenge}>
          Mark complete
        </button>
      )}
    </div>
  );
};

export default ChallengeCard;
