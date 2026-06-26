import { useEffect, useRef, useState } from "react";
import GalleryGrid from "../GalleryGrid/GalleryGrid";
import MediaViewer from "../MediaViewer/MediaViewer";
import { compressImage } from "../../../utils/compressImage";
import {
  getMyGallery,
  getRelationshipGallery,
  uploadGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
} from "../../../services/gallery.service";
import "./PersonalGallery.css";

/**
 * Orchestrates a gallery surface: loads items, lets the owner add (photo/video)
 * with live progress, view full-screen, edit captions and delete. `scope`
 * selects the personal gallery (own) or the couple's relationship gallery.
 * `editable` (default true) gates the add/edit/delete controls.
 */
const PersonalGallery = ({ scope = "personal", editable = true, title }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [active, setActive] = useState(null);
  const inputRef = useRef(null);

  const load = scope === "relationship" ? getRelationshipGallery : getMyGallery;

  useEffect(() => {
    let alive = true;
    load()
      .then((res) => alive && setItems(res.data || []))
      .catch(() => alive && setError("Couldn't load the gallery."))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope]);

  const handlePick = () => inputRef.current?.click();

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const isVideo = file.type.startsWith("video/");
    if (!isImage && !isVideo) {
      setError("Only photos and videos are supported.");
      return;
    }

    setBusy(true);
    setProgress(0);
    setError("");
    try {
      const toSend = isImage ? await compressImage(file) : file;
      const res = await uploadGalleryItem(toSend, { scope }, setProgress);
      setItems((prev) => [res.data, ...prev]);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Try again.");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  };

  const handleSaveCaption = async (id, caption) => {
    const res = await updateGalleryItem(id, { caption });
    setItems((prev) => prev.map((it) => (it._id === id ? res.data : it)));
    setActive((cur) => (cur && cur._id === id ? res.data : cur));
  };

  const handleDelete = async (id) => {
    await deleteGalleryItem(id);
    setItems((prev) => prev.filter((it) => it._id !== id));
  };

  return (
    <section className="pgal">
      {title && <h3 className="pgal__title">{title}</h3>}

      {error && <p className="pgal__error">{error}</p>}

      {loading ? (
        <div className="pgal__skeleton">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="pgal__skeleton-tile" />
          ))}
        </div>
      ) : (
        <GalleryGrid
          items={items}
          onOpen={setActive}
          onAddClick={editable ? handlePick : undefined}
          addBusy={busy}
          addProgress={progress}
          emptyLabel={editable ? "Add your first photo or video." : "No media yet."}
        />
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/*,video/mp4,video/quicktime,video/webm"
        hidden
        onChange={handleFile}
      />

      {active && (
        <MediaViewer
          key={active._id}
          item={active}
          editable={editable && active.scope === scope}
          onClose={() => setActive(null)}
          onSave={handleSaveCaption}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
};

export default PersonalGallery;
