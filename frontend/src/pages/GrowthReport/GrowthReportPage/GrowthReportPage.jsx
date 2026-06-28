import { useEffect, useState } from "react";

import BackHeader from "../../../components/common/BackHeader/BackHeader";
import {
  getReportQuestions,
  getGrowthReport,
  createGrowthReport,
} from "../../../services/lifecycle.service";
import "./GrowthReportPage.css";

const GrowthReportPage = () => {
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [existing, setExisting] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getReportQuestions(), getGrowthReport()])
      .then(([q, r]) => {
        if (!active) return;
        setQuestions(q.data?.questions || []);
        setExisting(r.data || null);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const submit = async () => {
    const payload = questions
      .map((q) => ({ question: q, answer: (answers[q] || "").trim() }))
      .filter((a) => a.answer);
    if (payload.length === 0 || submitting) return;
    setSubmitting(true);
    try {
      const res = await createGrowthReport(payload);
      setExisting(res.data);
      setShowForm(false);
    } catch {
      /* retry */
    } finally {
      setSubmitting(false);
    }
  };

  const renderReport = () => (
    <div className="greport__result">
      <div className="greport__badge">📝 Your Growth Report</div>
      <p className="greport__text">{existing.aiReport?.text}</p>
      {existing.answers?.length > 0 && (
        <div className="greport__answers">
          <h4 className="greport__answers-title">Your reflections</h4>
          {existing.answers.map((a, i) => (
            <div key={i} className="greport__qa">
              <div className="greport__q">{a.question}</div>
              <div className="greport__a">{a.answer}</div>
            </div>
          ))}
        </div>
      )}
      <button className="greport__btn greport__btn--ghost" onClick={() => { setShowForm(true); setExisting(null); }}>
        Write a new reflection
      </button>
    </div>
  );

  const renderForm = () => (
    <div className="greport__form">
      <p className="greport__intro">
        Take a quiet moment. These reflections are <strong>completely private</strong> —
        only you will ever see them.
      </p>
      {questions.map((q) => (
        <div key={q} className="greport__field">
          <label className="greport__label">{q}</label>
          <textarea
            className="greport__textarea"
            value={answers[q] || ""}
            onChange={(e) => setAnswers((a) => ({ ...a, [q]: e.target.value }))}
            placeholder="Take your time…"
          />
        </div>
      ))}
      <button className="greport__btn" onClick={submit} disabled={submitting}>
        {submitting ? "Reflecting…" : "Create my report"}
      </button>
    </div>
  );

  return (
    <div className="greport">
      <BackHeader title="Growth Report" subtitle="Private reflection" fallback="/dashboard" />
      <div className="greport__body">
        {loading ? (
          <p className="greport__msg">Loading…</p>
        ) : existing && !showForm ? (
          renderReport()
        ) : (
          renderForm()
        )}
      </div>
    </div>
  );
};

export default GrowthReportPage;
