import { useState } from "react";
import "./ProfileForm.css";

/* ── Inline tag input ──────────────────────────────────────────────────────── */

const TagInput = ({ tags, onChange, placeholder, color, maxTags = 15 }) => {
  const [inputVal, setInputVal] = useState("");

  const addTag = (raw) => {
    const val = raw.trim().slice(0, 30);
    if (!val || tags.includes(val) || tags.length >= maxTags) return;
    onChange([...tags, val]);
    setInputVal("");
  };

  const removeTag = (tag) => onChange(tags.filter((t) => t !== tag));

  const handleKey = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputVal);
    }
    if (e.key === "Backspace" && !inputVal && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  return (
    <div className={`tag-input tag-input--${color}`}>
      {tags.map((t) => (
        <span key={t} className="tag-input__chip">
          {t}
          <button
            type="button"
            className="tag-input__chip-del"
            onClick={() => removeTag(t)}
            aria-label={`Remove ${t}`}
          >
            ×
          </button>
        </span>
      ))}
      {tags.length < maxTags && (
        <input
          className="tag-input__field"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={handleKey}
          onBlur={() => inputVal.trim() && addTag(inputVal)}
          placeholder={tags.length === 0 ? placeholder : "Add more…"}
          maxLength={31}
          aria-label={placeholder}
        />
      )}
    </div>
  );
};

/* ── Field wrapper ─────────────────────────────────────────────────────────── */

const Field = ({ label, error, children, hint }) => (
  <div className="pf__field">
    <label className="pf__label">{label}</label>
    {children}
    {error && <p className="pf__field-err">{error}</p>}
    {hint && !error && <p className="pf__field-hint">{hint}</p>}
  </div>
);

/* ── Profile form ──────────────────────────────────────────────────────────── */

const ProfileForm = ({ values, onChange, errors }) => {
  const set = (key) => (val) => onChange({ ...values, [key]: val });

  return (
    <div className="pf">
      {/* Name */}
      <Field label="Display Name" error={errors?.name}>
        <input
          className={`pf__input ${errors?.name ? "pf__input--err" : ""}`}
          type="text"
          value={values.name}
          onChange={(e) => set("name")(e.target.value)}
          placeholder="Your name"
          maxLength={60}
          autoComplete="name"
        />
      </Field>

      {/* Birthday */}
      <Field label="Birthday" hint="Used for birthday reminders & cards">
        <input
          className="pf__input"
          type="date"
          value={values.birthday || ""}
          max={new Date().toISOString().split("T")[0]}
          onChange={(e) => set("birthday")(e.target.value)}
          aria-label="Birthday"
        />
      </Field>

      {/* Bio */}
      <Field label="Bio" hint={`${(values.bio || "").length}/500`}>
        <textarea
          className="pf__textarea"
          value={values.bio}
          onChange={(e) => set("bio")(e.target.value)}
          placeholder="A little about yourself…"
          maxLength={500}
          rows={3}
        />
      </Field>

      {/* Hobbies */}
      <Field
        label="Hobbies"
        hint="Press Enter or comma to add · up to 15"
      >
        <TagInput
          tags={values.hobbies}
          onChange={set("hobbies")}
          placeholder="e.g. hiking, cooking…"
          color="primary"
        />
      </Field>

      {/* Likes */}
      <Field
        label="Likes"
        hint="Things you love"
      >
        <TagInput
          tags={values.likes}
          onChange={set("likes")}
          placeholder="e.g. sunsets, coffee…"
          color="secondary"
        />
      </Field>

      {/* Dislikes */}
      <Field
        label="Dislikes"
        hint="Things you're not a fan of"
      >
        <TagInput
          tags={values.dislikes}
          onChange={set("dislikes")}
          placeholder="e.g. loud noise…"
          color="muted"
        />
      </Field>
    </div>
  );
};

export default ProfileForm;
