import { memo, useState } from "react";
import { Link } from "react-router-dom";

import { reactToPost } from "../../../services/explore.service";
import CommentsSheet from "../CommentsSheet/CommentsSheet";
import {
  REACTIONS,
  categoryMeta,
  togetherLabel,
  postDateLabel,
} from "../../../utils/exploreTaxonomy";
import "./PostCard.css";

// A single Explore feed item — elegant card, CoupleCare reactions, no likes.
// Owns its own comments sheet + local counts (no page-level plumbing).
const PostCard = ({ post, compact = false }) => {
  const [reactions, setReactions] = useState(post.reactions || { total: 0, counts: {}, mine: null });
  const [busy, setBusy] = useState(false);
  const [showPicker, setShowPicker] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentCount, setCommentCount] = useState(post.commentCount || 0);

  // Unified profile card (personal OR couple); fall back to legacy `couple`.
  const profile =
    post.profile ||
    (post.couple
      ? { kind: "couple", ...post.couple, href: post.couple.username ? `/r/${post.couple.username}` : null }
      : {});
  const isPersonal = profile.kind === "personal";
  const metaLine = [
    profile.username ? `@${profile.username}` : "",
    !isPersonal && profile.daysTogether ? togetherLabel(profile.daysTogether) : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const cat = categoryMeta(post.category);

  const react = async (type) => {
    if (busy) return;
    setBusy(true);
    setShowPicker(false);
    // Optimistic: reflect the toggle instantly.
    setReactions((prev) => {
      const mine = prev.mine === type ? null : type;
      const counts = { ...prev.counts };
      if (prev.mine) counts[prev.mine] = Math.max(0, (counts[prev.mine] || 1) - 1);
      if (mine) counts[mine] = (counts[mine] || 0) + 1;
      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      return { mine, counts, total };
    });
    try {
      const res = await reactToPost(post._id, type);
      setReactions(res.data);
    } catch {
      setReactions(post.reactions || { total: 0, counts: {}, mine: null });
    } finally {
      setBusy(false);
    }
  };

  const mineMeta = reactions.mine ? REACTIONS.find((r) => r.key === reactions.mine) : null;
  const topReactions = Object.entries(reactions.counts || {})
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  const ProfileHeader = (
    <div className="post-card__head">
      <span className={`post-card__avatar${isPersonal ? " post-card__avatar--personal" : ""}`}>
        {profile.photo ? (
          <img src={profile.photo} alt={profile.name} loading="lazy" />
        ) : (
          <span className="post-card__avatar-fallback">{isPersonal ? "🙂" : "❤️"}</span>
        )}
      </span>
      <div className="post-card__head-text">
        <span className="post-card__couple">{profile.name}</span>
        {metaLine && <span className="post-card__meta">{metaLine}</span>}
      </div>
      <span className="post-card__cat" title={cat.label}>
        {cat.emoji} {cat.label}
      </span>
    </div>
  );

  return (
    <article className={`post-card${compact ? " post-card--compact" : ""}`}>
      {profile.href ? (
        <Link to={profile.href} className="post-card__head-link">
          {ProfileHeader}
        </Link>
      ) : (
        ProfileHeader
      )}

      <div className="post-card__media">
        {post.type === "video" ? (
          <video src={post.mediaUrl} controls playsInline preload="metadata" />
        ) : (
          <img src={post.mediaUrl} alt={post.caption || "Moment"} loading="lazy" />
        )}
      </div>

      <div className="post-card__body">
        {post.caption && <p className="post-card__caption">{post.caption}</p>}
        <div className="post-card__sub">
          {post.location && <span className="post-card__loc">📍 {post.location}</span>}
          <span className="post-card__date">{postDateLabel(post.createdAt)}</span>
        </div>

        {/* Reactions summary */}
        {reactions.total > 0 && (
          <div className="post-card__react-summary">
            <span className="post-card__react-emojis">
              {topReactions.map(([k]) => (
                <span key={k}>{REACTIONS.find((r) => r.key === k)?.emoji}</span>
              ))}
            </span>
            <span className="post-card__react-count">
              {reactions.total} {reactions.total === 1 ? "reaction" : "reactions"}
            </span>
          </div>
        )}

        {/* Action bar */}
        <div className="post-card__actions">
          <div className="post-card__react-wrap">
            <button
              type="button"
              className={`post-card__act${reactions.mine ? " is-active" : ""}`}
              onClick={() => setShowPicker((s) => !s)}
              disabled={busy}
            >
              <span className="post-card__act-emoji">{mineMeta ? mineMeta.emoji : "🤍"}</span>
              {mineMeta ? mineMeta.label : "React"}
            </button>

            {showPicker && (
              <div className="post-card__picker" role="menu">
                {REACTIONS.map((r) => (
                  <button
                    key={r.key}
                    type="button"
                    className={`post-card__picker-btn${reactions.mine === r.key ? " is-active" : ""}`}
                    onClick={() => react(r.key)}
                    title={r.label}
                  >
                    {r.emoji}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            className="post-card__act"
            onClick={() => setShowComments(true)}
          >
            💬 {commentCount > 0 ? commentCount : "Comment"}
          </button>
        </div>
      </div>

      {showComments && (
        <CommentsSheet
          post={post}
          onClose={() => setShowComments(false)}
          onCountChange={() => setCommentCount((c) => c + 1)}
        />
      )}
    </article>
  );
};

export default memo(PostCard);
