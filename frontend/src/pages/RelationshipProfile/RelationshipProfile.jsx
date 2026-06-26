import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import BackHeader from "../../components/common/BackHeader/BackHeader";
import PersonalGallery from "../../components/gallery/PersonalGallery/PersonalGallery";
import { getRelationshipProfile } from "../../services/profile.service";
import { setCouplePhotos } from "../../services/couple.service";
import { uploadPhoto } from "../../services/users.service";
import { compressImage } from "../../utils/compressImage";
import "./RelationshipProfile.css";

const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const LINKS = [
  { label: "Shared Timeline", emoji: "📖", to: "/journey" },
  { label: "Memories", emoji: "🖼", to: "/memories" },
  { label: "Bucket List", emoji: "🎯", to: "/bucket-list" },
  { label: "Chat", emoji: "💬", to: "/chat" },
  { label: "Passport", emoji: "❤️", to: "/passport" },
  { label: "Trust Center", emoji: "🛡", to: "/trust-center" },
];

const RelationshipProfile = () => {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  const coverRef = useRef(null);
  const photoRef = useRef(null);

  useEffect(() => {
    getRelationshipProfile()
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Couldn't load the relationship profile."),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleUpload = async (file, field) => {
    if (!file) return;
    setUploading(true);
    try {
      const compressed = await compressImage(file);
      const dataUrl = await fileToDataUrl(compressed);
      const type = field === "coverPhoto" ? "cover" : "avatar";
      const res = await uploadPhoto(dataUrl, undefined, type);
      const url = res.data.url;
      await setCouplePhotos({ [field]: url });
      setData((prev) => (prev ? { ...prev, couple: { ...prev.couple, [field]: url } } : prev));
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="rprof">
        <BackHeader title="Relationship" fallback="/dashboard" />
        <p className="rprof__msg">Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rprof">
        <BackHeader title="Relationship" fallback="/dashboard" />
        <p className="rprof__msg">{error || "No relationship yet."}</p>
      </div>
    );
  }

  const { couple, daysTogether, loveMeter, health, level, badge, xp, streak, achievements } = data;

  return (
    <div className="rprof">
      <BackHeader title="Relationship" fallback="/dashboard" />

      {/* Cover + relationship photo */}
      <div
        className="rprof__cover"
        style={couple.coverPhoto ? { backgroundImage: `url(${couple.coverPhoto})` } : undefined}
      >
        {!couple.coverPhoto && <div className="rprof__cover-fallback" aria-hidden="true" />}
        <button className="rprof__cover-edit" onClick={() => coverRef.current?.click()} disabled={uploading}>
          📷
        </button>

        <div className="rprof__photo-wrap">
          <div className="rprof__photo">
            {couple.relationshipPhoto ? (
              <img src={couple.relationshipPhoto} alt="The two of you" />
            ) : (
              <span>💞</span>
            )}
          </div>
          <button className="rprof__photo-edit" onClick={() => photoRef.current?.click()} disabled={uploading}>
            📷
          </button>
        </div>
      </div>

      <div className="rprof__content">
        <div className="rprof__badges">
          {badge && <span className="rprof__badge">{badge.emoji} {badge.label}</span>}
          <span className="rprof__badge rprof__badge--alt">Lvl {level}</span>
        </div>

        {/* Love Meter */}
        <div className="rprof__meter-card">
          <div className="rprof__meter">
            <span className="rprof__meter-num">{loveMeter != null ? loveMeter : "—"}</span>
            <span className="rprof__meter-label">Love Meter</span>
          </div>
          <div className="rprof__meter-stats">
            <Stat label="Health" value={health?.score != null ? `${health.score}%` : "—"} />
            <Stat label="Days" value={daysTogether} />
            <Stat label="Streak" value={`${streak?.current ?? 0}🔥`} />
          </div>
        </div>

        {/* XP */}
        {xp && (
          <div className="rprof__xp-card">
            <div className="rprof__xp-head">
              <span>Relationship XP</span>
              <span className="rprof__xp-val">{xp.totalXP} XP</span>
            </div>
            <div className="rprof__xp-track">
              <div className="rprof__xp-fill" style={{ width: `${Math.round((xp.levelProgress || 0) * 100)}%` }} />
            </div>
            <div className="rprof__xp-foot">
              <span>{achievements.unlocked}/{achievements.total} achievements</span>
              <span>+{xp.xpThisWeek} this week</span>
            </div>
          </div>
        )}

        {/* Quick links */}
        <div className="rprof__links">
          {LINKS.map((l) => (
            <button key={l.to} className="rprof__link" onClick={() => navigate(l.to)}>
              <span className="rprof__link-emoji">{l.emoji}</span>
              <span className="rprof__link-label">{l.label}</span>
            </button>
          ))}
        </div>

        {/* Shared gallery */}
        <div className="rprof__gallery">
          <PersonalGallery scope="relationship" editable title="Shared Gallery" />
        </div>
      </div>

      <input ref={coverRef} type="file" accept="image/*" hidden onChange={(e) => { handleUpload(e.target.files?.[0], "coverPhoto"); e.target.value = ""; }} />
      <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => { handleUpload(e.target.files?.[0], "relationshipPhoto"); e.target.value = ""; }} />
    </div>
  );
};

const Stat = ({ label, value }) => (
  <div className="rprof__stat">
    <span className="rprof__stat-num">{value}</span>
    <span className="rprof__stat-label">{label}</span>
  </div>
);

export default RelationshipProfile;
