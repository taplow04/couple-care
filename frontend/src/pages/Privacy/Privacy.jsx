import { useEffect, useState } from "react";
import BackHeader from "../../components/common/BackHeader/BackHeader";
import PrivacySelect from "../../components/settings/PrivacySelect/PrivacySelect";
import { getPrivacy, updatePrivacy } from "../../services/privacy.service";
import "./Privacy.css";

// Grouped granular controls. Each maps 1:1 to a User.privacy key.
const SECTIONS = [
  {
    title: "Profile",
    items: [
      { key: "profileVisibility", icon: "👤", label: "Profile", description: "Your overall profile details" },
      { key: "bioVisibility", icon: "📝", label: "Bio", description: "Your about text" },
      { key: "birthdayVisibility", icon: "🎂", label: "Birthday", description: "Your birth date" },
    ],
  },
  {
    title: "Media",
    items: [
      { key: "galleryVisibility", icon: "🖼", label: "Personal Gallery", description: "Photos in your personal gallery" },
      { key: "videoVisibility", icon: "🎬", label: "Videos", description: "Videos in your personal gallery" },
      { key: "relationshipGalleryVisibility", icon: "💞", label: "Relationship Gallery", description: "Your shared couple gallery" },
    ],
  },
  {
    title: "Activity & Insights",
    items: [
      { key: "moodVisibility", icon: "😊", label: "Mood History", description: "Your logged moods" },
      { key: "sleepVisibility", icon: "😴", label: "Sleep Data", description: "Your sleep logs & analysis" },
      { key: "activityVisibility", icon: "⚡", label: "Activity Summary", description: "Your recent activity" },
      { key: "aiVisibility", icon: "🤖", label: "AI Reports", description: "AI insights & badges" },
      { key: "transparencyVisibility", icon: "🛡", label: "Transparency Report", description: "Your Trust Center figures" },
      { key: "journeyCountVisibility", icon: "🧭", label: "Relationship History Count", description: "Your CoupleCare journey count" },
    ],
  },
  {
    title: "Lifecycle",
    note: "Your Growth Report is always private — it's never shared with any partner.",
    items: [
      { key: "summaryVisibility", icon: "📜", label: "Relationship Summary", description: "Your past-relationship summary" },
      { key: "loveLanguageVisibility", icon: "💞", label: "Love Language", description: "Your love language card" },
      { key: "attachmentVisibility", icon: "🧷", label: "Attachment Style", description: "Your attachment style card" },
      { key: "healingVisibility", icon: "🌤", label: "Healing Journal", description: "Your healing reflections" },
      { key: "recoveryVisibility", icon: "🌱", label: "Recovery Progress", description: "Your healing progress figures" },
      { key: "aiReflectionVisibility", icon: "🤖", label: "AI Reflections", description: "Prep tips & recovery reflections" },
    ],
  },
];

const Privacy = () => {
  const [privacy, setPrivacy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getPrivacy()
      .then((res) => setPrivacy(res.data))
      .catch(() => setPrivacy({}))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = async (key, value) => {
    setPrivacy((prev) => ({ ...prev, [key]: value }));
    try {
      await updatePrivacy({ [key]: value });
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch {
      // Re-fetch authoritative state on failure.
      getPrivacy().then((res) => setPrivacy(res.data)).catch(() => {});
    }
  };

  return (
    <div className="priv-pg">
      <BackHeader title="Privacy & Visibility" fallback="/profile" />

      <div className="priv-pg__content">
        <p className="priv-pg__intro">
          Choose who can see each part of your profile. <b>Only Me</b> keeps it
          private; <b>Partner</b> and <b>Shared</b> let your partner see it.
        </p>

        {loading ? (
          <p className="priv-pg__loading">Loading…</p>
        ) : (
          SECTIONS.map((section) => (
            <div key={section.title} className="priv-pg__section">
              <h2 className="priv-pg__section-title">{section.title}</h2>
              {section.note && <p className="priv-pg__section-note">{section.note}</p>}
              <div className="priv-pg__list">
                {section.items.map((item) => (
                  <PrivacySelect
                    key={item.key}
                    icon={item.icon}
                    label={item.label}
                    description={item.description}
                    value={privacy?.[item.key] || "partner_only"}
                    onChange={(v) => handleChange(item.key, v)}
                  />
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {saved && <div className="priv-pg__toast">Saved ✓</div>}
    </div>
  );
};

export default Privacy;
