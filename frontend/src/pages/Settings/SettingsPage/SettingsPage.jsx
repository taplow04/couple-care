import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getSettings, updateSettings } from "../../../services/security.service";
import { getPrivacy, updatePrivacy } from "../../../services/privacy.service";
import SettingsSection from "../../../components/settings/SettingsSection/SettingsSection";
import SettingToggle from "../../../components/settings/SettingToggle/SettingToggle";
import PrivacySelect from "../../../components/settings/PrivacySelect/PrivacySelect";
import {
  isPushSupported,
  getPermission,
  subscribeToPush,
  unsubscribeFromPush,
  isSubscribed,
  sendTestPush,
} from "../../../services/push.service";
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

const DEFAULT_PRIVACY = {
  moodVisibility: "partner_only",
  memoryVisibility: "partner_only",
  journeyVisibility: "partner_only",
  aiVisibility: "partner_only",
  profileVisibility: "partner_only",
  activityVisibility: "partner_only",
};

const PRIVACY_ROWS = [
  { key: "profileVisibility", label: "Profile", icon: "👤", description: "Your bio, hobbies, likes & dislikes" },
  { key: "moodVisibility", label: "Moods", icon: "😊", description: "Whether your partner sees your moods" },
  { key: "activityVisibility", label: "Activity", icon: "⚡", description: "Your recent activity on your profile" },
  { key: "memoryVisibility", label: "Memories", icon: "📸", description: "Shared memory visibility" },
  { key: "journeyVisibility", label: "Journey", icon: "🗺️", description: "Your relationship journey view" },
  { key: "aiVisibility", label: "AI Insights", icon: "✨", description: "AI-generated insight visibility" },
];

const SettingsPage = () => {
  const navigate = useNavigate();
  const { updateUser } = useAuth();

  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [privacy, setPrivacy] = useState(DEFAULT_PRIVACY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  // Device-level browser push (separate from the server notification prefs —
  // this manages the actual OS subscription on THIS device).
  const pushSupported = isPushSupported();
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);
  const [pushMsg, setPushMsg] = useState("");

  // Reflect the REAL subscription state for this browser (not just permission).
  useEffect(() => {
    isSubscribed().then(setPushOn);
  }, []);

  const togglePush = async (val) => {
    if (pushBusy) return;
    setPushBusy(true);
    setPushMsg("");
    try {
      if (val) {
        const ok = await subscribeToPush();
        setPushOn(ok);
        if (!ok) {
          setPushMsg(
            getPermission() === "denied"
              ? "Notifications are blocked in your browser/site settings. Enable them there, then try again."
              : "Couldn't enable notifications on this device.",
          );
        }
      } else {
        await unsubscribeFromPush();
        setPushOn(false);
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleTestPush = async () => {
    setPushMsg("Sending…");
    try {
      const { pushEnabled, devices } = await sendTestPush();
      if (!pushEnabled) {
        setPushMsg("Push isn't configured on the server yet.");
      } else if (devices === 0) {
        setPushMsg(
          "No subscribed device found — turn on “Push on this device” above first.",
        );
      } else {
        setPushMsg(
          `Test sent to ${devices} device${devices > 1 ? "s" : ""}. If it doesn't appear, check your OS/browser notification settings.`,
        );
      }
    } catch {
      setPushMsg("Could not send a test notification.");
    }
  };

  // Fetch current settings + privacy in parallel
  useEffect(() => {
    Promise.allSettled([getSettings(), getPrivacy()])
      .then(([settingsRes, privacyRes]) => {
        if (settingsRes.status === "fulfilled" && settingsRes.value.data) {
          setSettings({ ...DEFAULT_SETTINGS, ...settingsRes.value.data });
        }
        if (privacyRes.status === "fulfilled" && privacyRes.value.data) {
          setPrivacy({ ...DEFAULT_PRIVACY, ...privacyRes.value.data });
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const toggle = (key) => (val) => {
    setSettings((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
    setSaveError("");
  };

  const setPrivacyValue = (key) => (val) => {
    setPrivacy((prev) => ({ ...prev, [key]: val }));
    setSaved(false);
    setSaveError("");
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError("");
    setSaved(false);

    try {
      const [settingsRes] = await Promise.all([
        updateSettings(settings),
        updatePrivacy(privacy),
      ]);
      // Sync settings into auth context so Profile page reflects changes
      updateUser({ settings: settingsRes.data });
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
              {pushSupported ? (
                <>
                  <SettingToggle
                    label="Push on this device"
                    description={
                      pushBusy
                        ? "Updating…"
                        : "Get notifications even when the app is closed"
                    }
                    icon="📲"
                    checked={pushOn}
                    onChange={togglePush}
                  />
                  {pushOn && (
                    <button
                      type="button"
                      className="settings-pg__test-push"
                      onClick={handleTestPush}
                    >
                      Send a test notification
                    </button>
                  )}
                  {pushMsg && <p className="settings-pg__push-msg">{pushMsg}</p>}
                </>
              ) : (
                <p className="settings-pg__push-msg">
                  This browser doesn’t support push notifications. On iPhone, add
                  CoupleCare to your Home Screen first.
                </p>
              )}
              <SettingToggle
                label="In-app Alerts"
                description="Receive alerts and reminders inside the app"
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

            {/* ── Privacy & visibility ── */}
            <SettingsSection
              title="Privacy & Visibility"
              description="Control what your partner can see. 'Private' hides it from your partner."
            >
              {PRIVACY_ROWS.map((row) => (
                <PrivacySelect
                  key={row.key}
                  label={row.label}
                  description={row.description}
                  icon={row.icon}
                  value={privacy[row.key]}
                  onChange={setPrivacyValue(row.key)}
                />
              ))}
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
