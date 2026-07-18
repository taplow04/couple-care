import { useState, useEffect, useCallback } from "react";
import {
  getAssistantContext,
  getAssistantSuggestions,
  rephraseDraft,
  checkDraft,
} from "../../../services/chatAssistant.service";
import "./AiAssistant.css";

/**
 * AI Relationship Assistant — premium bottom sheet over the chat.
 *
 * Mounted ONLY while open (fresh state every time, no reset effects).
 * The context payload (insight + dynamic chips + curated suggestions) is
 * deterministic and instant; tapping a mode chip asks the AI for
 * conversation-aware suggestions (draft-aware). Everything is optional —
 * a tap only fills the composer, the user always decides what to send.
 */

const TONES = ["calmer", "warmer", "clearer", "more supportive", "more playful"];

const MOOD_EMOJI = {
  happy: "😊", sad: "💙", angry: "😤", stressed: "😮‍💨",
  loved: "🥰", excited: "🤩", anxious: "😟",
};

const AiAssistant = ({ draft, onUse, onClose }) => {
  const [context, setContext] = useState(null);
  const [ctxLoading, setCtxLoading] = useState(true);
  const [activeMode, setActiveMode] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState(null); // null = use context bank
  const [sugLoading, setSugLoading] = useState(false);
  const [sugSource, setSugSource] = useState("curated");
  const [rephraseOptions, setRephraseOptions] = useState(null);
  const [rephrasing, setRephrasing] = useState(false);
  const [draftCheckRes, setDraftCheckRes] = useState(null);
  const [error, setError] = useState("");

  // Load the deterministic context once per open (component mounts on open).
  useEffect(() => {
    let active = true;
    getAssistantContext()
      .then((res) => {
        if (!active) return;
        setContext(res.data);
        setCtxLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setCtxLoading(false);
        setError("The assistant couldn't read the conversation right now.");
      });
    return () => {
      active = false;
    };
  }, []);

  // Live draft analysis — debounced, deterministic, advisory only.
  useEffect(() => {
    const text = (draft || "").trim();
    if (!text) {
      return undefined;
    }
    let active = true;
    const t = setTimeout(() => {
      checkDraft(text)
        .then((res) => {
          if (active) setDraftCheckRes(res.data);
        })
        .catch(() => {});
    }, 500);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [draft]);

  const pickMode = useCallback(
    (key) => {
      setActiveMode(key);
      setSugLoading(true);
      setError("");
      getAssistantSuggestions({ mode: key, draft: (draft || "").trim() || undefined })
        .then((res) => {
          setAiSuggestions(res.data.suggestions);
          setSugSource(res.data.source);
          setSugLoading(false);
        })
        .catch(() => {
          setSugLoading(false);
          setError("Couldn't generate suggestions — showing curated ideas instead.");
        });
    },
    [draft],
  );

  const doRephrase = useCallback(
    (tone) => {
      const text = (draft || "").trim();
      if (!text) return;
      setRephrasing(true);
      setError("");
      rephraseDraft({ draft: text, tone })
        .then((res) => {
          setRephraseOptions(res.data.options);
          setRephrasing(false);
        })
        .catch((err) => {
          setRephrasing(false);
          setError(err.response?.data?.message || "Couldn't rephrase right now.");
        });
    },
    [draft],
  );

  const applyText = useCallback(
    (text) => {
      onUse?.(text);
      onClose?.();
    },
    [onUse, onClose],
  );

  const suggestions = aiSuggestions ?? context?.suggestions ?? [];
  const chips = context?.chips ?? [];
  const extraModes = (context?.modes ?? []).filter(
    (m) => !chips.some((c) => c.key === m.key),
  );
  const hasDraft = !!(draft || "").trim();

  return (
    <div className="aia-backdrop" onClick={onClose} role="presentation">
      <div
        className="aia-sheet"
        role="dialog"
        aria-modal="true"
        aria-label="AI relationship assistant"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="aia-grabber" aria-hidden="true" />

        {/* Header */}
        <div className="aia-head">
          <span className="aia-orb" aria-hidden="true">
            <span className="aia-orb__core">✨</span>
          </span>
          <div className="aia-head__titles">
            <p className="aia-title">Relationship Assistant</p>
            <p className="aia-sub">Helps you say it well — you always decide</p>
          </div>
          <button type="button" className="aia-close" onClick={onClose} aria-label="Close assistant">
            ✕
          </button>
        </div>

        <div className="aia-body">
          {/* Insight */}
          {ctxLoading ? (
            <div className="aia-insight aia-skel" />
          ) : context ? (
            <div className="aia-insight">
              <p className="aia-insight__text">{context.insight}</p>
              <div className="aia-insight__meta">
                {context.pulseScore != null && (
                  <span className="aia-meta-chip">💓 Pulse {context.pulseScore}</span>
                )}
                {context.signals?.partnerMood && (
                  <span className="aia-meta-chip">
                    {MOOD_EMOJI[context.signals.partnerMood] || "🙂"} Partner logged{" "}
                    {context.signals.partnerMood}
                  </span>
                )}
                {context.signals?.silenceHours >= 20 && (
                  <span className="aia-meta-chip">🕊 Quiet for {context.signals.silenceHours}h</span>
                )}
              </div>
            </div>
          ) : null}

          {error && <p className="aia-error">{error}</p>}

          {/* Draft coach — only when the user has typed something */}
          {hasDraft && (
            <div className="aia-section">
              <p className="aia-label">Your draft</p>
              <p className="aia-draft selectable">“{draft.trim()}”</p>
              {draftCheckRes?.notes?.length > 0 && (
                <ul className="aia-notes">
                  {draftCheckRes.notes.map((n) => (
                    <li key={n} className="aia-note">{n}</li>
                  ))}
                </ul>
              )}
              <div className="aia-tones">
                {TONES.map((t) => (
                  <button
                    key={t}
                    type="button"
                    className="aia-tone"
                    disabled={rephrasing}
                    onClick={() => doRephrase(t)}
                  >
                    ✨ {t}
                  </button>
                ))}
              </div>
              {rephrasing && <div className="aia-sug aia-skel" />}
              {rephraseOptions?.map((opt, i) => (
                <button
                  key={opt}
                  type="button"
                  className="aia-sug"
                  style={{ "--i": i }}
                  onClick={() => applyText(opt)}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Dynamic mode chips */}
          <div className="aia-section">
            <p className="aia-label">
              {hasDraft ? "Or write something new" : "What do you want to say?"}
            </p>
            <div className="aia-chips">
              {chips.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`aia-chip aia-chip--primary ${activeMode === c.key ? "aia-chip--on" : ""}`}
                  onClick={() => pickMode(c.key)}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
              {extraModes.map((c) => (
                <button
                  key={c.key}
                  type="button"
                  className={`aia-chip ${activeMode === c.key ? "aia-chip--on" : ""}`}
                  onClick={() => pickMode(c.key)}
                >
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Suggestions */}
          <div className="aia-section">
            <div className="aia-label-row">
              <p className="aia-label">Tap to use — edit before sending</p>
              {!sugLoading && aiSuggestions && (
                <span className={`aia-source aia-source--${sugSource}`}>
                  {sugSource === "ai" ? "AI · this conversation" : "curated"}
                </span>
              )}
            </div>
            {sugLoading ? (
              <>
                <div className="aia-sug aia-skel" />
                <div className="aia-sug aia-skel" />
                <div className="aia-sug aia-skel" />
              </>
            ) : (
              suggestions.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  className="aia-sug"
                  style={{ "--i": i }}
                  onClick={() => applyText(s)}
                >
                  {s}
                </button>
              ))
            )}
          </div>

          {/* Relationship repair (quiet conversations) */}
          {context?.repair && (
            <div className="aia-section">
              <p className="aia-label">💞 Reconnect ideas</p>
              {context.repair.map((r) => (
                <div key={r.title} className="aia-repair">
                  <span className="aia-repair__emoji" aria-hidden="true">{r.emoji}</span>
                  <div>
                    <p className="aia-repair__title">{r.title}</p>
                    <p className="aia-repair__text">{r.text}</p>
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="aia-basis">
            {context?.basis ||
              "Based only on your recent CoupleCare messages, mood logs and activity."}{" "}
            Suggestions are optional — nothing is ever sent for you.
          </p>
        </div>
      </div>
    </div>
  );
};

export default AiAssistant;
