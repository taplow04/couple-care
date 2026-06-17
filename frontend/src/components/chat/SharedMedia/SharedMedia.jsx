import { useEffect, useState } from "react";
import { getSharedMedia } from "../../../services/chat.service";
import "./SharedMedia.css";

const formatBytes = (bytes) => {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Shared photos + files exchanged in chat (WhatsApp/IG-DM style gallery).
const SharedMedia = () => {
  const [media, setMedia] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lightbox, setLightbox] = useState(null); // image url

  useEffect(() => {
    getSharedMedia()
      .then((res) => setMedia(res.data || []))
      .catch(() => setMedia([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="pp-section">
        <p className="pp-section__title">Shared Media</p>
        <div className="sm-skeletons">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="sm-skeleton" />
          ))}
        </div>
      </div>
    );
  }

  const images = media.filter((m) => m.type === "image" && m.mediaUrl);
  const files = media.filter((m) => m.type === "file" && m.mediaUrl);

  if (images.length === 0 && files.length === 0) {
    return (
      <div className="pp-section">
        <p className="pp-section__title">Shared Media</p>
        <p className="sm-empty">No photos or files shared yet.</p>
      </div>
    );
  }

  return (
    <div className="pp-section">
      <p className="pp-section__title">
        Shared Media
        <span className="sm-count">{images.length + files.length}</span>
      </p>

      {images.length > 0 && (
        <div className="sm-grid">
          {images.map((m) => (
            <button
              key={m._id}
              className="sm-thumb"
              onClick={() => setLightbox(m.mediaUrl)}
              aria-label="Open image"
            >
              <img src={m.mediaUrl} alt={m.fileName || "Shared"} loading="lazy" />
            </button>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="sm-files">
          {files.map((m) => (
            <a
              key={m._id}
              className="sm-file"
              href={m.mediaUrl}
              target="_blank"
              rel="noopener noreferrer"
              download={m.fileName || true}
            >
              <span className="sm-file-icon" aria-hidden="true">📄</span>
              <span className="sm-file-info">
                <span className="sm-file-name">{m.fileName || "File"}</span>
                <span className="sm-file-size">{formatBytes(m.fileSize)}</span>
              </span>
              <span className="sm-file-dl" aria-hidden="true">⤓</span>
            </a>
          ))}
        </div>
      )}

      {lightbox && (
        <div className="sm-lightbox" onClick={() => setLightbox(null)}>
          <button className="sm-lightbox__close" aria-label="Close">✕</button>
          <img src={lightbox} alt="Shared" onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
};

export default SharedMedia;
