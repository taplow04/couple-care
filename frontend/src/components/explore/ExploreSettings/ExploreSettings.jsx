import { useEffect, useState } from "react";

import { getExploreSettings, updateExploreSettings } from "../../../services/explore.service";
import "./ExploreSettings.css";

// Manage BOTH public profiles:
//   • Personal Profile (every user — single / connected / unmatched)
//   • Relationship Profile (couples only)
// Each has its own handle, bio, and explicit "Show in Explore" opt-in. Both are
// PRIVATE by default (enforced server-side).
const ExploreSettings = ({ onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [hasCouple, setHasCouple] = useState(false);

  // Personal profile
  const [pUsername, setPUsername] = useState("");
  const [pBio, setPBio] = useState("");
  const [pPublic, setPPublic] = useState(false);

  // Relationship profile
  const [rUsername, setRUsername] = useState("");
  const [rBio, setRBio] = useState("");
  const [rPublic, setRPublic] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getExploreSettings()
      .then((res) => {
        if (!active) return;
        const d = res.data;
        const personal = d.personal || {};
        const relationship = d.relationship || {};
        setPUsername(personal.username || "");
        setPBio(personal.bio || "");
        setPPublic(personal.isPublic || false);
        setHasCouple(Boolean(relationship.hasCouple));
        if (relationship.hasCouple) {
          setRUsername(relationship.relationshipUsername || "");
          setRBio(relationship.relationshipBio || "");
          setRPublic(relationship.isPublic || false);
        }
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, []);

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const body = {
        personalUsername: pUsername,
        personalBio: pBio,
        personalExploreVisibility: pPublic ? "public" : "private",
      };
      if (hasCouple) {
        body.relationshipUsername = rUsername;
        body.relationshipBio = rBio;
        body.exploreVisibility = rPublic ? "public" : "private";
      }
      const res = await updateExploreSettings(body);
      onSaved?.(res.data);
      onClose?.();
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="expset" role="dialog" aria-modal="true" aria-label="Explore settings">
      <button type="button" className="expset__scrim" aria-label="Close" onClick={onClose} />
      <div className="expset__panel glass">
        <div className="expset__grab" />
        <h3 className="expset__title">Discovery & Public Profiles</h3>

        {loading ? (
          <p className="expset__empty">Loading…</p>
        ) : (
          <>
            {/* ── Personal Profile (everyone) ── */}
            <p className="expset__section-head">🙂 Your Personal Profile</p>

            <label className="expset__label">Username</label>
            <div className="expset__handle">
              <span>@</span>
              <input
                value={pUsername}
                onChange={(e) => setPUsername(e.target.value.toLowerCase())}
                placeholder="your_handle"
                maxLength={20}
                autoCapitalize="none"
                autoCorrect="off"
              />
            </div>
            <p className="expset__hint">3–20 characters · letters, numbers, underscores.</p>

            <label className="expset__label">Bio</label>
            <textarea
              className="expset__bio"
              value={pBio}
              onChange={(e) => setPBio(e.target.value)}
              placeholder="A little about you…"
              maxLength={300}
              rows={2}
            />

            <button
              type="button"
              className={`expset__toggle${pPublic ? " is-on" : ""}`}
              onClick={() => setPPublic((v) => !v)}
              role="switch"
              aria-checked={pPublic}
            >
              <span className="expset__toggle-text">
                <span className="expset__toggle-title">🌍 Show in Explore</span>
                <span className="expset__toggle-sub">
                  Let anyone discover your public personal posts. Off by default.
                </span>
              </span>
              <span className="expset__switch"><span className="expset__knob" /></span>
            </button>

            {/* ── Relationship Profile (couples only) ── */}
            {hasCouple && (
              <>
                <p className="expset__section-head expset__section-head--mt">
                  ❤️ Your Relationship Profile
                </p>

                <label className="expset__label">Relationship username</label>
                <div className="expset__handle">
                  <span>@</span>
                  <input
                    value={rUsername}
                    onChange={(e) => setRUsername(e.target.value.toLowerCase())}
                    placeholder="ritik_monika"
                    maxLength={20}
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
                <p className="expset__hint">3–20 characters · letters, numbers, underscores.</p>

                <label className="expset__label">Relationship bio</label>
                <textarea
                  className="expset__bio"
                  value={rBio}
                  onChange={(e) => setRBio(e.target.value)}
                  placeholder="A little about the two of you…"
                  maxLength={300}
                  rows={2}
                />

                <button
                  type="button"
                  className={`expset__toggle${rPublic ? " is-on" : ""}`}
                  onClick={() => setRPublic((v) => !v)}
                  role="switch"
                  aria-checked={rPublic}
                >
                  <span className="expset__toggle-text">
                    <span className="expset__toggle-title">🌍 Show in Explore</span>
                    <span className="expset__toggle-sub">
                      Let others discover your shared couple posts. Off by default.
                    </span>
                  </span>
                  <span className="expset__switch"><span className="expset__knob" /></span>
                </button>
              </>
            )}

            {error && <p className="expset__error" role="alert">{error}</p>}

            <div className="expset__actions">
              <button type="button" className="expset__cancel" onClick={onClose}>
                Cancel
              </button>
              <button type="button" className="expset__save" onClick={save} disabled={saving}>
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ExploreSettings;
