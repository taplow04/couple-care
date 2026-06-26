import { useEffect, useState } from "react";

import MomentViewer from "../MomentViewer/MomentViewer";
import {
  getHighlights,
  getHighlight,
  createHighlight,
} from "../../../services/moments.service";
import "./MomentHighlights.css";

const PRESETS = [
  { emoji: "❤️", title: "First Date" },
  { emoji: "🏖", title: "Trips" },
  { emoji: "🎂", title: "Birthday" },
  { emoji: "🎄", title: "Christmas" },
  { emoji: "🎓", title: "Graduation" },
  { emoji: "💍", title: "Anniversary" },
];

/**
 * Saved-Moment Highlights (Feature 11): named, co-owned collections that persist
 * beyond 24h and are accessible to both partners anytime. Tapping a highlight
 * plays its moments in the viewer (read-only).
 */
const MomentHighlights = () => {
  const [highlights, setHighlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewer, setViewer] = useState(null); // { moments }
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newEmoji, setNewEmoji] = useState("⭐");

  const load = async () => {
    try {
      const res = await getHighlights();
      setHighlights(res.data || []);
    } catch {
      setHighlights([]);
    } finally {
      setLoading(false);
    }
  };

  // Seed on mount via the .then pattern (no synchronous setState in the effect).
  useEffect(() => {
    let active = true;
    getHighlights()
      .then((res) => {
        if (active) setHighlights(res.data || []);
      })
      .catch(() => {
        if (active) setHighlights([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const openHighlight = async (id) => {
    try {
      const res = await getHighlight(id);
      if (res.data?.moments?.length) setViewer({ moments: res.data.moments });
    } catch {
      /* ignore */
    }
  };

  const handleCreate = async () => {
    if (!newTitle.trim()) return;
    try {
      await createHighlight({ title: newTitle.trim(), emoji: newEmoji });
      setNewTitle("");
      setNewEmoji("⭐");
      setCreating(false);
      load();
    } catch {
      /* ignore */
    }
  };

  if (loading) return null;

  return (
    <div className="moment-highlights">
      <div className="moment-highlights__head">
        <h3 className="moment-highlights__title">Highlights</h3>
        <button
          type="button"
          className="moment-highlights__new"
          onClick={() => setCreating((c) => !c)}
        >
          {creating ? "Cancel" : "+ New"}
        </button>
      </div>

      {creating && (
        <div className="moment-highlights__create">
          <div className="moment-highlights__presets">
            {PRESETS.map((p) => (
              <button
                key={p.title}
                type="button"
                onClick={() => {
                  setNewEmoji(p.emoji);
                  setNewTitle(p.title);
                }}
                className={newTitle === p.title ? "moment-highlights__preset--active" : ""}
              >
                {p.emoji} {p.title}
              </button>
            ))}
          </div>
          <div className="moment-highlights__create-row">
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Highlight name"
              maxLength={60}
            />
            <button type="button" onClick={handleCreate} className="moment-highlights__save">
              Create
            </button>
          </div>
        </div>
      )}

      {highlights.length === 0 ? (
        <p className="moment-highlights__empty">
          Save your favourite Moments into Highlights so they last forever. 💞
        </p>
      ) : (
        <div className="moment-highlights__row">
          {highlights.map((h) => (
            <button
              key={h._id}
              type="button"
              className="moment-highlights__item"
              onClick={() => openHighlight(h._id)}
            >
              <span className="moment-highlights__cover">
                {h.coverUrl ? (
                  <img src={h.coverUrl} alt={h.title} />
                ) : (
                  <span className="moment-highlights__emoji">{h.emoji}</span>
                )}
              </span>
              <span className="moment-highlights__name">{h.title}</span>
            </button>
          ))}
        </div>
      )}

      {viewer && (
        <MomentViewer
          moments={viewer.moments}
          isOwn={false}
          readOnly
          startIndex={0}
          onClose={() => setViewer(null)}
        />
      )}
    </div>
  );
};

export default MomentHighlights;
