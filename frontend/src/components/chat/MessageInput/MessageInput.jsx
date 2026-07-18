import { useState, useRef, useCallback, useEffect } from "react";
import { compressImage } from "../../../utils/compressImage";
import VoiceRecorder from "../VoiceRecorder/VoiceRecorder";
import AiAssistant from "../AiAssistant/AiAssistant";
import "./MessageInput.css";

const MAX_IMAGE_MB = 10;
const MAX_FILE_MB = 25;
const MAX_FIELD_HEIGHT = 120;

const CameraIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
);

const GalleryIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <path d="M21 15l-5-5L5 21" />
  </svg>
);

const AttachIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
  </svg>
);

const PlusIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
    <path d="M12 3L13.6 8.4L19 10L13.6 11.6L12 17L10.4 11.6L5 10L10.4 8.4L12 3Z" fill="currentColor" fillOpacity="0.15" />
    <path d="M18.5 15.5L19.2 17.8L21.5 18.5L19.2 19.2L18.5 21.5L17.8 19.2L15.5 18.5L17.8 17.8L18.5 15.5Z" />
  </svg>
);

const SendIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3.4 20.4l17.45-7.48a1 1 0 0 0 0-1.84L3.4 3.6a1 1 0 0 0-1.39 1.2L4 11l9 1-9 1-1.99 6.2a1 1 0 0 0 1.39 1.2z" />
  </svg>
);

const MessageInput = ({
  onSend,
  onTyping,
  onUploadMedia,
  disabled,
  replyDraft,
  onCancelReply,
  seed, // { text, ts } — pushed by suggestion chips outside the composer
}) => {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [preview, setPreview] = useState(null); // objectURL for image/video
  const [previewKind, setPreviewKind] = useState(null); // "image" | "video" | "file"
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [trayOpen, setTrayOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const fileRef = useRef(null);

  // Adopt an external seed (empty-state starter chips) into the draft.
  // Set-state-during-render "adjust" pattern — no effect, React-compiler safe.
  const [lastSeedTs, setLastSeedTs] = useState(0);
  if (seed?.ts && seed.ts !== lastSeedTs) {
    setLastSeedTs(seed.ts);
    setText(seed.text);
  }

  // Auto-grow the textarea to fit the draft (capped, then it scrolls).
  const resizeField = useCallback(() => {
    const el = inputRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, MAX_FIELD_HEIGHT)}px`;
  }, []);

  // DOM-only sync after a seed lands (no setState here).
  useEffect(() => {
    resizeField();
  }, [lastSeedTs, resizeField]);

  const handleChange = (e) => {
    setText(e.target.value);
    resizeField();
    if (e.target.value && onTyping) onTyping();
  };

  const clearAttachment = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPendingFile(null);
    setPreview(null);
    setPreviewKind(null);
    setProgress(0);
    [cameraRef, galleryRef, fileRef].forEach((r) => {
      if (r.current) r.current.value = "";
    });
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setTrayOpen(false);

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    const limit = isImage ? MAX_IMAGE_MB : MAX_FILE_MB;
    if (file.size > limit * 1024 * 1024) {
      setError(`${isImage ? "Image" : "File"} must be smaller than ${limit} MB.`);
      e.target.value = "";
      return;
    }

    setPendingFile(file);
    setPreviewKind(isImage ? "image" : isVideo ? "video" : "file");
    setPreview(isImage || isVideo ? URL.createObjectURL(file) : null);
  };

  const resetFieldHeight = () => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (el) el.style.height = "auto";
    });
  };

  const submitText = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, replyDraft?._id || null);
    setText("");
    resetFieldHeight();
    onCancelReply?.();
    inputRef.current?.focus();
  };

  const submitMedia = async () => {
    if (!pendingFile || uploading) return;
    setUploading(true);
    setProgress(0);
    setError("");
    try {
      // Compress images client-side before upload (no-op for video/files).
      const toUpload = await compressImage(pendingFile);
      await onUploadMedia(toUpload, text.trim(), (pct) => setProgress(pct), {
        replyTo: replyDraft?._id || null,
      });
      setText("");
      resetFieldHeight();
      clearAttachment();
      onCancelReply?.();
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (pendingFile) submitMedia();
    else submitText();
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  // Voice note: upload as soon as recording finishes.
  const handleVoiceRecorded = async (file, duration) => {
    setError("");
    try {
      await onUploadMedia(file, "", undefined, {
        mediaDuration: duration,
        replyTo: replyDraft?._id || null,
      });
      onCancelReply?.();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send voice message.");
    }
  };

  // The AI assistant only fills the draft — the user always sends.
  const handleUseAi = (suggestionText) => {
    setText(suggestionText);
    onTyping?.();
    inputRef.current?.focus();
    requestAnimationFrame(resizeField);
  };

  const hasText = !!text.trim();
  const showSend = hasText || pendingFile;
  const canSend = pendingFile ? !uploading : hasText;

  return (
    <div className="msg-input-wrap">
      {error && <p className="msg-input__error" role="alert">{error}</p>}

      {/* Reply preview banner */}
      {replyDraft && (
        <div className="msg-input__reply">
          <div className="msg-input__reply-body">
            <span className="msg-input__reply-label">Replying to</span>
            <span className="msg-input__reply-text">
              {replyDraft.type === "image"
                ? "📷 Photo"
                : replyDraft.type === "video"
                  ? "🎥 Video"
                  : replyDraft.type === "audio"
                    ? "🎤 Voice message"
                    : replyDraft.type === "file"
                      ? `📎 ${replyDraft.fileName || "File"}`
                      : replyDraft.text}
            </span>
          </div>
          <button
            type="button"
            className="msg-input__reply-close"
            onClick={onCancelReply}
            aria-label="Cancel reply"
          >
            ✕
          </button>
        </div>
      )}

      {/* Attachment preview */}
      {pendingFile && (
        <div className="msg-input__attachment">
          {previewKind === "image" && preview ? (
            <img className="msg-input__att-thumb" src={preview} alt="Preview" />
          ) : previewKind === "video" && preview ? (
            <video className="msg-input__att-thumb" src={preview} muted />
          ) : (
            <span className="msg-input__att-icon" aria-hidden="true">📄</span>
          )}
          <span className="msg-input__att-name">{pendingFile.name}</span>
          {uploading ? (
            <span className="msg-input__att-progress">{progress}%</span>
          ) : (
            <button
              type="button"
              className="msg-input__att-remove"
              onClick={clearAttachment}
              aria-label="Remove attachment"
            >
              ✕
            </button>
          )}
          {uploading && (
            <div className="msg-input__progress-bar">
              <div className="msg-input__progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
        </div>
      )}

      {/* AI Relationship Assistant — mounted only while open (fresh state). */}
      {aiOpen && (
        <AiAssistant
          draft={text}
          onUse={handleUseAi}
          onClose={() => setAiOpen(false)}
        />
      )}

      <div className="msg-input">
        {/* "+" morphs into ✕ and pops the attachment tray */}
        <button
          type="button"
          className={`msg-input__icon-btn msg-input__plus ${trayOpen ? "msg-input__plus--open" : ""}`}
          aria-label={trayOpen ? "Close attachments" : "Add attachment"}
          aria-expanded={trayOpen}
          disabled={disabled || uploading}
          onClick={() => setTrayOpen((v) => !v)}
        >
          <PlusIcon />
        </button>

        {/* Attachment tray — camera / gallery / document, staggered pop */}
        <div className={`msg-input__tray ${trayOpen ? "msg-input__tray--open" : ""}`} aria-hidden={!trayOpen}>
          <button
            type="button"
            className="msg-input__icon-btn msg-input__tray-btn"
            aria-label="Take photo"
            tabIndex={trayOpen ? 0 : -1}
            disabled={disabled || uploading}
            onClick={() => cameraRef.current?.click()}
          >
            <CameraIcon />
          </button>
          <button
            type="button"
            className="msg-input__icon-btn msg-input__tray-btn"
            aria-label="Photo or video"
            tabIndex={trayOpen ? 0 : -1}
            disabled={disabled || uploading}
            onClick={() => galleryRef.current?.click()}
          >
            <GalleryIcon />
          </button>
          <button
            type="button"
            className="msg-input__icon-btn msg-input__tray-btn"
            aria-label="Attach file"
            tabIndex={trayOpen ? 0 : -1}
            disabled={disabled || uploading}
            onClick={() => fileRef.current?.click()}
          >
            <AttachIcon />
          </button>
        </div>

        <input
          ref={cameraRef}
          type="file"
          className="msg-input__file"
          accept="image/*"
          capture="environment"
          onChange={handleFilePick}
        />
        <input
          ref={galleryRef}
          type="file"
          className="msg-input__file"
          accept="image/*,video/*"
          onChange={handleFilePick}
        />
        <input
          ref={fileRef}
          type="file"
          className="msg-input__file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          onChange={handleFilePick}
        />

        <textarea
          ref={inputRef}
          className="msg-input__field"
          rows={1}
          value={text}
          placeholder={
            disabled
              ? "No partner connected"
              : pendingFile
                ? "Add a caption…"
                : "Message…"
          }
          maxLength={1000}
          disabled={disabled || uploading}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {/* AI orb — opens the Relationship Assistant */}
        <button
          type="button"
          className="msg-input__icon-btn msg-input__ai"
          aria-label="Open AI relationship assistant"
          aria-haspopup="dialog"
          disabled={disabled || uploading}
          onClick={() => setAiOpen(true)}
        >
          <SparkleIcon />
        </button>

        {/* Send when there's content, otherwise tap-to-record voice. */}
        {showSend ? (
          <button
            type="button"
            className="msg-input__send"
            disabled={!canSend || disabled}
            aria-label="Send"
            onClick={submit}
          >
            {uploading ? "…" : <SendIcon />}
          </button>
        ) : (
          <VoiceRecorder
            disabled={disabled}
            onRecorded={handleVoiceRecorded}
            onError={(msg) => setError(msg)}
          />
        )}
      </div>
    </div>
  );
};

export default MessageInput;
