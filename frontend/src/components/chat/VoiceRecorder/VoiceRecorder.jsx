import { useRef, useState, useCallback, useEffect } from "react";
import "./VoiceRecorder.css";

const BARS = 32;
const MAX_DURATION_MS = 5 * 60 * 1000; // 5 min hard cap

const isSupported = () =>
  typeof window !== "undefined" &&
  !!navigator.mediaDevices?.getUserMedia &&
  typeof window.MediaRecorder !== "undefined";

// Pick a mime type MediaRecorder supports (Chrome/FF: webm/opus, iOS: mp4).
const pickMime = () => {
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  for (const t of candidates) {
    if (window.MediaRecorder.isTypeSupported?.(t)) return t;
  }
  return "";
};

const extFor = (mime) => {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("mp4")) return "mp4";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
};

const fmt = (ms) => {
  const s = Math.floor(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Tap-to-record voice note. Tap the mic to start; a live waveform + timer
 * appears with an explicit Cancel (discard) and Send (stop) button — reliable
 * on both desktop and mobile (replaces the old hold + slide-to-cancel gesture).
 *
 * Props:
 *  - onRecorded(file, durationSeconds)
 *  - onError(message)
 *  - disabled
 */
const VoiceRecorder = ({ onRecorded, onError, disabled }) => {
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [amps, setAmps] = useState(() => new Array(BARS).fill(0.08));

  const recRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeRef = useRef("");
  const startRef = useRef(0);
  const cancelRef = useRef(false);
  const rafRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const tickRef = useRef(null);
  const lastAmpPush = useRef(0);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(tickRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (audioCtxRef.current) {
      audioCtxRef.current.close().catch(() => {});
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
  }, []);

  useEffect(() => cleanup, [cleanup]);

  const drawLoop = useCallback(() => {
    const analyser = analyserRef.current;
    if (!analyser) return;
    const buf = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteTimeDomainData(buf);
    // RMS amplitude (0..1-ish).
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.min(1, Math.sqrt(sum / buf.length) * 3.2);

    const now = performance.now();
    if (now - lastAmpPush.current > 70) {
      lastAmpPush.current = now;
      setAmps((prev) => {
        const next = prev.slice(1);
        next.push(Math.max(0.08, rms));
        return next;
      });
    }
    rafRef.current = requestAnimationFrame(drawLoop);
  }, []);

  const stop = useCallback((cancel) => {
    cancelRef.current = cancel;
    const rec = recRef.current;
    if (rec && rec.state !== "inactive") {
      rec.stop();
    }
  }, []);

  const start = useCallback(async () => {
    if (disabled || recording) return;
    if (!isSupported()) {
      onError?.(
        "Voice recording isn't supported on this browser. On iPhone, use Safari.",
      );
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mime = pickMime();
      mimeRef.current = mime;
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      recRef.current = rec;
      chunksRef.current = [];
      cancelRef.current = false;

      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const durationSec = Math.max(
          1,
          Math.round((Date.now() - startRef.current) / 1000),
        );
        cleanup();
        setRecording(false);
        setElapsed(0);
        setAmps(new Array(BARS).fill(0.08));

        if (cancelRef.current) {
          chunksRef.current = [];
          return;
        }
        const type = mimeRef.current || "audio/webm";
        const blob = new Blob(chunksRef.current, { type });
        chunksRef.current = [];
        if (blob.size < 1200) return; // too short / empty
        const file = new File([blob], `voice-note.${extFor(type)}`, { type });
        onRecorded?.(file, durationSec);
      };

      // Waveform analyser.
      try {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        const ctx = new Ctx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        rafRef.current = requestAnimationFrame(drawLoop);
      } catch {
        /* waveform is optional */
      }

      startRef.current = Date.now();
      rec.start();
      setRecording(true);

      tickRef.current = setInterval(() => {
        const ms = Date.now() - startRef.current;
        setElapsed(ms);
        if (ms >= MAX_DURATION_MS) stop(false);
      }, 250);
    } catch (err) {
      cleanup();
      onError?.(
        err?.name === "NotAllowedError"
          ? "Microphone permission denied. Enable it in your browser settings."
          : "Couldn't start recording.",
      );
    }
  }, [disabled, recording, onError, onRecorded, cleanup, drawLoop, stop]);

  return (
    <>
      {!recording && (
        <button
          type="button"
          className="voice-rec__mic"
          aria-label="Record voice message"
          disabled={disabled}
          onClick={start}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="2" width="6" height="12" rx="3" />
            <path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8" />
          </svg>
        </button>
      )}

      {recording && (
        <div className="voice-rec__overlay">
          {/* Cancel / discard */}
          <button
            type="button"
            className="voice-rec__cancel"
            aria-label="Cancel recording"
            onClick={() => stop(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14H6L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4h6v2" />
            </svg>
          </button>

          <span className="voice-rec__dot" />
          <span className="voice-rec__time">{fmt(elapsed)}</span>

          <div className="voice-rec__wave" aria-hidden="true">
            {amps.map((a, i) => (
              <span
                key={i}
                className="voice-rec__bar"
                style={{ height: `${Math.round(a * 100)}%` }}
              />
            ))}
          </div>

          {/* Stop & send */}
          <button
            type="button"
            className="voice-rec__send"
            aria-label="Send voice message"
            onClick={() => stop(false)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.39 1.2L4 11l9 1-9 1-1.99 6.2a1 1 0 0 0 1.39 1.2z" />
            </svg>
          </button>
        </div>
      )}
    </>
  );
};

export default VoiceRecorder;
