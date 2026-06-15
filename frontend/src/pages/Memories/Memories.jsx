import { useState, useEffect, useCallback } from "react";
import { getMemories, addMemory } from "../../services/memories.service";
import "./Memories.css";

const MEMORY_TYPE_ICON = {
  date: "🌹", trip: "✈️", birthday: "🎂", anniversary: "💍",
  proposal: "💎", gift: "🎁", milestone: "🌟", other: "💫",
};

const MEMORY_TYPE_BG = {
  date: "rgba(255,92,138,0.12)",      trip: "rgba(124,92,255,0.12)",
  birthday: "rgba(255,200,0,0.12)",   anniversary: "rgba(255,92,138,0.12)",
  proposal: "rgba(124,92,255,0.12)",  gift: "rgba(50,195,108,0.12)",
  milestone: "rgba(255,140,0,0.12)",  other: "rgba(100,100,100,0.08)",
};

const TYPES = ["date","trip","birthday","anniversary","proposal","gift","milestone","other"];

const formatDate = (d) =>
  new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric" }).format(new Date(d));

const todayISO = () => new Date().toISOString().split("T")[0];

const EMPTY_FORM = { title: "", description: "", memoryType: "date", memoryDate: todayISO() };

const Memories = () => {
  const [memories, setMemories]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [addOpen, setAddOpen]     = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError]   = useState("");

  const fetchMemories = useCallback(async () => {
    try {
      const res = await getMemories();
      setMemories(res.data || []);
    } catch {
      setMemories([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchMemories(); }, [fetchMemories]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError("Title is required"); return; }
    setSubmitting(true);
    setFormError("");
    try {
      await addMemory({ ...form, memoryDate: new Date(form.memoryDate).toISOString() });
      setForm(EMPTY_FORM);
      setAddOpen(false);
      fetchMemories();
    } catch (err) {
      setFormError(err.response?.data?.message || "Could not add memory");
    } finally {
      setSubmitting(false);
    }
  };

  const openAdd = () => { setAddOpen(true); setFormError(""); };
  const cancelAdd = () => { setAddOpen(false); setForm(EMPTY_FORM); setFormError(""); };

  return (
    <div className="mem-pg">
      <div className="mem-pg-content">

        {/* Header */}
        <div className="mem-pg-header">
          <div>
            <h1 className="mem-pg-title">Our Memories</h1>
            <p className="mem-pg-sub">Your shared story, captured</p>
          </div>
          {!addOpen ? (
            <button className="mem-pg-btn-add" onClick={openAdd}>+ Add</button>
          ) : (
            <button className="mem-pg-btn-cancel" onClick={cancelAdd}>Cancel</button>
          )}
        </div>

        {/* Add Form */}
        {addOpen && (
          <form className="mem-pg-form" onSubmit={handleSubmit}>
            <div className="mem-pg-field">
              <label className="mem-pg-label">Title *</label>
              <input
                className="mem-pg-input"
                type="text" name="title" value={form.title}
                placeholder="What happened?"
                maxLength={100}
                required
                onChange={handleChange}
              />
            </div>

            <div className="mem-pg-row">
              <div className="mem-pg-field">
                <label className="mem-pg-label">Type</label>
                <select className="mem-pg-select" name="memoryType" value={form.memoryType} onChange={handleChange}>
                  {TYPES.map((t) => (
                    <option key={t} value={t}>
                      {MEMORY_TYPE_ICON[t]} {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mem-pg-field">
                <label className="mem-pg-label">Date *</label>
                <input
                  className="mem-pg-input"
                  type="date" name="memoryDate" value={form.memoryDate}
                  required
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="mem-pg-field">
              <label className="mem-pg-label">Description</label>
              <textarea
                className="mem-pg-textarea"
                name="description" value={form.description}
                placeholder="Tell the story…"
                rows={3}
                maxLength={1000}
                onChange={handleChange}
              />
            </div>

            {formError && <p className="mem-pg-err">{formError}</p>}

            <button type="submit" className="mem-pg-submit" disabled={submitting}>
              {submitting ? "Saving…" : "Add Memory"}
            </button>
          </form>
        )}

        {/* Grid */}
        {loading ? (
          <div className="mem-pg-grid">
            {[1, 2, 3, 4].map((i) => <div key={i} className="mem-pg-skeleton" />)}
          </div>
        ) : memories.length === 0 ? (
          <div className="mem-pg-empty">
            <span className="mem-pg-empty-emoji">📸</span>
            <p className="mem-pg-empty-title">No memories yet</p>
            <p className="mem-pg-empty-sub">Start capturing your journey together.</p>
            {!addOpen && (
              <button className="mem-pg-empty-cta" onClick={openAdd}>
                Add First Memory
              </button>
            )}
          </div>
        ) : (
          <div className="mem-pg-grid">
            {memories.map((mem) => {
              const icon = MEMORY_TYPE_ICON[mem.memoryType] || "💫";
              const bg   = MEMORY_TYPE_BG[mem.memoryType]   || "rgba(100,100,100,0.08)";
              const hasPhoto = mem.photos?.length > 0;
              return (
                <div key={mem._id} className="mem-pg-card">
                  <div
                    className="mem-pg-card-thumb"
                    style={{ background: hasPhoto ? "transparent" : bg }}
                  >
                    {hasPhoto ? (
                      <img
                        src={mem.photos[0]}
                        alt={mem.title}
                        className="mem-pg-card-photo"
                        loading="lazy"
                      />
                    ) : (
                      <span className="mem-pg-card-icon">{icon}</span>
                    )}
                  </div>
                  <div className="mem-pg-card-body">
                    <p className="mem-pg-card-title">{mem.title}</p>
                    {mem.description && (
                      <p className="mem-pg-card-desc">{mem.description}</p>
                    )}
                    <div className="mem-pg-card-foot">
                      <span className="mem-pg-card-type">{icon} {mem.memoryType}</span>
                      <span className="mem-pg-card-date">{formatDate(mem.memoryDate)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Memories;
