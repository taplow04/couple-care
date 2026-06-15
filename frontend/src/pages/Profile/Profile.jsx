import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Profile.css";

const getInitials = (name = "") =>
  name.split(" ").map((p) => p[0]).join("").toUpperCase().slice(0, 2);

const PREFS = [
  { key: "notificationsEnabled",  label: "Notifications" },
  { key: "aiInsightsEnabled",     label: "AI Insights" },
  { key: "moodRemindersEnabled",  label: "Mood Reminders" },
  { key: "memoryRemindersEnabled",label: "Memory Reminders" },
];

const Profile = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="prof-pg">
      <div className="prof-pg-content">

        {/* Hero */}
        <div className="prof-pg-hero">
          <div className="prof-pg-avatar">
            {user.profilePhoto ? (
              <img
                src={user.profilePhoto}
                alt={user.name}
                className="prof-pg-avatar-img"
              />
            ) : (
              <span className="prof-pg-avatar-init">{getInitials(user.name)}</span>
            )}
          </div>
          <h1 className="prof-pg-name">{user.name}</h1>
          <p className="prof-pg-email">{user.email}</p>
          {user.emailVerified && (
            <span className="prof-pg-verified">✓ Email Verified</span>
          )}
        </div>

        {/* Bio */}
        {user.bio && (
          <div className="prof-pg-card">
            <p className="prof-pg-section-label">About</p>
            <p className="prof-pg-bio">{user.bio}</p>
          </div>
        )}

        {/* Interests */}
        {(user.hobbies?.length > 0 || user.likes?.length > 0) && (
          <div className="prof-pg-card">
            {user.hobbies?.length > 0 && (
              <>
                <p className="prof-pg-section-label">Hobbies</p>
                <div className="prof-pg-tags">
                  {user.hobbies.map((h) => (
                    <span key={h} className="prof-pg-tag">{h}</span>
                  ))}
                </div>
              </>
            )}
            {user.likes?.length > 0 && (
              <div style={{ marginTop: user.hobbies?.length > 0 ? 14 : 0 }}>
                <p className="prof-pg-section-label">Likes</p>
                <div className="prof-pg-tags">
                  {user.likes.map((l) => (
                    <span key={l} className="prof-pg-tag prof-pg-tag--like">{l}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Preferences */}
        <div className="prof-pg-card">
          <p className="prof-pg-section-label">Preferences</p>
          {PREFS.map(({ key, label }) => (
            <div key={key} className="prof-pg-pref">
              <span className="prof-pg-pref-label">{label}</span>
              <span
                className={`prof-pg-pref-badge${user.settings?.[key] ? " prof-pg-pref-badge--on" : ""}`}
              >
                {user.settings?.[key] ? "On" : "Off"}
              </span>
            </div>
          ))}
        </div>

        {/* Account actions */}
        <div className="prof-pg-actions">
          <button className="prof-pg-action-btn" onClick={() => navigate("/edit-profile")}>
            ✏️ Edit Profile
          </button>
          <button className="prof-pg-action-btn" onClick={() => navigate("/settings")}>
            ⚙️ Settings
          </button>
        </div>

        {/* Sign Out */}
        <button className="prof-pg-logout" onClick={logout}>
          Sign Out
        </button>

        <p className="prof-pg-version">CoupleCare · Your love, tracked</p>
      </div>
    </div>
  );
};

export default Profile;
