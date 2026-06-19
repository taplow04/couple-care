import { useEffect, useRef, useState } from "react";
import { useCoupleEvents } from "../../../hooks/useCoupleEvents";
import "./AchievementToast.css";

/**
 * Global achievement celebration. Listens for `achievement:unlocked` on the
 * shared socket (fired by engagement.service to BOTH partners) and shows a
 * celebratory toast. Queues multiple unlocks so none are missed. Mounted once
 * in AppLayout.
 */
const DISPLAY_MS = 4500;

const AchievementToast = () => {
  const [current, setCurrent] = useState(null);
  const queueRef = useRef([]);
  const showingRef = useRef(false);
  const timerRef = useRef(null);

  // Show the next queued unlock, or clear when the queue is empty. Declared as a
  // hoisted function so it can safely schedule itself via setTimeout.
  function advance() {
    clearTimeout(timerRef.current);
    const next = queueRef.current.shift();
    if (!next) {
      showingRef.current = false;
      setCurrent(null);
      return;
    }
    showingRef.current = true;
    setCurrent(next);
    timerRef.current = setTimeout(advance, DISPLAY_MS);
  }

  useCoupleEvents({
    "achievement:unlocked": (payload) => {
      if (!payload?.key) return;
      queueRef.current.push(payload);
      if (!showingRef.current) advance();
    },
  });

  useEffect(() => () => clearTimeout(timerRef.current), []);

  if (!current) return null;

  return (
    <div className="achv-toast" role="status" onClick={advance}>
      <div className="achv-toast__shine" aria-hidden="true" />
      <span className="achv-toast__emoji">{current.emoji || "🏆"}</span>
      <div className="achv-toast__body">
        <span className="achv-toast__eyebrow">Achievement Unlocked</span>
        <span className="achv-toast__title">{current.title}</span>
        {current.description && (
          <span className="achv-toast__desc">{current.description}</span>
        )}
      </div>
    </div>
  );
};

export default AchievementToast;
