import { useEffect, useState } from "react";

import { getExploreSettings, updateExploreSettings } from "../../../services/explore.service";
import "./ExploreSettings.css";

// Manage the public Relationship Profile: handle, bio, and the explicit
// "Show in Explore" opt-in. PRIVATE by default (enforced server-side).
const ExploreSettings = ({ onClose, onSaved }) => {
  const [loading, setLoading] = useState(true);
  const [hasCouple, setHasCouple] = useState(true);
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getExploreSettings()
      .then((res) => {
        if (!active) return;
        const d = res.data;
        setHasCouple(d.hasCouple);
        if (d.hasCouple) {
          setUsername(d.relationshipUsername || "");
          setBio(d.relationshipBio || "");
          setIsPublic(d.isPublic || false);
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
      const res = await updateExploreSettings({
        relationshipUsername: username,
        relationshipBio: bio,
        exploreVisibility: isPublic ? "public" : "private",
      });
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
        <h3 className="expset__title">Your Relationship Profile</h3>

        {loading ? (
          <p className="expset__empty">Loading…</p>
        ) : !hasCouple ? (
          <p className="expset__empty">
            Connect with your partner first to create a shared Relationship Profile.
          </p>
        ) : (
          <>
            <label className="expset__label">Relationship username</label>
            <div className="expset__handle">
              <span>@</span>
              <input
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
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
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="A little about the two of you…"
              maxLength={300}
              rows={3}
            />

            <button
              type="button"
              className={`expset__toggle${isPublic ? " is-on" : ""}`}
              onClick={() => setIsPublic((v) => !v)}
              role="switch"
              aria-checked={isPublic}
            >
              <span className="expset__toggle-text">
                <span className="expset__toggle-title">🌍 Show in Explore</span>
                <span className="expset__toggle-sub">
                  Let others discover your public posts. Off by default.
                </span>
              </span>
              <span className="expset__switch"><span className="expset__knob" /></span>
            </button>

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
