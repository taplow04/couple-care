import { useEffect, useState } from "react";
import {
  generateLetter,
  saveLetter,
  getLetters,
  shareLetter,
  deleteLetter,
} from "../../../services/letters.service";
import "./LoveLetterGenerator.css";

const LETTER_TYPES = [
  { key: "romantic", label: "Romantic", emoji: "❤️" },
  { key: "appreciation", label: "Appreciation", emoji: "🙏" },
  { key: "apology", label: "Apology", emoji: "🕊️" },
  { key: "motivation", label: "Motivation", emoji: "💪" },
  { key: "anniversary", label: "Anniversary", emoji: "💍" },
  { key: "birthday", label: "Birthday", emoji: "🎂" },
  { key: "surprise", label: "Surprise", emoji: "🎁" },
];

const TYPE_META = LETTER_TYPES.reduce((a, t) => ((a[t.key] = t), a), {});

const formatDate = (iso) =>
  new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const LoveLetterGenerator = () => {
  const [type, setType] = useState("romantic");
  const [letter, setLetter] = useState("");
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState([]);

  useEffect(() => {
    getLetters()
      .then((res) => setSaved(res.data || []))
      .catch(() => {});
  }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError("");
    try {
      const res = await generateLetter(type);
      setLetter(res.data?.content || "");
    } catch {
      setError("Couldn't write your letter right now. Try again.");
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (!letter || saving) return;
    setSaving(true);
    try {
      const res = await saveLetter({ type, content: letter });
      setSaved((prev) => [res.data, ...prev]);
    } finally {
      setSaving(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(letter);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const handleShareGenerated = async () => {
    // Save first (so the partner has something to open), then share it.
    setSaving(true);
    try {
      const res = await saveLetter({ type, content: letter });
      await shareLetter(res.data._id);
      setSaved((prev) => [{ ...res.data, sharedWithPartner: true }, ...prev]);
    } finally {
      setSaving(false);
    }
  };

  const handleShareSaved = async (id) => {
    try {
      await shareLetter(id);
      setSaved((prev) =>
        prev.map((l) => (l._id === id ? { ...l, sharedWithPartner: true } : l)),
      );
    } catch {
      /* ignore */
    }
  };

  const handleDelete = async (id) => {
    const snapshot = saved;
    setSaved((prev) => prev.filter((l) => l._id !== id));
    try {
      await deleteLetter(id);
    } catch {
      setSaved(snapshot);
    }
  };

  return (
    <section className="llg">
      <div className="llg__head">
        <h2 className="llg__title">💌 Love Letter</h2>
        <p className="llg__sub">AI-written, personal to the two of you</p>
      </div>

      <div className="llg__types">
        {LETTER_TYPES.map((t) => (
          <button
            key={t.key}
            className={`llg__type ${type === t.key ? "llg__type--on" : ""}`}
            onClick={() => setType(t.key)}
          >
            <span className="llg__type-emoji">{t.emoji}</span>
            {t.label}
          </button>
        ))}
      </div>

      <button className="llg__generate" onClick={handleGenerate} disabled={generating}>
        {generating ? "Writing your letter…" : letter ? "🔄 Regenerate" : "✨ Write My Letter"}
      </button>

      {error && <p className="llg__error">{error}</p>}

      {generating && !letter && (
        <div className="llg__paper llg__paper--loading">
          {[95, 100, 88, 92, 70].map((w, i) => (
            <div key={i} className="llg__shimmer" style={{ width: `${w}%` }} />
          ))}
        </div>
      )}

      {letter && (
        <>
          <article className="llg__paper">
            <span className="llg__paper-badge">{TYPE_META[type].emoji} {TYPE_META[type].label}</span>
            <p className="llg__paper-text">{letter}</p>
          </article>

          <div className="llg__actions">
            <button className="llg__act" onClick={handleCopy}>
              {copied ? "✓ Copied" : "📋 Copy"}
            </button>
            <button className="llg__act" onClick={handleSave} disabled={saving}>
              💾 Save
            </button>
            <button className="llg__act llg__act--primary" onClick={handleShareGenerated} disabled={saving}>
              💞 Send to Partner
            </button>
          </div>
        </>
      )}

      {saved.length > 0 && (
        <div className="llg__saved">
          <h3 className="llg__saved-title">Saved letters</h3>
          {saved.map((l) => (
            <div key={l._id} className="llg-saved-item">
              <div className="llg-saved-item__top">
                <span className="llg-saved-item__type">
                  {(TYPE_META[l.type] || TYPE_META.romantic).emoji}{" "}
                  {(TYPE_META[l.type] || TYPE_META.romantic).label}
                </span>
                <span className="llg-saved-item__date">{formatDate(l.createdAt)}</span>
              </div>
              <p className="llg-saved-item__text">{l.content}</p>
              <div className="llg-saved-item__actions">
                {l.sharedWithPartner ? (
                  <span className="llg-saved-item__shared">✓ Shared</span>
                ) : (
                  <button className="llg-saved-item__btn" onClick={() => handleShareSaved(l._id)}>
                    💞 Send
                  </button>
                )}
                <button
                  className="llg-saved-item__btn llg-saved-item__btn--del"
                  onClick={() => handleDelete(l._id)}
                  aria-label="Delete letter"
                >
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

export default LoveLetterGenerator;
