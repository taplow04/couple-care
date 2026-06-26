import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { uploadMoment } from "../../../services/moments.service";
import { logMood } from "../../../services/moods.service";
import { compressImage } from "../../../utils/compressImage";
import "./MomentCapture.css";

const MAX_DURATION = 20; // seconds (Feature 3/8/15)

const MODES = [
  { key: "photo", label: "Photo", icon: "📷" },
  { key: "video", label: "Video", icon: "🎥" },
  { key: "voice", label: "Voice", icon: "🎙" },
];

const PRIVACY = [
  { key: "partner_only", label: "❤️ Partner Only" },
  { key: "private", label: "🔒 Only Me" },
  { key: "save_journey", label: "⭐ Save to Journey" },
];

const constraintsFor = (m, facing) =>
  m === "voice" ? { audio: true } : { video: { facingMode: facing }, audio: m === "video" };

const mapMediaError = (e) => {
  if (e?.name === "NotAllowedError")
    return "Camera/microphone permission is needed to share a Moment.";
  if (e?.name === "NotFoundError")
    return "No camera or microphone was found on this device.";
  return "Couldn't start the camera. Make sure you're on HTTPS or localhost.";
};

/**
 * Live-capture composer for Moments. There is NO gallery picker by design
 * (Feature 3) — media is captured via getUserMedia / MediaRecorder only. Video
 * and voice are hard-capped at 20s (client-enforced + auto-stop), with a clear
 * message and no crash if the limit is hit. Media is compressed (photos) and
 * uploaded with a progress indicator; failures surface gracefully.
 */
const MomentCapture = ({ onClose, onUploaded }) => {
  const [mode, setMode] = useState("photo");
  const [facingMode, setFacingMode] = useState("user");
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [captured, setCaptured] = useState(null); // { blob, url, type, duration }
  const [caption, setCaption] = useState("");
  const [privacy, setPrivacy] = useState("partner_only");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [aiResult, setAiResult] = useState(null); // post-upload suggestion

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTsRef = useRef(0);

  // ── Camera/mic stream ──
  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const attachStream = useCallback((stream, m) => {
    streamRef.current = stream;
    setError("");
    if (videoRef.current && m !== "voice") {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, []);

  // Used by the mode/flip/retake CLICK handlers (an event — setState is fine).
  const startStream = useCallback(
    async (m, facing) => {
      stopStream();
      try {
        const stream = await navigator.mediaDevices.getUserMedia(constraintsFor(m, facing));
        attachStream(stream, m);
      } catch (e) {
        setError(mapMediaError(e));
      }
    },
    [stopStream, attachStream],
  );

  // Start the camera once on mount. The getUserMedia promise chain keeps every
  // setState inside a .then/.catch callback (never synchronous in the effect).
  // Mode/facing switches restart the stream from their click handlers.
  useEffect(() => {
    let cancelled = false;
    navigator.mediaDevices
      .getUserMedia(constraintsFor("photo", "user"))
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        attachStream(stream, "photo");
      })
      .catch((e) => {
        if (!cancelled) setError(mapMediaError(e));
      });
    return () => {
      cancelled = true;
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [attachStream, stopStream]);

  const switchMode = (m) => {
    if (recording) return;
    setMode(m);
    startStream(m, facingMode);
  };

  const flipCamera = () => {
    const f = facingMode === "user" ? "environment" : "user";
    setFacingMode(f);
    startStream(mode, f);
  };

  // ── Capture: photo ──
  const capturePhoto = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (facingMode === "user") {
      // Un-mirror the selfie so the saved photo matches what's printed.
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        stopStream();
        setCaptured({ blob, url: URL.createObjectURL(blob), type: "photo", duration: null });
      },
      "image/jpeg",
      0.9,
    );
  }, [facingMode, stopStream]);

  // ── Capture: video / voice ──
  const stopRecording = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRecording(false);
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }, []);

  const startRecording = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    let recorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      setError("Recording isn't supported on this browser.");
      return;
    }
    recorder.ondataavailable = (e) => {
      if (e.data?.size) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "" });
      const duration = Math.round((Date.now() - startTsRef.current) / 1000);
      stopStream();
      setCaptured({
        blob,
        url: URL.createObjectURL(blob),
        type: mode,
        duration: Math.min(duration, MAX_DURATION),
      });
    };
    recorderRef.current = recorder;
    startTsRef.current = Date.now();
    recorder.start();
    setRecording(true);
    setElapsed(0);

    timerRef.current = setInterval(() => {
      const secs = Math.round((Date.now() - startTsRef.current) / 1000);
      setElapsed(secs);
      if (secs >= MAX_DURATION) stopRecording(); // hard auto-stop at the cap
    }, 200);
  }, [mode, stopStream, stopRecording]);

  const retake = useCallback(() => {
    if (captured?.url) URL.revokeObjectURL(captured.url);
    setCaptured(null);
    setCaption("");
    setProgress(0);
    setError("");
    startStream(mode, facingMode);
  }, [captured, mode, facingMode, startStream]);

  // ── Upload ──
  const handleUpload = async () => {
    if (!captured) return;
    setUploading(true);
    setError("");
    try {
      let file;
      if (captured.type === "photo") {
        const raw = new File([captured.blob], "moment.jpg", { type: "image/jpeg" });
        file = await compressImage(raw);
      } else {
        const name = `moment.webm`;
        file = new File([captured.blob], name, {
          type:
            captured.blob.type ||
            (captured.type === "video" ? "video/webm" : "audio/webm"),
        });
      }

      const res = await uploadMoment(
        file,
        { caption, privacy, duration: captured.duration },
        setProgress,
      );
      onUploaded?.(res.data);

      // AI mood suggestion (Feature 13). Advisory — never auto-applied.
      const moods = res.data?.aiSuggestion?.moods || [];
      const text = res.data?.aiSuggestion?.text || "";
      if (moods.length || text) {
        setAiResult({ moods, text, momentCaption: caption });
        setCaptured(null);
      } else {
        onClose?.();
      }
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Upload failed. Please check your connection and try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  const acceptMood = async (moodType) => {
    try {
      await logMood({ moodType, intensity: 6, note: aiResult?.momentCaption || "" });
    } catch {
      /* ignore — mood is optional */
    }
    onClose?.();
  };

  // ── Render ──
  const showCamera = !captured && !aiResult;

  const body = (
    <div className="moment-capture" role="dialog" aria-modal="true">
      <div className="moment-capture__top">
        <button type="button" className="moment-capture__close" onClick={onClose} aria-label="Close">
          ✕
        </button>
        {showCamera && mode !== "voice" && (
          <button
            type="button"
            className="moment-capture__flip"
            onClick={flipCamera}
            aria-label="Flip camera"
          >
            🔄
          </button>
        )}
      </div>

      {/* Stage */}
      <div className="moment-capture__stage">
        {error && <div className="moment-capture__error">{error}</div>}

        {showCamera && mode !== "voice" && (
          <video
            ref={videoRef}
            className={`moment-capture__preview${facingMode === "user" ? " moment-capture__preview--mirror" : ""}`}
            playsInline
            muted
            autoPlay
          />
        )}

        {showCamera && mode === "voice" && (
          <div className="moment-capture__voice">
            <div className={`moment-capture__mic${recording ? " moment-capture__mic--rec" : ""}`}>
              🎙
            </div>
            <p>{recording ? "Recording…" : "Tap the button to record"}</p>
          </div>
        )}

        {recording && (
          <div className="moment-capture__timer">
            {elapsed}s / {MAX_DURATION}s
          </div>
        )}

        {/* Captured preview */}
        {captured && (
          <div className="moment-capture__captured">
            {captured.type === "photo" && <img src={captured.url} alt="preview" />}
            {captured.type === "video" && <video src={captured.url} controls playsInline />}
            {captured.type === "voice" && (
              <div className="moment-capture__voice">
                <div className="moment-capture__mic">🎙</div>
                <audio src={captured.url} controls />
              </div>
            )}
          </div>
        )}

        {/* AI suggestion (post-upload) */}
        {aiResult && (
          <div className="moment-capture__ai">
            <div className="moment-capture__ai-check">✅</div>
            <h3>Moment shared!</h3>
            {aiResult.text && <p className="moment-capture__ai-text">✨ {aiResult.text}</p>}
            {aiResult.moods.length > 0 && (
              <>
                <p className="moment-capture__ai-q">Tag how you're feeling?</p>
                <div className="moment-capture__ai-moods">
                  {aiResult.moods.map((m) => (
                    <button key={m} type="button" onClick={() => acceptMood(m)}>
                      {m}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button type="button" className="moment-capture__ai-skip" onClick={onClose}>
              Done
            </button>
          </div>
        )}
      </div>

      {/* Controls */}
      {showCamera && (
        <div className="moment-capture__controls">
          <div className="moment-capture__modes">
            {MODES.map((m) => (
              <button
                key={m.key}
                type="button"
                className={`moment-capture__mode${mode === m.key ? " moment-capture__mode--active" : ""}`}
                onClick={() => switchMode(m.key)}
                disabled={recording}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>

          {mode === "photo" ? (
            <button
              type="button"
              className="moment-capture__shutter"
              onClick={capturePhoto}
              aria-label="Capture photo"
            />
          ) : recording ? (
            <button
              type="button"
              className="moment-capture__shutter moment-capture__shutter--rec"
              onClick={stopRecording}
              aria-label="Stop recording"
            />
          ) : (
            <button
              type="button"
              className="moment-capture__shutter moment-capture__shutter--record"
              onClick={startRecording}
              aria-label="Start recording"
            />
          )}
          <p className="moment-capture__hint">
            Live capture only · max {MAX_DURATION}s for video/voice
          </p>
        </div>
      )}

      {/* Compose (after capture) */}
      {captured && (
        <div className="moment-capture__compose">
          <input
            className="moment-capture__caption"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Add a caption…"
            maxLength={500}
          />
          <div className="moment-capture__privacy">
            {PRIVACY.map((p) => (
              <button
                key={p.key}
                type="button"
                className={`moment-capture__priv${privacy === p.key ? " moment-capture__priv--active" : ""}`}
                onClick={() => setPrivacy(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
          {uploading && (
            <div className="moment-capture__progress">
              <div className="moment-capture__progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
          <div className="moment-capture__compose-actions">
            <button
              type="button"
              className="moment-capture__retake"
              onClick={retake}
              disabled={uploading}
            >
              Retake
            </button>
            <button
              type="button"
              className="moment-capture__share"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? `Sharing ${progress}%` : "Share Moment"}
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return createPortal(body, document.body);
};

export default MomentCapture;
