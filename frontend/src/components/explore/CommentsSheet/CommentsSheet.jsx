import { useEffect, useState } from "react";

import { getPostComments, addPostComment } from "../../../services/explore.service";
import { postDateLabel } from "../../../utils/exploreTaxonomy";
import "./CommentsSheet.css";

// Bottom-sheet comments for a public post. Comments only exist on public posts
// (server-enforced), so privacy is respected by construction.
const CommentsSheet = ({ post, onClose, onCountChange }) => {
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cursor, setCursor] = useState(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    let active = true;
    getPostComments(post._id)
      .then((res) => {
        if (!active) return;
        setComments(res.data.items || []);
        setCursor(res.data.nextCursor || null);
      })
      .catch(() => {})
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [post._id]);

  const loadMore = async () => {
    if (!cursor) return;
    try {
      const res = await getPostComments(post._id, { before: cursor });
      setComments((prev) => [...prev, ...(res.data.items || [])]);
      setCursor(res.data.nextCursor || null);
    } catch {
      /* ignore */
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || sending) return;
    setSending(true);
    try {
      const res = await addPostComment(post._id, clean);
      setComments((prev) => [res.data, ...prev]);
      setText("");
      onCountChange?.(post._id, 1);
    } catch {
      /* keep text so the user can retry */
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="cmt-sheet" role="dialog" aria-modal="true" aria-label="Comments">
      <button type="button" className="cmt-sheet__scrim" aria-label="Close" onClick={onClose} />
      <div className="cmt-sheet__panel glass">
        <div className="cmt-sheet__grab" />
        <h3 className="cmt-sheet__title">Comments</h3>

        <div className="cmt-sheet__list">
          {loading ? (
            <p className="cmt-sheet__empty">Loading…</p>
          ) : comments.length === 0 ? (
            <p className="cmt-sheet__empty">Be the first to leave a kind word 💬</p>
          ) : (
            <>
              {comments.map((c) => (
                <div key={c._id} className="cmt-row">
                  <span className="cmt-row__avatar">
                    {c.user?.profilePhoto ? (
                      <img src={c.user.profilePhoto} alt={c.user?.name} loading="lazy" />
                    ) : (
                      <span>{(c.user?.name || "?")[0].toUpperCase()}</span>
                    )}
                  </span>
                  <div className="cmt-row__body">
                    <span className="cmt-row__name">
                      {c.user?.name}
                      <span className="cmt-row__time">· {postDateLabel(c.createdAt)}</span>
                    </span>
                    <span className="cmt-row__text">{c.text}</span>
                  </div>
                </div>
              ))}
              {cursor && (
                <button type="button" className="cmt-sheet__more" onClick={loadMore}>
                  Load more
                </button>
              )}
            </>
          )}
        </div>

        <form className="cmt-sheet__form" onSubmit={submit}>
          <input
            className="cmt-sheet__input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            maxLength={500}
          />
          <button type="submit" className="cmt-sheet__send" disabled={!text.trim() || sending}>
            {sending ? "…" : "Send"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default CommentsSheet;
