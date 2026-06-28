import { useState } from "react";
import {
  submitReadiness,
  submitLoveLanguage,
  submitAttachment,
} from "../../services/growth.service";
import "./growth.css";

const TITLES = {
  readiness: "Relationship Readiness",
  loveLanguage: "Your Love Language",
  attachment: "Your Attachment Style",
};

const SCALE_LABELS = ["Strongly disagree", "Strongly agree"];

/**
 * Generic quiz runner used for the three self-knowledge quizzes. Readiness uses
 * a 1–5 agreement scale; love-language / attachment use single-choice options.
 * Submits to the matching endpoint and shows the cached result.
 */
const QuizModal = ({ kind, questions = [], onClose, onDone }) => {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  const isScale = kind === "readiness";
  const q = questions[step];
  const last = step === questions.length - 1;
  const answered = q ? answers[q.key] != null : false;

  const choose = (val) => setAnswers((a) => ({ ...a, [q.key]: val }));

  const next = async () => {
    if (!answered) return;
    if (!last) {
      setStep((s) => s + 1);
      return;
    }
    setSubmitting(true);
    try {
      let res;
      if (kind === "readiness") res = await submitReadiness(answers);
      else if (kind === "loveLanguage") res = await submitLoveLanguage(answers);
      else res = await submitAttachment(answers);
      setResult(res.data);
      onDone?.(res.data);
    } catch {
      setSubmitting(false);
    }
  };

  return (
    <div className="gquiz__overlay" onClick={onClose}>
      <div className="gquiz__sheet" onClick={(e) => e.stopPropagation()}>
        {result ? (
          <div className="gquiz__result">
            <div className="gquiz__result-emoji">
              {kind === "readiness" ? "💗" : kind === "loveLanguage" ? "💞" : "🧭"}
            </div>
            <div className="gquiz__result-value">
              {kind === "readiness"
                ? `${result.readinessScore}/100`
                : result.label}
            </div>
            <p className="gquiz__result-text">
              {kind === "readiness"
                ? "Your readiness score is saved to your profile."
                : "Saved to your profile. Knowing this helps you love well."}
            </p>
            <div className="gquiz__foot">
              <button className="gbtn gbtn--block" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <>
            <div className="gcard__head" style={{ marginBottom: 4 }}>
              <h3 className="gquiz__title">{TITLES[kind]}</h3>
              <button className="gquiz__close" onClick={onClose} aria-label="Close">×</button>
            </div>
            <p className="gquiz__progress">Question {step + 1} of {questions.length}</p>

            <p className="gquiz__q">{q?.text}</p>

            {isScale ? (
              <>
                <div className="gquiz__scale">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      className={`${answers[q.key] === n ? "gquiz__opt--on" : ""}`}
                      onClick={() => choose(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <div className="gquiz__scale-labels">
                  <span>{SCALE_LABELS[0]}</span>
                  <span>{SCALE_LABELS[1]}</span>
                </div>
              </>
            ) : (
              <div className="gquiz__opts">
                {q?.options?.map((opt) => (
                  <button
                    key={opt.value + opt.label}
                    className={`gquiz__opt ${answers[q.key] === opt.value ? "gquiz__opt--on" : ""}`}
                    onClick={() => choose(opt.value)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}

            <div className="gquiz__foot">
              {step > 0 && (
                <button className="gbtn gbtn--ghost" onClick={() => setStep((s) => s - 1)}>
                  Back
                </button>
              )}
              <button
                className="gbtn gbtn--block"
                onClick={next}
                disabled={!answered || submitting}
              >
                {submitting ? "Saving…" : last ? "Finish" : "Next"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default QuizModal;
