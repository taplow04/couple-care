import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";

import {
  getFeed,
  getInspiration,
  getAiInspiration,
  searchProfiles,
} from "../../../services/explore.service";
import PostCard from "../../../components/explore/PostCard/PostCard";
import ComposePost from "../../../components/explore/ComposePost/ComposePost";
import ExploreSettings from "../../../components/explore/ExploreSettings/ExploreSettings";
import { CATEGORIES, togetherLabel } from "../../../utils/exploreTaxonomy";
import "./ExplorePage.css";

// ── Feed section — remounted (via key) on filter change so it re-fetches with a
// fresh loading state; owns its own pagination + infinite scroll. ──
const FeedSkeleton = () => (
  <div className="explore-feed">
    {[1, 2, 3].map((s) => (
      <div key={s} className="explore-sk" />
    ))}
  </div>
);

const FeedSection = ({ category, q }) => {
  const [items, setItems] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef(null);

  useEffect(() => {
    let active = true;
    getFeed({ category: category || undefined, q: q || undefined })
      .then((res) => {
        if (!active) return;
        setItems(res.data.items || []);
        setCursor(res.data.nextCursor);
        setHasMore(res.data.hasMore);
      })
      .catch(() => active && setItems([]))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [category, q]);

  const loadMore = useCallback(async () => {
    if (!hasMore || loadingMore || !cursor) return;
    setLoadingMore(true);
    try {
      const res = await getFeed({
        category: category || undefined,
        q: q || undefined,
        before: cursor,
      });
      setItems((prev) => [...prev, ...(res.data.items || [])]);
      setCursor(res.data.nextCursor);
      setHasMore(res.data.hasMore);
    } catch {
      /* keep what we have */
    } finally {
      setLoadingMore(false);
    }
  }, [hasMore, loadingMore, cursor, category, q]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return undefined;
    const io = new IntersectionObserver(
      (entries) => entries[0].isIntersecting && loadMore(),
      { rootMargin: "700px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [loadMore]);

  if (loading) return <FeedSkeleton />;
  if (!items.length) {
    return (
      <div className="explore-empty">
        <span className="explore-empty__emoji">🌱</span>
        <p className="explore-empty__title">
          {q ? "No matches yet" : "Nothing here yet"}
        </p>
        <p className="explore-empty__text">
          {q
            ? "Try a different search or category."
            : "Public relationship posts will appear here. Be the first to share something inspiring."}
        </p>
      </div>
    );
  }

  return (
    <div className="explore-feed">
      {items.map((p) => (
        <PostCard key={p._id} post={p} />
      ))}
      <div ref={sentinelRef} className="explore-feed__sentinel" />
      {loadingMore && <div className="explore-feed__more">Loading more…</div>}
    </div>
  );
};

// ── Curated inspiration rail (manually categorised, NOT engagement-ranked) ──
const InspirationRail = ({ rail }) => (
  <section className="explore-rail">
    <h3 className="explore-rail__title">
      <span>{rail.emoji}</span> {rail.title}
    </h3>
    <div className="explore-rail__scroll">
      {rail.posts.map((p) => (
        <Link
          key={p._id}
          to={p.couple?.username ? `/r/${p.couple.username}` : "/explore"}
          className="explore-tile"
        >
          <span className="explore-tile__media">
            {p.type === "video" ? (
              <video src={p.mediaUrl} muted playsInline preload="metadata" />
            ) : (
              <img src={p.mediaUrl} alt={p.caption || rail.title} loading="lazy" />
            )}
          </span>
          <span className="explore-tile__name">{p.couple?.name}</span>
          {p.couple?.daysTogether ? (
            <span className="explore-tile__meta">{togetherLabel(p.couple.daysTogether)}</span>
          ) : null}
        </Link>
      ))}
    </div>
  </section>
);

const ExplorePage = () => {
  const [category, setCategory] = useState(null);
  const [rawQ, setRawQ] = useState("");
  const [q, setQ] = useState("");
  const [rails, setRails] = useState(null);
  const [aiIdeas, setAiIdeas] = useState(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [profiles, setProfiles] = useState([]);
  const [showCompose, setShowCompose] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [feedKey, setFeedKey] = useState(0);
  const [toast, setToast] = useState("");

  // Debounce the search box.
  useEffect(() => {
    const t = setTimeout(() => setQ(rawQ.trim()), 300);
    return () => clearTimeout(t);
  }, [rawQ]);

  // Curated rails + AI ideas (once).
  useEffect(() => {
    let active = true;
    getInspiration()
      .then((r) => active && setRails(r.data.rails || []))
      .catch(() => active && setRails([]));
    getAiInspiration()
      .then((r) => active && setAiIdeas(r.data.ideas || []))
      .catch(() => active && setAiIdeas([]));
    return () => {
      active = false;
    };
  }, []);

  // Profile search (only when there's a query).
  useEffect(() => {
    if (!q) return undefined;
    let active = true;
    searchProfiles(q)
      .then((r) => active && setProfiles(r.data.profiles || []))
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [q]);

  const onCreated = () => {
    setFeedKey((k) => k + 1);
    setToast("Shared ✨");
    setTimeout(() => setToast(""), 2500);
  };

  const browsing = !q && !category; // show rails only on the clean browse view

  return (
    <div className="explore-pg">
      {/* Header */}
      <header className="explore-header glass">
        <div className="explore-header__top">
          <h1 className="explore-header__title">🌍 Explore</h1>
          <div className="explore-header__actions">
            <button
              type="button"
              className="explore-icon-btn"
              onClick={() => setShowSettings(true)}
              aria-label="Explore settings"
            >
              ⚙️
            </button>
            <button
              type="button"
              className="explore-icon-btn explore-icon-btn--primary"
              onClick={() => setShowCompose(true)}
              aria-label="Share a post"
            >
              ＋
            </button>
          </div>
        </div>

        <div className="explore-search">
          <span className="explore-search__icon">🔍</span>
          <input
            value={rawQ}
            onChange={(e) => setRawQ(e.target.value)}
            placeholder="Search couples, usernames, places…"
            aria-label="Search Explore"
          />
          {rawQ && (
            <button type="button" className="explore-search__clear" onClick={() => setRawQ("")}>
              ✕
            </button>
          )}
        </div>

        {/* Category chips */}
        <div className="explore-cats">
          <button
            type="button"
            className={`explore-chip${category === null ? " is-active" : ""}`}
            onClick={() => setCategory(null)}
          >
            ✨ All
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c.key}
              type="button"
              className={`explore-chip${category === c.key ? " is-active" : ""}`}
              onClick={() => setCategory((cur) => (cur === c.key ? null : c.key))}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
      </header>

      <div className="explore-pg__content">
        {/* AI Inspiration */}
        {browsing && aiIdeas && aiIdeas.length > 0 && (
          <section className="explore-ai">
            <button
              type="button"
              className="explore-ai__head"
              onClick={() => setAiOpen((v) => !v)}
              aria-expanded={aiOpen}
            >
              <span>✨ AI Relationship Inspiration</span>
              <span className={`explore-ai__chev${aiOpen ? " is-open" : ""}`}>›</span>
            </button>
            {aiOpen && (
              <div className="explore-ai__grid">
                {aiIdeas.map((idea, i) => (
                  <div key={i} className="explore-ai__card">
                    <span className="explore-ai__emoji">{idea.emoji}</span>
                    <span className="explore-ai__title">{idea.title}</span>
                    <span className="explore-ai__text">{idea.text}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Profile search results */}
        {q && profiles.length > 0 && (
          <section className="explore-profiles">
            <h3 className="explore-section-title">Relationship profiles</h3>
            <div className="explore-profiles__list">
              {profiles.map((p) => (
                <Link
                  key={p.id}
                  to={p.username ? `/r/${p.username}` : "/explore"}
                  className="explore-profile-row"
                >
                  <span className="explore-profile-row__avatar">
                    {p.photo ? <img src={p.photo} alt={p.name} loading="lazy" /> : "❤️"}
                  </span>
                  <span className="explore-profile-row__text">
                    <span className="explore-profile-row__name">{p.name}</span>
                    <span className="explore-profile-row__meta">
                      {p.username ? `@${p.username}` : ""}
                      {p.daysTogether ? ` · ${togetherLabel(p.daysTogether)}` : ""}
                    </span>
                  </span>
                  <span className="explore-profile-row__chev">›</span>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Curated inspiration rails */}
        {browsing &&
          rails &&
          rails.map((rail) => <InspirationRail key={rail.key} rail={rail} />)}

        {/* Feed */}
        {browsing && rails && rails.length > 0 && (
          <h3 className="explore-section-title explore-section-title--feed">Latest from the community</h3>
        )}
        <FeedSection key={`${category || "all"}|${q}|${feedKey}`} category={category} q={q} />
      </div>

      {toast && <div className="explore-toast">{toast}</div>}

      {showCompose && (
        <ComposePost onClose={() => setShowCompose(false)} onCreated={onCreated} />
      )}
      {showSettings && <ExploreSettings onClose={() => setShowSettings(false)} />}
    </div>
  );
};

export default ExplorePage;
