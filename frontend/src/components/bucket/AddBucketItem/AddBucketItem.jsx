import { useState } from "react";
import { BUCKET_CATEGORIES } from "../bucketCategories";
import "./AddBucketItem.css";

const EMPTY = { title: "", category: "other", deadline: "", notes: "" };

const AddBucketItem = ({ onAdd }) => {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);

  const change = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || saving) return;
    setSaving(true);
    try {
      await onAdd({
        title: form.title.trim(),
        category: form.category,
        deadline: form.deadline || null,
        notes: form.notes.trim(),
      });
      setForm(EMPTY);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button className="addbucket__cta" onClick={() => setOpen(true)}>
        <span className="addbucket__cta-plus">＋</span> Add a goal
      </button>
    );
  }

  return (
    <form className="addbucket" onSubmit={submit}>
      <input
        className="addbucket__input"
        name="title"
        value={form.title}
        onChange={change}
        placeholder="What do you dream of doing together?"
        maxLength={160}
        autoFocus
      />

      <div className="addbucket__cats">
        {BUCKET_CATEGORIES.map((c) => (
          <button
            type="button"
            key={c.key}
            className={`addbucket__cat ${form.category === c.key ? "addbucket__cat--on" : ""}`}
            onClick={() => setForm((f) => ({ ...f, category: c.key }))}
          >
            {c.emoji} {c.label}
          </button>
        ))}
      </div>

      <label className="addbucket__label">
        Target date (optional)
        <input
          className="addbucket__input"
          type="date"
          name="deadline"
          value={form.deadline}
          onChange={change}
        />
      </label>

      <textarea
        className="addbucket__input addbucket__textarea"
        name="notes"
        value={form.notes}
        onChange={change}
        placeholder="Notes (optional)"
        rows={2}
        maxLength={1000}
      />

      <div className="addbucket__actions">
        <button type="button" className="addbucket__btn addbucket__btn--ghost" onClick={() => { setOpen(false); setForm(EMPTY); }}>
          Cancel
        </button>
        <button type="submit" className="addbucket__btn addbucket__btn--primary" disabled={!form.title.trim() || saving}>
          {saving ? "Adding…" : "Add Goal"}
        </button>
      </div>
    </form>
  );
};

export default AddBucketItem;
