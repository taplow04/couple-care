import { useEffect, useState } from "react";
import "./MediaViewer.css";

/**
 * Full-screen photo/video viewer (lightbox). When `editable`, the owner can
 * edit the caption and delete the item. Closes on backdrop tap or ✕.
 */
// Caller passes key={item._id} so this remounts per item (state resets cleanly
// without a setState-in-effect). See codebase convention in CLAUDE.md.
const MediaViewer = ({ item, editable = false, onClose, onSave, onDelete }) => {
  const [caption, setCaption] = useState(item?.caption || "");
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  // Lock body scroll while open.
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!item) return null;

  const handleSave = async () => {
    setBusy(true);
    try {
      await onSave?.(item._id, caption.trim());
      setEditing(false);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this from your gallery?")) return;
    setBusy(true);
    try {
      await onDelete?.(item._id);
      onClose?.();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mv" onClick={onClose}>
      <button className="mv__close" onClick={onClose} aria-label="Close">
        ✕
      </button>

      <div className="mv__stage" onClick={(e) => e.stopPropagation()}>
        {item.type === "video" ? (
          <video className="mv__media" src={item.url} controls autoPlay playsInline />
        ) : (
          <img className="mv__media" src={item.url} alt={item.caption || "photo"} />
        )}

        <div className="mv__meta">
          {editing ? (
            <div className="mv__edit">
              <input
                className="mv__caption-input"
                value={caption}
                maxLength={500}
                placeholder="Write a caption…"
                onChange={(e) => setCaption(e.target.value)}
              />
              <div className="mv__edit-actions">
                <button className="mv__btn" onClick={() => setEditing(false)} disabled={busy}>
                  Cancel
                </button>
                <button className="mv__btn mv__btn--primary" onClick={handleSave} disabled={busy}>
                  {busy ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          ) : (
            <>
              {item.caption && <p className="mv__caption">{item.caption}</p>}
              {editable && (
                <div className="mv__actions">
                  <button className="mv__btn" onClick={() => setEditing(true)} disabled={busy}>
                    ✏️ Edit caption
                  </button>
                  <button className="mv__btn mv__btn--danger" onClick={handleDelete} disabled={busy}>
                    🗑 Delete
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaViewer;
