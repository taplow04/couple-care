import { useState, useRef } from "react";
import { compressImage } from "../../../utils/compressImage";
import VoiceRecorder from "../VoiceRecorder/VoiceRecorder";
import "./MessageInput.css";

const MAX_IMAGE_MB = 10;
const MAX_FILE_MB = 25;

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
}) => {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [preview, setPreview] = useState(null); // objectURL for image/video
  const [previewKind, setPreviewKind] = useState(null); // "image" | "video" | "file"
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const fileRef = useRef(null);

  const handleChange = (e) => {
    setText(e.target.value);
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

  const submitText = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed, replyDraft?._id || null);
    setText("");
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

      <div className="msg-input">
        {/* Camera (native capture) */}
        <button
          type="button"
          className="msg-input__icon-btn"
          aria-label="Take photo"
          disabled={disabled || uploading}
          onClick={() => cameraRef.current?.click()}
        >
          <CameraIcon />
        </button>
        <input
          ref={cameraRef}
          type="file"
          className="msg-input__file"
          accept="image/*"
          capture="environment"
          onChange={handleFilePick}
        />

        {/* Gallery (photos + videos) */}
        <button
          type="button"
          className="msg-input__icon-btn"
          aria-label="Photo or video"
          disabled={disabled || uploading}
          onClick={() => galleryRef.current?.click()}
        >
          <GalleryIcon />
        </button>
        <input
          ref={galleryRef}
          type="file"
          className="msg-input__file"
          accept="image/*,video/*"
          onChange={handleFilePick}
        />

        {/* Documents */}
        <button
          type="button"
          className="msg-input__icon-btn"
          aria-label="Attach file"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
        >
          <AttachIcon />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="msg-input__file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip"
          onChange={handleFilePick}
        />

        <input
          ref={inputRef}
          className="msg-input__field"
          type="text"
          value={text}
          placeholder={
            disabled
              ? "No partner connected"
              : pendingFile
                ? "Add a caption…"
                : "Message..."
          }
          maxLength={1000}
          disabled={disabled || uploading}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {/* Send when there's content, otherwise hold-to-record voice. */}
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
