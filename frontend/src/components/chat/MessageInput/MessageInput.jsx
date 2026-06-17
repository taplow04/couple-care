import { useState, useRef } from "react";
import "./MessageInput.css";

const MAX_IMAGE_MB = 10;
const MAX_FILE_MB = 25;

const MessageInput = ({ onSend, onTyping, onUploadMedia, disabled }) => {
  const [text, setText] = useState("");
  const [pendingFile, setPendingFile] = useState(null);
  const [preview, setPreview] = useState(null); // objectURL for images
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  const inputRef = useRef(null);
  const fileRef = useRef(null);

  const isImage = pendingFile?.type?.startsWith("image/");

  const handleChange = (e) => {
    setText(e.target.value);
    if (e.target.value && onTyping) onTyping();
  };

  const clearAttachment = () => {
    if (preview) URL.revokeObjectURL(preview);
    setPendingFile(null);
    setPreview(null);
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleFilePick = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    const img = file.type.startsWith("image/");
    const limit = img ? MAX_IMAGE_MB : MAX_FILE_MB;
    if (file.size > limit * 1024 * 1024) {
      setError(`${img ? "Image" : "File"} must be smaller than ${limit} MB.`);
      if (fileRef.current) fileRef.current.value = "";
      return;
    }

    setPendingFile(file);
    setPreview(img ? URL.createObjectURL(file) : null);
  };

  const submitText = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  const submitMedia = async () => {
    if (!pendingFile || uploading) return;
    setUploading(true);
    setProgress(0);
    setError("");
    try {
      await onUploadMedia(pendingFile, text.trim(), (pct) => setProgress(pct));
      // Message arrives via the socket broadcast — just reset the composer.
      setText("");
      clearAttachment();
    } catch (err) {
      setError(
        err.response?.data?.message || "Upload failed. Please try again.",
      );
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

  const canSend = pendingFile ? !uploading : !!text.trim();

  return (
    <div className="msg-input-wrap">
      {error && <p className="msg-input__error" role="alert">{error}</p>}

      {pendingFile && (
        <div className="msg-input__attachment">
          {isImage && preview ? (
            <img className="msg-input__att-thumb" src={preview} alt="Preview" />
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
              <div
                className="msg-input__progress-fill"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      )}

      <div className="msg-input">
        <button
          type="button"
          className="msg-input__attach"
          aria-label="Attach"
          disabled={disabled || uploading}
          onClick={() => fileRef.current?.click()}
        >
          📎
        </button>
        <input
          ref={fileRef}
          type="file"
          className="msg-input__file"
          accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,audio/*,video/mp4"
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

        <button
          type="button"
          className="msg-input__send"
          disabled={!canSend || disabled}
          aria-label="Send"
          onClick={submit}
        >
          {uploading ? "…" : "Send"}
        </button>
      </div>
    </div>
  );
};

export default MessageInput;
