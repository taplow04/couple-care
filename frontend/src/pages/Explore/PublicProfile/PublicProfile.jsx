import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import BackHeader from "../../../components/common/BackHeader/BackHeader";
import PostCard from "../../../components/explore/PostCard/PostCard";
import { getPublicProfile } from "../../../services/explore.service";
import { togetherLabel } from "../../../utils/exploreTaxonomy";
import "./PublicProfile.css";

const PublicProfile = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getPublicProfile(username)
      .then((res) => active && setData(res.data))
      .catch(
        (err) =>
          active &&
          setError(err.response?.data?.message || "This profile isn't available."),
      )
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [username]);

  const couple = data?.couple;

  return (
    <div className="rprofile">
      <BackHeader title={couple?.username ? `@${couple.username}` : "Profile"} fallback="/explore" />

      {loading ? (
        <div className="rprofile__loading">Loading…</div>
      ) : error ? (
        <div className="rprofile__error">
          <span>🔒</span>
          <p>{error}</p>
        </div>
      ) : (
        <div className="rprofile__content">
          {/* Header */}
          <div className="rprofile__cover">
            {couple.coverPhoto && <img src={couple.coverPhoto} alt="" />}
          </div>
          <div className="rprofile__head">
            <span className="rprofile__dp">
              {couple.photo ? <img src={couple.photo} alt={couple.name} /> : "❤️"}
            </span>
            <h1 className="rprofile__name">{couple.name}</h1>
            {couple.username && <p className="rprofile__handle">@{couple.username}</p>}
            {couple.bio && <p className="rprofile__bio">{couple.bio}</p>}

            <div className="rprofile__stats">
              <div className="rprofile__stat">
                <span className="rprofile__stat-n">{data.stats.posts}</span>
                <span className="rprofile__stat-l">Posts</span>
              </div>
              <div className="rprofile__stat">
                <span className="rprofile__stat-n">
                  {Math.max(1, Math.floor((data.stats.daysTogether || 0) / 365)) || 0}
                </span>
                <span className="rprofile__stat-l">Years</span>
              </div>
              <div className="rprofile__stat">
                <span className="rprofile__stat-n">{data.achievements?.length || 0}</span>
                <span className="rprofile__stat-l">Badges</span>
              </div>
            </div>

            {couple.daysTogether ? (
              <span className="rprofile__since">💞 {togetherLabel(couple.daysTogether)}</span>
            ) : null}
          </div>

          {/* Achievements */}
          {data.achievements?.length > 0 && (
            <div className="rprofile__section">
              <h3 className="rprofile__section-title">Achievements</h3>
              <div className="rprofile__badges">
                {data.achievements.map((a) => (
                  <span key={a.key} className="rprofile__badge" title={a.label}>
                    {a.emoji} {a.label}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Posts */}
          <div className="rprofile__section">
            <h3 className="rprofile__section-title">Posts</h3>
            {data.posts.length === 0 ? (
              <p className="rprofile__empty">No public posts yet.</p>
            ) : (
              <div className="rprofile__posts">
                {data.posts.map((p) => (
                  <PostCard key={p._id} post={p} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PublicProfile;
