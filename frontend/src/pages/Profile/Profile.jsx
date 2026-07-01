import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { getPersonalProfile, getJourney } from "../../services/profile.service";
import { uploadPhoto, updateProfile } from "../../services/users.service";
import { compressImage } from "../../utils/compressImage";
import ProfileHeader from "../../components/profile/ProfileHeader/ProfileHeader";
import ProfileStats from "../../components/profile/ProfileStats/ProfileStats";
import JourneyCard from "../../components/profile/JourneyCard/JourneyCard";
import PersonalGallery from "../../components/gallery/PersonalGallery/PersonalGallery";
import ProfileMoments from "../../components/moments/ProfileMoments/ProfileMoments";
import "./Profile.css";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const Profile = () => {
  const { user, logout, updateUser } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [journey, setJourney] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const coverInputRef = useRef(null);
  const avatarInputRef = useRef(null);

  useEffect(() => {
    getPersonalProfile()
      .then((res) => setProfile(res.data))
      .catch(() => {});
    getJourney()
      .then((res) => setJourney(res.data))
      .catch(() => {}); // no partner → journey is optional
  }, []);

  const handleUpload = async (file, type) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const compressed = await compressImage(file);
      const dataUrl = await fileToDataUrl(compressed);
      const res = await uploadPhoto(dataUrl, undefined, type);
      const url = res.data.url;
      const field = type === "cover" ? "coverPhoto" : "profilePhoto";
      await updateProfile({ [field]: url });
      updateUser({ [field]: url });
      setProfile((prev) =>
        prev ? { ...prev, user: { ...prev.user, [field]: url } } : prev,
      );
    } catch (err) {
      setError(err.response?.data?.message || "Photo upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  };

  if (!user) return null;

  // Prefer the freshest auth user for header identity; merge aggregator extras.
  const headerUser = {
    ...(profile?.user || {}),
    name: user.name,
    username: user.username ?? profile?.user?.username,
    profilePhoto: user.profilePhoto ?? profile?.user?.profilePhoto,
    coverPhoto: user.coverPhoto ?? profile?.user?.coverPhoto,
    bio: user.bio ?? profile?.user?.bio,
    birthday: user.birthday ?? profile?.user?.birthday,
    joinedDate: profile?.user?.joinedDate || user.createdAt,
  };

  return (
    <div className="prof-pg">
      <div className="prof-pg-content">
        <ProfileHeader
          user={headerUser}
          relationship={profile?.relationship}
          editable
          uploading={uploading}
          onEditCover={() => coverInputRef.current?.click()}
          onEditAvatar={() => avatarInputRef.current?.click()}
        />

        {error && <p className="prof-pg-error">{error}</p>}

        <ProfileStats stats={profile?.stats} />

        {/* Personal gallery */}
        <div className="prof-pg-card">
          <PersonalGallery scope="personal" editable title="Gallery" />
        </div>

        {/* Saved Moments (Feature 17) — renders nothing when empty */}
        <ProfileMoments ownerId="me" title="Your Moments" />

        {/* CoupleCare Journey */}
        {journey && <JourneyCard journey={journey} />}

        {/* Quick links */}
        <div className="prof-pg-links">
          <button className="prof-pg-link" onClick={() => navigate("/edit-profile")}>
            <span>✏️ Edit Profile</span>
            <span className="prof-pg-link__chev">›</span>
          </button>
          {user.currentCoupleId && (
            <>
              <button className="prof-pg-link" onClick={() => navigate("/relationship")}>
                <span>💞 Relationship Profile</span>
                <span className="prof-pg-link__chev">›</span>
              </button>
              <button className="prof-pg-link" onClick={() => navigate("/passport")}>
                <span>❤️ Relationship Passport</span>
                <span className="prof-pg-link__chev">›</span>
              </button>
              <button className="prof-pg-link" onClick={() => navigate("/trust-center")}>
                <span>🛡 Trust Center</span>
                <span className="prof-pg-link__chev">›</span>
              </button>
            </>
          )}
          <button className="prof-pg-link" onClick={() => navigate("/security")}>
            <span>🛡️ Security Center</span>
            <span className="prof-pg-link__chev">›</span>
          </button>
          <button className="prof-pg-link" onClick={() => navigate("/privacy")}>
            <span>🔒 Privacy & Visibility</span>
            <span className="prof-pg-link__chev">›</span>
          </button>
          <button className="prof-pg-link" onClick={() => navigate("/settings")}>
            <span>⚙️ Settings</span>
            <span className="prof-pg-link__chev">›</span>
          </button>
        </div>

        <button className="prof-pg-logout" onClick={logout}>
          Sign Out
        </button>

        <p className="prof-pg-version">CoupleCare · Your love, tracked</p>
      </div>

      <input
        ref={coverInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          handleUpload(e.target.files?.[0], "cover");
          e.target.value = "";
        }}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          handleUpload(e.target.files?.[0], "avatar");
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default Profile;
