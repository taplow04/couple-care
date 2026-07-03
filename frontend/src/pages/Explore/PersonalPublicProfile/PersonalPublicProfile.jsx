import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";

import BackHeader from "../../../components/common/BackHeader/BackHeader";
import PostCard from "../../../components/explore/PostCard/PostCard";
import { getUserPublicProfile } from "../../../services/explore.service";
// Reuse the relationship public-profile styles (.rprofile*) — same layout.
import "../PublicProfile/PublicProfile.css";

// Public PERSONAL profile — reachable by ANY user (single / connected /
// unmatched). Shows public personal posts + gamification badges only; never
// moods, chat, or private data.
const PersonalPublicProfile = () => {
  const { username } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getUserPublicProfile(username)
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

  const u = data?.user;

  return (
    <div className="rprofile">
      <BackHeader title={u?.username ? `@${u.username}` : "Profile"} fallback="/explore" />

      {loading ? (
        <div className="rprofile__loading">Loading…</div>
      ) : error ? (
        <div className="rprofile__error">
          <span>🔒</span>
          <p>{error}</p>
        </div>
      ) : (
        <div className="rprofile__content">
          <div className="rprofile__cover">
            {u.coverPhoto && <img src={u.coverPhoto} alt="" />}
          </div>
          <div className="rprofile__head">
            <span className="rprofile__dp">
              {u.photo ? <img src={u.photo} alt={u.name} /> : "🙂"}
            </span>
            <h1 className="rprofile__name">{u.name}</h1>
            {u.username && <p className="rprofile__handle">@{u.username}</p>}
            {u.bio && <p className="rprofile__bio">{u.bio}</p>}

            <div className="rprofile__stats">
              <div className="rprofile__stat">
                <span className="rprofile__stat-n">{data.stats.posts}</span>
                <span className="rprofile__stat-l">Posts</span>
              </div>
              <div className="rprofile__stat">
                <span className="rprofile__stat-n">{data.achievements?.length || 0}</span>
                <span className="rprofile__stat-l">Badges</span>
              </div>
            </div>
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

export default PersonalPublicProfile;
