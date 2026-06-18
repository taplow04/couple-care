import { useRef, useState, useCallback, useEffect } from "react";
import "./VoiceMessage.css";

const SPEEDS = [1, 1.5, 2];

const fmt = (s) => {
  if (!Number.isFinite(s) || s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
};

/**
 * Compact voice-note player: play/pause, seek scrubber, elapsed/duration,
 * and a tap-to-cycle playback speed. Audio element is created lazily.
 *
 * Props: src, duration (seconds, from the server), mine (bool, for theming).
 */
const VoiceMessage = ({ src, duration = 0, mine }) => {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [total, setTotal] = useState(duration || 0);
  const [speedIdx, setSpeedIdx] = useState(0);

  const onTime = useCallback((e) => setCurrent(e.target.currentTime), []);
  const onMeta = useCallback(
    (e) => {
      const d = e.target.duration;
      if (Number.isFinite(d) && d > 0) setTotal(d);
    },
    [],
  );
  const onEnd = useCallback(() => {
    setPlaying(false);
    setCurrent(0);
  }, []);

  // Keep speed in sync with the audio element.
  useEffect(() => {
    if (audioRef.current) audioRef.current.playbackRate = SPEEDS[speedIdx];
  }, [speedIdx]);

  const toggle = useCallback(() => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      a.playbackRate = SPEEDS[speedIdx];
      a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  }, [speedIdx]);

  const seek = useCallback((e) => {
    const a = audioRef.current;
    if (!a) return;
    const t = Number(e.target.value);
    a.currentTime = t;
    setCurrent(t);
  }, []);

  const cycleSpeed = useCallback(
    () => setSpeedIdx((i) => (i + 1) % SPEEDS.length),
    [],
  );

  const max = total || duration || 0;
  const pct = max > 0 ? (current / max) * 100 : 0;

  return (
    <div className={`voice-msg ${mine ? "voice-msg--mine" : ""}`}>
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onTimeUpdate={onTime}
        onLoadedMetadata={onMeta}
        onEnded={onEnd}
      />

      <button
        type="button"
        className="voice-msg__play"
        onClick={toggle}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
      >
        {playing ? (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="5" width="4" height="14" rx="1.2" />
            <rect x="14" y="5" width="4" height="14" rx="1.2" />
          </svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M7 5.5v13a1 1 0 0 0 1.54.84l10-6.5a1 1 0 0 0 0-1.68l-10-6.5A1 1 0 0 0 7 5.5z" />
          </svg>
        )}
      </button>

      <div className="voice-msg__main">
        <div className="voice-msg__track">
          <div className="voice-msg__fill" style={{ width: `${pct}%` }} />
          <input
            type="range"
            className="voice-msg__range"
            min={0}
            max={max || 0}
            step={0.1}
            value={current}
            onChange={seek}
            aria-label="Seek"
          />
        </div>
        <span className="voice-msg__time">
          {fmt(playing || current ? current : max)}
        </span>
      </div>

      <button
        type="button"
        className="voice-msg__speed"
        onClick={cycleSpeed}
        aria-label="Playback speed"
      >
        {SPEEDS[speedIdx]}×
      </button>
    </div>
  );
};

export default VoiceMessage;
