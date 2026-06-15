import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getSettings, updateSettings } from "../../../services/security.service";
import SettingsSection from "../../../components/settings/SettingsSection/SettingsSection";
import SettingToggle from "../../../components/settings/SettingToggle/SettingToggle";
import "./SettingsPage.css";

const BackIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
    <path d="M19 12H5M5 12L12 19M5 12L12 5"
      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M20 6L9 17L4 12"
      stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const DEFAULT_SETTINGS = {
  notificationsEnabled: true,
  aiInsightsEnabled: true,
  moodRemindersEnabled: true,
  memoryRemindersEnabled: true,
};

const SettingsPage = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Fetch current settings
  useEffect(() => {
    getSettings()
      .then((res) => {
        if (res.data) setSettings({ ...DEFAULT_SETTINGS, ...res.data });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key) => (val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
    setSaveError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaved(false);

    try {
      const res = await updateSettings(settings);
      // Sync settings into auth context so Profile page reflects changes
      updateUser({ settings: res.data });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setSaveError(err.response?.data?.message || "Could not save settings. Try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="settings-pg">
      <div className="settings-pg__content">

        {/* ── Header ── */}
        <div className="settings-pg__header">
          <button
            className="settings-pg__back"
            onClick={() => navigate("/profile")}
            aria-label="Go back"
          >
            <BackIcon />
          </button>
          <div>
            <h1 className="settings-pg__title">Settings</h1>
            <p className="settings-pg__sub">Customize your experience</p>
          </div>
        </div>

        {/* ── Loading skeleton ── */}
        {loading ? (
          <div className="settings-pg__skeletons">
            {[1, 2].map((s) => (
              <div key={s} className="settings-sk">
                <div className="settings-sk__title" />
                <div className="settings-sk__card">
                  {[1, 2].map((r) => <div key={r} className="settings-sk__row" />)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* ── Notification settings ── */}
            <SettingsSection
              title="Notifications"
              description="Choose what you want to be notified about."
            >
              <SettingToggle
                label="Push Notifications"
                description="Receive in-app alerts and reminders"
                icon="🔔"
                checked={settings.notificationsEnabled}
                onChange={toggle("notificationsEnabled")}
              />
              <SettingToggle
                label="Mood Reminders"
                description="Daily reminders to log how you're feeling"
                icon="😊"
                checked={settings.moodRemindersEnabled}
                onChange={toggle("moodRemindersEnabled")}
              />
              <SettingToggle
                label="Memory Reminders"
                description="Reminders for anniversaries and special dates"
                icon="📸"
                checked={settings.memoryRemindersEnabled}
                onChange={toggle("memoryRemindersEnabled")}
              />
            </SettingsSection>

            {/* ── AI settings ── */}
            <SettingsSection
              title="AI & Insights"
              description="Control how AI analyzes your relationship data."
            >
              <SettingToggle
                label="AI Insights"
                description="Get weekly summaries and relationship health scores"
                icon="✨"
                checked={settings.aiInsightsEnabled}
                onChange={toggle("aiInsightsEnabled")}
              />
            </SettingsSection>

            {/* ── Privacy note ── */}
            <div className="settings-pg__privacy">
              <span className="settings-pg__privacy-icon">🔒</span>
              <p className="settings-pg__privacy-text">
                Your data is encrypted and never shared with third parties.
              </p>
            </div>

            {/* ── Save error ── */}
            {saveError && (
              <p className="settings-pg__save-err" role="alert">{saveError}</p>
            )}

            {/* ── Save button ── */}
            <button
              className={`settings-pg__save-btn ${saved ? "settings-pg__save-btn--saved" : ""}`}
              onClick={handleSave}
              disabled={saving || saved}
            >
              {saved ? (
                <>
                  <CheckIcon />
                  Saved!
                </>
              ) : saving ? (
                <span className="settings-pg__spinner" />
              ) : (
                "Save Settings"
              )}
            </button>
          </>
        )}

      </div>
    </div>
  );
};

export default SettingsPage;
