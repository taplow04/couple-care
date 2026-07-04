import { useEffect, useRef, useState } from "react";

import { createExplorePost } from "../../../services/explore.service";
import { compressImage } from "../../../utils/compressImage";
import { CATEGORIES } from "../../../utils/exploreTaxonomy";
import "./ComposePost.css";

const VISIBILITY = [
  { key: "public", label: "🌍 Public", hint: "Shown in Explore (if your profile is public)" },
  { key: "partner_only", label: "❤️ Partner Only", hint: "Only your partner sees it" },
  { key: "private", label: "🔒 Private", hint: "Only you" },
];

const CAPTION_MAX_H = 168; // px — caption grows up to this, then scrolls

// Create an Explore post. Relationship users choose Personal vs Relationship;
// single / unmatched users always post Personal. Media → Cloudinary (multipart).
const ComposePost = ({ onClose, onCreated, hasCouple = false }) => {
  const fileRef = useRef(null);
  const captionRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [isVideo, setIsVideo] = useState(false);
  const [caption, setCaption] = useState("");
  const [category, setCategory] = useState("date");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState("public");
  // Couples default to a shared relationship post; solo users can only post
  // personally (relationship posts stay exclusive to active couples).
  const [scope, setScope] = useState(hasCouple ? "relationship" : "personal");
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");

  // Lock the background page scroll while the composer sheet is open so the
  // feed underneath doesn't move as the user scrolls the composer.
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  const autoGrow = (el) => {
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, CAPTION_MAX_H)}px`;
  };

  const onCaptionChange = (e) => {
    setCaption(e.target.value);
    autoGrow(e.target);
  };

  const pick = async (f) => {
    if (!f) return;
    setError("");
    const video = f.type.startsWith("video/");
    setIsVideo(video);
    if (video) {
      setFile(f);
      setPreview(URL.createObjectURL(f));
    } else {
      try {
        const compressed = await compressImage(f);
        setFile(compressed);
        setPreview(URL.createObjectURL(compressed));
      } catch {
        setFile(f);
        setPreview(URL.createObjectURL(f));
      }
    }
  };

  const submit = async () => {
    if (!file || uploading) return;
    setUploading(true);
    setError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("caption", caption);
      fd.append("category", category);
      fd.append("location", location);
      fd.append("visibility", visibility);
      fd.append("scope", hasCouple ? scope : "personal");
      const res = await createExplorePost(fd, setProgress);
      onCreated?.(res.data);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't share the post. Try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="compose" role="dialog" aria-modal="true" aria-label="Share a post">
      <button type="button" className="compose__scrim" aria-label="Close" onClick={onClose} />
      <div className="compose__panel glass">
        <div className="compose__grab" aria-hidden="true" />
        <div className="compose__head">
          <button type="button" className="compose__close" onClick={onClose} aria-label="Close">✕</button>
          <h3 className="compose__title">Share a Moment</h3>
          <span className="compose__head-spacer" aria-hidden="true" />
        </div>

        <div className="compose__body">
          {/* Media picker / preview */}
          {preview ? (
            <div className={`compose__preview${isVideo ? " is-video" : ""}`}>
              {isVideo ? (
                <video src={preview} controls playsInline />
              ) : (
                <img src={preview} alt="preview" />
              )}
              <button
                type="button"
                className="compose__change"
                onClick={() => fileRef.current?.click()}
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="compose__drop"
              onClick={() => fileRef.current?.click()}
            >
              <span className="compose__drop-icon">📷</span>
              <span className="compose__drop-title">Add a photo or video</span>
              <span className="compose__drop-hint">Tap to choose from your device</span>
            </button>
          )}
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            hidden
            onChange={(e) => {
              pick(e.target.files?.[0]);
              e.target.value = "";
            }}
          />

          {/* Post as — couples pick shared vs personal; solo users post personal */}
          {hasCouple && (
            <div className="compose__field">
              <label className="compose__field-label">Post as</label>
              <div className="compose__scope">
                <button
                  type="button"
                  className={`compose__scope-btn${scope === "relationship" ? " is-active" : ""}`}
                  onClick={() => setScope("relationship")}
                >
                  <span className="compose__scope-emoji">❤️</span>
                  <span className="compose__scope-label">Relationship</span>
                  <span className="compose__scope-hint">Shared couple post</span>
                </button>
                <button
                  type="button"
                  className={`compose__scope-btn${scope === "personal" ? " is-active" : ""}`}
                  onClick={() => setScope("personal")}
                >
                  <span className="compose__scope-emoji">🙂</span>
                  <span className="compose__scope-label">Personal</span>
                  <span className="compose__scope-hint">Just from you</span>
                </button>
              </div>
            </div>
          )}

          <div className="compose__field">
            <textarea
              ref={captionRef}
              className="compose__caption"
              value={caption}
              onChange={onCaptionChange}
              placeholder="Write a caption…"
              maxLength={2000}
              rows={2}
            />
          </div>

          <div className="compose__field">
            <label className="compose__field-label">Category</label>
            <div className="compose__cats">
              {CATEGORIES.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`compose__cat${category === c.key ? " is-active" : ""}`}
                  onClick={() => setCategory(c.key)}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          <div className="compose__field">
            <input
              className="compose__loc"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="📍 Add location (optional)"
              maxLength={120}
            />
          </div>

          <div className="compose__field">
            <label className="compose__field-label">Who can see this?</label>
            <div className="compose__vis">
              {VISIBILITY.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  className={`compose__vis-btn${visibility === v.key ? " is-active" : ""}`}
                  onClick={() => setVisibility(v.key)}
                >
                  <span className="compose__vis-label">{v.label}</span>
                  <span className="compose__vis-hint">{v.hint}</span>
                </button>
              ))}
            </div>
          </div>

          {error && <p className="compose__error" role="alert">{error}</p>}
        </div>

        <div className="compose__footer">
          {uploading && (
            <div className="compose__progress">
              <div className="compose__progress-fill" style={{ width: `${progress}%` }} />
            </div>
          )}
          <button
            type="button"
            className="compose__post"
            onClick={submit}
            disabled={!file || uploading}
          >
            {uploading ? `Sharing… ${progress}%` : "Share Moment"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ComposePost;
