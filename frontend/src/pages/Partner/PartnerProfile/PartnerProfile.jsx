import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../../context/AuthContext";
import {
  getPartnerProfile,
  unmatchPartner,
} from "../../../services/couple.service";
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

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" }) : null;

const Chips = ({ title, items, tone }) =>
  items && items.length > 0 ? (
    <div className="pp-section">
      <p className="pp-section__title">{title}</p>
      <div className="pp-chips">
        {items.map((it, i) => (
          <span key={i} className={`pp-chip pp-chip--${tone}`}>
            {it}
          </span>
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

  useEffect(() => {
    getPartnerProfile()
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
      await loadUser(); // currentCoupleId now null -> route guard sends to onboarding
      navigate("/couple", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't unmatch. Try again.");
      setUnmatching(false);
      setConfirmUnmatch(false);
    }
  };

  const handleReport = () => {
    // Future-ready placeholder.
    window.alert("Reporting will be available soon. 💗");
  };

  if (loading) {
    return (
      <div className="pp">
        <div className="pp__loading">
          <div className="pp__spinner" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="pp">
        <button className="pp__back" onClick={() => navigate(-1)} aria-label="Back">
          ‹
        </button>
        <div className="pp__error">{error}</div>
      </div>
    );
  }

  const { partner, relationship, stats } = data;
  const initial = partner?.name ? partner.name[0].toUpperCase() : "♥";
  const dominant = stats?.moodSummary?.dominant;

  return (
    <div className="pp">
      <div className="pp__topbar">
        <button className="pp__back" onClick={() => navigate(-1)} aria-label="Back">
          ‹
        </button>
        <span className="pp__topbar-title">Partner</span>
        <div style={{ width: 36 }} />
      </div>

      {/* Hero */}
      <div className="pp__hero">
        <div className="pp__avatar">
          {partner.profilePhoto ? (
            <img src={partner.profilePhoto} alt={partner.name} />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <h1 className="pp__name">{partner.name}</h1>
        {relationship?.startDate && (
          <p className="pp__since">
            Together since {formatDate(relationship.startDate)}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="pp__stats">
        <div className="pp__stat">
          <span className="pp__stat-num">{relationship?.daysTogether ?? 0}</span>
          <span className="pp__stat-label">Days</span>
        </div>
        <div className="pp__stat">
          <span className="pp__stat-num">{stats?.memoryCount ?? 0}</span>
          <span className="pp__stat-label">Memories</span>
        </div>
        <div className="pp__stat">
          <span className="pp__stat-num">{stats?.chatMessageCount ?? 0}</span>
          <span className="pp__stat-label">Messages</span>
        </div>
      </div>

      {partner.restricted && (
        <p className="pp__restricted">
          🔒 Your partner has set their profile to private.
        </p>
      )}

      {/* Bio */}
      {partner.bio && (
        <div className="pp-section">
          <p className="pp-section__title">About</p>
          <p className="pp__bio">{partner.bio}</p>
        </div>
      )}

      {/* Mood summary */}
      {stats?.moodSummary ? (
        <div className="pp-section">
          <p className="pp-section__title">Mood Summary</p>
          <div className="pp__mood">
            {dominant ? (
              <>
                <span className="pp__mood-emoji">{MOOD_META[dominant]?.emoji ?? "🙂"}</span>
                <div>
                  <p className="pp__mood-dominant">
                    Mostly {MOOD_META[dominant]?.label ?? dominant}
                  </p>
                  <p className="pp__mood-sub">
                    Avg intensity {stats.moodSummary.averageIntensity}/10
                  </p>
                </div>
              </>
            ) : (
              <p className="pp__mood-sub">No moods logged yet.</p>
            )}
          </div>
        </div>
      ) : (
        !partner.restricted && (
          <div className="pp-section">
            <p className="pp-section__title">Mood Summary</p>
            <p className="pp__muted">🔒 Mood hidden by your partner.</p>
          </div>
        )
      )}

      {/* Recent activity */}
      {stats?.recentMoods?.length > 0 && (
        <div className="pp-section">
          <p className="pp-section__title">Recent Activity</p>
          <div className="pp__activity">
            {stats.recentMoods.map((m) => (
              <div key={m._id} className="pp__activity-item">
                <span>{MOOD_META[m.moodType]?.emoji ?? "🙂"}</span>
                <span className="pp__activity-text">
                  Felt {MOOD_META[m.moodType]?.label ?? m.moodType}
                </span>
                <span className="pp__activity-date">
                  {new Date(m.createdAt).toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <Chips title="Hobbies" items={partner.hobbies} tone="primary" />
      <Chips title="Likes" items={partner.likes} tone="success" />
      <Chips title="Dislikes" items={partner.dislikes} tone="muted" />

      {partner.birthday && (
        <div className="pp-section">
          <p className="pp-section__title">Birthday</p>
          <p className="pp__bio">🎂 {formatDate(partner.birthday)}</p>
        </div>
      )}

      {error && <p className="pp__inline-error">{error}</p>}

      {/* Actions */}
      <div className="pp__actions">
        <button className="pp__btn pp__btn--primary" onClick={() => navigate("/chat")}>
          💬 Message
        </button>
        <button className="pp__btn pp__btn--ghost" onClick={handleReport}>
          Report an issue
        </button>
        <button
          className="pp__btn pp__btn--danger"
          onClick={() => setConfirmUnmatch(true)}
        >
          Unmatch Partner
        </button>
      </div>

      {/* Unmatch confirm */}
      {confirmUnmatch && (
        <div className="pp__modal-overlay" onClick={() => !unmatching && setConfirmUnmatch(false)}>
          <div className="pp__modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="pp__modal-title">Unmatch {partner.name}?</h3>
            <p className="pp__modal-text">
              You'll both be disconnected and returned to setup. Your moods,
              memories and chats are kept — you can reconnect later.
            </p>
            <div className="pp__modal-actions">
              <button
                className="pp__btn pp__btn--ghost"
                onClick={() => setConfirmUnmatch(false)}
                disabled={unmatching}
              >
                Cancel
              </button>
              <button
                className="pp__btn pp__btn--danger"
                onClick={handleUnmatch}
                disabled={unmatching}
              >
                {unmatching ? "Unmatching…" : "Yes, unmatch"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerProfile;
