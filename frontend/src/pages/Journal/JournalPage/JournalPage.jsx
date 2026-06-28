import { useEffect, useState } from "react";

import BackHeader from "../../../components/common/BackHeader/BackHeader";
import JournalQuickCard from "../../../components/growth/JournalQuickCard";
import { getJournal, deleteJournal } from "../../../services/growth.service";

import "./JournalPage.css";

const TYPE_META = {
  journal: { icon: "📓", label: "Journal" },
  reflection: { icon: "🪞", label: "Reflection" },
  gratitude: { icon: "🙏", label: "Gratitude" },
};

const fmtDate = (d) =>
  new Date(d).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

const FILTERS = ["all", "journal", "reflection", "gratitude"];

const JournalPage = () => {
  const [entries, setEntries] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);

  const load = () => {
    getJournal()
      .then((r) => setEntries(r.data || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    let active = true;
    getJournal()
      .then((r) => active && setEntries(r.data || []))
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const remove = async (id) => {
    setEntries((prev) => prev.filter((e) => e._id !== id));
    try {
      await deleteJournal(id);
    } catch {
      load();
    }
  };

  const shown = filter === "all" ? entries : entries.filter((e) => e.type === filter);

  return (
    <div className="journal-page">
      <BackHeader title="Journal" subtitle="A private space for your thoughts" fallback="/dashboard" />

      <div className="journal-page__body">
        <JournalQuickCard type="journal" onSaved={(e) => e && setEntries((prev) => [e, ...prev])} />

        <div className="journal-filters">
          {FILTERS.map((f) => (
            <button
              key={f}
              className={`journal-filter ${filter === f ? "journal-filter--on" : ""}`}
              onClick={() => setFilter(f)}
            >
              {f === "all" ? "All" : TYPE_META[f].label}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="journal-empty">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="journal-empty">No entries yet. Start writing above. 🌱</p>
        ) : (
          <div className="journal-list">
            {shown.map((e) => {
              const meta = TYPE_META[e.type] || TYPE_META.journal;
              return (
                <div key={e._id} className="journal-entry">
                  <div className="journal-entry__head">
                    <span className="journal-entry__type">{meta.icon} {meta.label}</span>
                    <span className="journal-entry__date">{fmtDate(e.createdAt)}</span>
                    <button
                      className="journal-entry__del"
                      onClick={() => remove(e._id)}
                      aria-label="Delete entry"
                    >
                      ✕
                    </button>
                  </div>
                  {e.prompt && <p className="journal-entry__prompt">{e.prompt}</p>}
                  <p className="journal-entry__content">{e.content}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalPage;
