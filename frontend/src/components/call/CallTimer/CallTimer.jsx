import { useEffect, useState } from "react";
import "./CallTimer.css";

const format = (totalSeconds) => {
  const s = Math.max(0, totalSeconds);
  const hrs = Math.floor(s / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hrs > 0 ? `${hrs}:${pad(mins)}:${pad(secs)}` : `${pad(mins)}:${pad(secs)}`;
};

/**
 * Live call duration. `startedAt` is a Date.now() timestamp (ms) or null.
 * When null, renders a neutral placeholder.
 */
const CallTimer = ({ startedAt, className = "" }) => {
  const [elapsed, setElapsed] = useState(() =>
    startedAt ? Math.floor((Date.now() - startedAt) / 1000) : 0,
  );

  useEffect(() => {
    if (!startedAt) return;
    const tick = () => setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <span className={`call-timer ${className}`}>
      {startedAt ? format(elapsed) : "00:00"}
    </span>
  );
};

export default CallTimer;
