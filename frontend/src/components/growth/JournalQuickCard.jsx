import { useState } from "react";
import { addJournal } from "../../services/growth.service";
import "./growth.css";

const META = {
  reflection: { icon: "🪞", title: "Daily Reflection" },
  gratitude: { icon: "🙏", title: "Daily Gratitude" },
  journal: { icon: "📓", title: "Journal" },
};

/**
 * Inline prompted quick-write for reflection / gratitude / free journal. Saves
 * via /growth/journal (which awards personal XP + keeps the growth streak alive).
 * `done` marks today's prompted entry as already completed.
 */
const JournalQuickCard = ({ type = "reflection", prompt = "", done = false, onSaved }) => {
  const meta = META[type] || META.journal;
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNow, setSavedNow] = useState(done);

  const save = async () => {
    if (!content.trim() || saving) return;
    setSaving(true);
    try {
      const res = await addJournal({ type, content, prompt });
      setContent("");
      setSavedNow(true);
      onSaved?.(res.data);
    } catch {
      /* surfaced by disabled state; user can retry */
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="gcard">
      <div className="gcard__head">
        <h3 className="gcard__title">{meta.icon} {meta.title}</h3>
        {savedNow && <span className="gwrite__done">✓ Saved today</span>}
      </div>
      {prompt && <p className="gwrite__prompt">{prompt}</p>}
      <textarea
        className="gwrite__field"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder={
          type === "gratitude"
            ? "What are you grateful for today?"
            : type === "reflection"
              ? "Take a moment to reflect…"
              : "Write what's on your mind…"
        }
      />
      <div className="gwrite__row">
        <span className="gcard__hint">Private to you</span>
        <button className="gbtn" onClick={save} disabled={!content.trim() || saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
};

export default JournalQuickCard;
