import { useEffect, useState } from "react";
import { useCoupleEvents } from "../../../hooks/useCoupleEvents";
import {
  getStoryChapters,
  addStoryChapter,
  deleteStoryChapter,
} from "../../../services/story.service";
import "./StoryChapters.css";

const fmtDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const EMPTY = { title: "", emoji: "📖", date: "", description: "" };

const StoryChapters = () => {
  const [chapters, setChapters] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => {
    getStoryChapters()
      .then((res) => setChapters(res.data || []))
      .catch(() => setChapters([]));
  };

  useEffect(() => {
    load();
  }, []);

  // Live: completing a goal / adding a memory etc. updates the story too.
  useCoupleEvents({ "couple:activity": load });

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      await addStoryChapter({
        title: form.title.trim(),
        emoji: form.emoji || "📖",
        date: form.date || new Date().toISOString(),
        description: form.description.trim(),
      });
      setForm(EMPTY);
      setShowAdd(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    setChapters((prev) => prev.filter((c) => c.id !== id));
    try {
      await deleteStoryChapter(id);
    } catch {
      load();
    }
  };

  return (
    <section className="story">
      <div className="story__head">
        <div>
          <h2 className="story__title">📖 Your Story</h2>
          <p className="story__sub">Every chapter of your journey, together</p>
        </div>
        <button className="story__add-btn" onClick={() => setShowAdd((s) => !s)}>
          {showAdd ? "Cancel" : "+ Chapter"}
        </button>
      </div>

      {showAdd && (
        <form className="story__form" onSubmit={submit}>
          <div className="story__form-row">
            <input
              className="story__emoji-input"
              name="emoji"
              value={form.emoji}
              onChange={change}
              maxLength={4}
              aria-label="Chapter emoji"
            />
            <input
              className="story__input"
              name="title"
              value={form.title}
              onChange={change}
              placeholder="Chapter title"
              maxLength={120}
              autoFocus
            />
          </div>
          <input
            className="story__input"
            type="date"
            name="date"
            value={form.date}
            onChange={change}
          />
          <textarea
            className="story__input story__textarea"
            name="description"
            value={form.description}
            onChange={change}
            placeholder="What happened? (optional)"
            rows={2}
            maxLength={1000}
          />
          <button className="story__save" type="submit" disabled={!form.title.trim() || saving}>
            {saving ? "Adding…" : "Add Chapter"}
          </button>
        </form>
      )}

      {chapters === null ? (
        <div className="story__skeletons">
          {[1, 2, 3].map((i) => (
            <div key={i} className="story__sk" />
          ))}
        </div>
      ) : chapters.length === 0 ? (
        <div className="story__empty">
          <span className="story__empty-emoji">✨</span>
          <p>Your story is just beginning. Add memories, complete goals, and watch your chapters grow.</p>
        </div>
      ) : (
        <div className="story__timeline">
          {chapters.map((c) => (
            <div key={c.id} className={`story-ch story-ch--${c.kind}`}>
              <div className="story-ch__rail">
                <span className="story-ch__dot">{c.emoji}</span>
              </div>
              <div className="story-ch__card">
                <div className="story-ch__top">
                  <span className="story-ch__num">Chapter {c.chapter}</span>
                  <span className="story-ch__date">{fmtDate(c.date)}</span>
                </div>
                <h3 className="story-ch__title">{c.title}</h3>
                {c.description && <p className="story-ch__desc">{c.description}</p>}
                {c.custom && (
                  <button
                    className="story-ch__del"
                    onClick={() => handleDelete(c.id)}
                    aria-label="Delete chapter"
                  >
                    🗑
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default StoryChapters;
