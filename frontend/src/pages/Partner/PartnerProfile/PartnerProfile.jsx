import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import { getPartnerProfileFull } from "../../../services/profile.service";
import { unmatchPartner } from "../../../services/couple.service";
import ProfileHeader from "../../../components/profile/ProfileHeader/ProfileHeader";
import GalleryGrid from "../../../components/gallery/GalleryGrid/GalleryGrid";
import MediaViewer from "../../../components/gallery/MediaViewer/MediaViewer";
import BackHeader from "../../../components/common/BackHeader/BackHeader";
import ProfileMoments from "../../../components/moments/ProfileMoments/ProfileMoments";
import { getFirstName } from "../../../utils/getFirstName";
import "./PartnerProfile.css";

const MOOD_META = {
  happy: { emoji: "😊", label: "Happy" },
  sad: { emoji: "😢", label: "Sad" },
  angry: { emoji: "😠", label: "Angry" },
  stressed: { emoji: "😰", label: "Stressed" },
  loved: { emoji: "🥰", label: "Loved" },
  excited: { emoji: "🤩", label: "Excited" },
  anxious: { emoji: "😟", label: "Anxious" },
};

const Chips = ({ title, items, tone }) =>
  items && items.length > 0 ? (
    <div className="pp-section">
      <p className="pp-section__title">{title}</p>
      <div className="pp-chips">
        {items.map((it, i) => (
          <span key={i} className={`pp-chip pp-chip--${tone}`}>{it}</span>
        ))}
      </div>
    </div>
  ) : null;

const PartnerProfile = () => {
  const navigate = useNavigate();
  const { loadUser } = useAuth();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [confirmUnmatch, setConfirmUnmatch] = useState(false);
  const [unmatching, setUnmatching] = useState(false);
  const [viewing, setViewing] = useState(null);

  useEffect(() => {
    getPartnerProfileFull()
      .then((res) => setData(res.data))
      .catch((err) =>
        setError(err.response?.data?.message || "Couldn't load partner profile."),
      )
      .finally(() => setLoading(false));
  }, []);

  const handleUnmatch = async () => {
    setUnmatching(true);
    try {
      await unmatchPartner();
      await loadUser();
      navigate("/couple", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't unmatch. Try again.");
      setUnmatching(false);
      setConfirmUnmatch(false);
    }
  };

  if (loading) {
    return (
      <div className="pp">
        <BackHeader title="Partner" fallback="/dashboard" />
        <div className="pp__loading"><div className="pp__spinner" /></div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="pp">
        <BackHeader title="Partner" fallback="/dashboard" />
        <div className="pp__error">{error}</div>
      </div>
    );
  }

  const { partner, relationship, gallery, achievements, journey, trustBadge, aiBadges, moodSummary, recentMoods, stats } = data;
  const firstName = getFirstName(partner?.name, "Partner");
  const dominant = moodSummary?.dominant;

  return (
    <div className="pp">
      <BackHeader title={firstName} fallback="/dashboard" />

      <div className="pp__content">
        <ProfileHeader
          user={partner}
          relationship={{ ...relationship, trustBadge }}
          navigable={false}
        />

        {/* Stats */}
        <div className="pp__stats">
          <Stat num={relationship?.daysTogether ?? 0} label="Days" />
          <Stat num={stats?.memoryCount ?? 0} label="Memories" />
          <Stat num={stats?.chatMessageCount ?? 0} label="Messages" />
          {journey && <Stat num={journey.previous ?? 0} label="Past Journeys" />}
        </div>

        {/* AI badges */}
        {aiBadges && aiBadges.length > 0 && (
          <div className="pp-section">
            <p className="pp-section__title">AI Badges</p>
            <div className="pp-chips">
              {aiBadges.map((b, i) => (
                <span key={i} className="pp-chip pp-chip--primary">{b.emoji} {b.label}</span>
              ))}
            </div>
          </div>
        )}

        {/* Achievements */}
        {achievements && achievements.length > 0 && (
          <div className="pp-section">
            <p className="pp-section__title">Achievements</p>
            <div className="pp-chips">
              {achievements.map((a) => (
                <span key={a.key} className="pp-chip pp-chip--success">{a.emoji} {a.title}</span>
              ))}
            </div>
          </div>
        )}

        {/* Gallery */}
        <div className="pp-section">
          <p className="pp-section__title">Gallery</p>
          {gallery?.hidden ? (
            <p className="pp__muted">🔒 {firstName} keeps their gallery private.</p>
          ) : gallery?.items?.length > 0 ? (
            <GalleryGrid items={gallery.items} onOpen={setViewing} />
          ) : (
            <p className="pp__muted">No photos or videos shared yet.</p>
          )}
        </div>

        {/* Mood summary */}
        {moodSummary ? (
          <div className="pp-section">
            <p className="pp-section__title">Mood Summary</p>
            <div className="pp__mood">
              {dominant ? (
                <>
                  <span className="pp__mood-emoji">{MOOD_META[dominant]?.emoji ?? "🙂"}</span>
                  <div>
                    <p className="pp__mood-dominant">Mostly {MOOD_META[dominant]?.label ?? dominant}</p>
                    <p className="pp__mood-sub">Avg intensity {moodSummary.averageIntensity}/10</p>
                  </div>
                </>
              ) : (
                <p className="pp__mood-sub">No moods logged yet.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="pp-section">
            <p className="pp-section__title">Mood Summary</p>
            <p className="pp__muted">🔒 Mood hidden by {firstName}.</p>
          </div>
        )}

        {/* Recent activity */}
        {recentMoods?.length > 0 && (
          <div className="pp-section">
            <p className="pp-section__title">Recent Activity</p>
            <div className="pp__activity">
              {recentMoods.map((m) => (
                <div key={m._id} className="pp__activity-item">
                  <span>{MOOD_META[m.moodType]?.emoji ?? "🙂"}</span>
                  <span className="pp__activity-text">Felt {MOOD_META[m.moodType]?.label ?? m.moodType}</span>
                  <span className="pp__activity-date">
                    {new Date(m.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Chips title="Hobbies" items={partner.hobbies} tone="primary" />
        <Chips title="Likes" items={partner.likes} tone="success" />
        <Chips title="Dislikes" items={partner.dislikes} tone="muted" />

        {/* Partner's saved Moments (Feature 17) — renders nothing when empty */}
        {partner?._id && (
          <ProfileMoments ownerId={partner._id} title={`${firstName}'s Moments`} />
        )}

        {error && <p className="pp__inline-error">{error}</p>}

        {/* Actions */}
        <div className="pp__actions">
          <button className="pp__btn pp__btn--primary" onClick={() => navigate("/chat")}>💬 Message</button>
          <button className="pp__btn pp__btn--danger" onClick={() => setConfirmUnmatch(true)}>Unmatch Partner</button>
        </div>
      </div>

      {viewing && (
        <MediaViewer key={viewing._id} item={viewing} editable={false} onClose={() => setViewing(null)} />
      )}

      {confirmUnmatch && (
        <div className="pp__modal-overlay" onClick={() => !unmatching && setConfirmUnmatch(false)}>
          <div className="pp__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="pp__modal-title">Unmatch {firstName}?</h3>
            <p className="pp__modal-text">
              You'll both be disconnected and returned to setup. Your moods,
              memories and chats are kept — you can reconnect later.
            </p>
            <div className="pp__modal-actions">
              <button className="pp__btn pp__btn--ghost" onClick={() => setConfirmUnmatch(false)} disabled={unmatching}>Cancel</button>
              <button className="pp__btn pp__btn--danger" onClick={handleUnmatch} disabled={unmatching}>
                {unmatching ? "Unmatching…" : "Yes, unmatch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const Stat = ({ num, label }) => (
  <div className="pp__stat">
    <span className="pp__stat-num">{num}</span>
    <span className="pp__stat-label">{label}</span>
  </div>
);

export default PartnerProfile;
