import { useEffect, useState, useMemo } from "react";
import { getSharedMedia } from "../../../services/chat.service";
import VoiceMessage from "../VoiceMessage/VoiceMessage";
import "./SharedMediaGrid.css";

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const TABS = [
  { key: "image", label: "Photos" },
  { key: "video", label: "Videos" },
  { key: "file", label: "Files" },
  { key: "audio", label: "Voice" },
];

/**
 * Tabbed shared-media gallery for the partner profile: Photos · Videos · Files ·
 * Voice. Reuses GET /chat/media (now returns all media types). Includes a
 * future-ready (disabled) search field.
 */
const SharedMediaGrid = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("image");
  const [viewer, setViewer] = useState(null); // { type, url }

  useEffect(() => {
    getSharedMedia()
      .then((res) => setMedia(res.data || []))
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, []);

  const groups = useMemo(() => {
    const g = { image: [], video: [], file: [], audio: [] };
    media.forEach((m) => {
      if (m.mediaUrl && g[m.type]) g[m.type].push(m);
    });
    return g;
  }, [media]);

  const current = groups[tab] || [];

  return (
    <div className="pp-section">
      <p className="pp-section__title">Shared Media</p>

      {/* Future-ready search (disabled until backend search exists). */}
      <div className="smg-search">
        <span className="smg-search__icon" aria-hidden="true">🔍</span>
        <input
          className="smg-search__input"
          type="search"
          placeholder="Search messages (coming soon)"
          disabled
          aria-label="Search messages"
        />
      </div>

      {/* Tabs */}
      <div className="smg-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            role="tab"
            aria-selected={tab === t.key}
            className={`smg-tab ${tab === t.key ? "smg-tab--active" : ""}`}
            onClick={() => setTab(t.key)}
          >
            {t.label}
            <span className="smg-tab__count">{groups[t.key].length}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="smg-grid">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="smg-skeleton" />
          ))}
        </div>
      ) : current.length === 0 ? (
        <p className="smg-empty">Nothing here yet.</p>
      ) : tab === "image" || tab === "video" ? (
        <div className="smg-grid">
          {current.map((m) =>
            tab === "image" ? (
              <button
                key={m._id}
                className="smg-cell"
                onClick={() => setViewer({ type: "image", url: m.mediaUrl })}
                aria-label="Open photo"
              >
                <img src={m.mediaUrl} alt={m.fileName || "Shared"} loading="lazy" />
              </button>
            ) : (
              <button
                key={m._id}
                className="smg-cell smg-cell--video"
                onClick={() => setViewer({ type: "video", url: m.mediaUrl })}
                aria-label="Open video"
              >
                <video src={m.mediaUrl} preload="metadata" muted />
                <span className="smg-cell__play" aria-hidden="true">▶</span>
              </button>
            )
          )}
        </div>
      ) : tab === "file" ? (
        <div className="smg-list">
          {current.map((m) => (
            <a
              key={m._id}
              className="smg-file"
              href={m.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={m.fileName || true}
            >
              <span className="smg-file__icon" aria-hidden="true">📄</span>
              <span className="smg-file__info">
                <span className="smg-file__name">{m.fileName || "File"}</span>
                <span className="smg-file__size">{formatBytes(m.fileSize)}</span>
              </span>
              <span className="smg-file__dl" aria-hidden="true">⤓</span>
            </a>
          ))}
        </div>
      ) : (
        <div className="smg-list">
          {current.map((m) => (
            <div key={m._id} className="smg-voice">
              <VoiceMessage src={m.mediaUrl} duration={m.mediaDuration || 0} />
            </div>
          ))}
        </div>
      )}

      {/* Lightweight viewer */}
      {viewer && (
        <div className="smg-viewer" onClick={() => setViewer(null)}>
          <button className="smg-viewer__close" aria-label="Close">✕</button>
          {viewer.type === "image" ? (
            <img src={viewer.url} alt="Shared" onClick={(e) => e.stopPropagation()} />
          ) : (
            <video
              src={viewer.url}
              controls
              autoPlay
              playsInline
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default SharedMediaGrid;
