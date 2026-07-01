const Couple = require("../couples/couple.model");
const RelationshipPost = require("./relationshipPost.model");
const PostComment = require("./postComment.model");
const User = require("../users/user.model");
const cloudinary = require("../../config/cloudinary");
const {
  getRelationshipStart,
  getDaysTogether,
} = require("../couples/couple.helpers");
const { CATEGORY_KEYS, REACTION_KEYS, INSPIRATION_RAILS } = require("./explore.constants");

const FEED_LIMIT = 12;

const badRequest = (message, statusCode = 400) => {
  const err = new Error(message);
  err.statusCode = statusCode;
  err.expose = true;
  return err;
};

const escapeRegex = (s) => String(s || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const firstName = (name) => String(name || "").trim().split(/\s+/)[0] || "";

// Populate spec that hydrates a post's couple + both partners (for the card).
const COUPLE_POPULATE = {
  path: "coupleId",
  select:
    "relationshipUsername relationshipBio coverPhoto relationshipPhoto relationshipStartDate relationshipStartedAt exploreVisibility partnerOneId partnerTwoId",
  populate: [
    { path: "partnerOneId", select: "name profilePhoto" },
    { path: "partnerTwoId", select: "name profilePhoto" },
  ],
};

// The public "couple card" shown on every feed item + profile header. Public
// fields only — never private data.
const publicCoupleCard = (couple) => {
  if (!couple) return null;
  const names = [couple.partnerOneId?.name, couple.partnerTwoId?.name]
    .map(firstName)
    .filter(Boolean);
  return {
    id: couple._id,
    username: couple.relationshipUsername || null,
    name: names.join(" & ") || "A Couple",
    bio: couple.relationshipBio || "",
    photo: couple.relationshipPhoto || couple.coverPhoto || "",
    coverPhoto: couple.coverPhoto || "",
    togetherSince: getRelationshipStart(couple),
    daysTogether: getDaysTogether(couple),
  };
};

const reactionsSummary = (post, viewerId) => {
  const counts = {};
  for (const r of post.reactions || []) {
    counts[r.type] = (counts[r.type] || 0) + 1;
  }
  const mine =
    (post.reactions || []).find(
      (r) => String(r.userId) === String(viewerId || ""),
    )?.type || null;
  return { total: (post.reactions || []).length, counts, mine };
};

const mapPost = (post, viewerId, { includeVisibility = false } = {}) => ({
  _id: post._id,
  caption: post.caption,
  category: post.category,
  location: post.location,
  type: post.type,
  mediaUrl: post.mediaUrl,
  width: post.width,
  height: post.height,
  createdAt: post.createdAt,
  couple: publicCoupleCard(post.coupleId),
  reactions: reactionsSummary(post, viewerId),
  commentCount: post.commentCount || 0,
  ...(includeVisibility ? { visibility: post.visibility } : {}),
});

// The set of couples currently visible in Explore (opted in to "public").
const publicCoupleIds = async () => {
  const rows = await Couple.find({ exploreVisibility: "public" }).select("_id").lean();
  return rows.map((r) => r._id);
};

// ─── Feed (paginated, category + search filtered, privacy-enforced) ───────────
const getFeed = async ({ viewerId, category, q, before, limit } = {}) => {
  const lim = Math.min(Number(limit) || FEED_LIMIT, 30);
  const ids = await publicCoupleIds();
  if (!ids.length) return { items: [], nextCursor: null, hasMore: false };

  const filter = { coupleId: { $in: ids }, visibility: "public" };
  if (category && CATEGORY_KEYS.includes(category)) filter.category = category;
  if (before) {
    const d = new Date(before);
    if (!Number.isNaN(d.getTime())) filter.createdAt = { $lt: d };
  }

  if (q && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), "i");
    // Couples (within the public set) whose handle/name/bio match the query.
    const matched = await Couple.find({ _id: { $in: ids } })
      .select("relationshipUsername relationshipBio partnerOneId partnerTwoId")
      .populate([
        { path: "partnerOneId", select: "name" },
        { path: "partnerTwoId", select: "name" },
      ]);
    const matchedIds = matched
      .filter(
        (c) =>
          rx.test(c.relationshipUsername || "") ||
          rx.test(c.relationshipBio || "") ||
          rx.test(c.partnerOneId?.name || "") ||
          rx.test(c.partnerTwoId?.name || ""),
      )
      .map((c) => c._id);
    filter.$or = [{ caption: rx }, { location: rx }, { coupleId: { $in: matchedIds } }];
  }

  const rows = await RelationshipPost.find(filter)
    .sort({ createdAt: -1 })
    .limit(lim + 1)
    .populate(COUPLE_POPULATE);

  const hasMore = rows.length > lim;
  const items = rows.slice(0, lim).map((p) => mapPost(p, viewerId));
  const nextCursor = hasMore ? items[items.length - 1].createdAt : null;
  return { items, nextCursor, hasMore };
};

// ─── Inspiration rails (manually curated by category — NOT engagement-ranked) ──
const getInspiration = async ({ viewerId } = {}) => {
  const ids = await publicCoupleIds();
  if (!ids.length) return { rails: [] };

  const rails = await Promise.all(
    INSPIRATION_RAILS.map(async (rail) => {
      const rows = await RelationshipPost.find({
        coupleId: { $in: ids },
        visibility: "public",
        category: { $in: rail.categories },
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate(COUPLE_POPULATE);
      return {
        key: rail.key,
        title: rail.title,
        emoji: rail.emoji,
        posts: rows.map((p) => mapPost(p, viewerId)),
      };
    }),
  );

  return { rails: rails.filter((r) => r.posts.length > 0) };
};

// ─── Search public relationship profiles ──────────────────────────────────────
const searchProfiles = async (q) => {
  if (!q || !q.trim()) return { profiles: [] };
  const rx = new RegExp(escapeRegex(q.trim()), "i");
  const couples = await Couple.find({ exploreVisibility: "public" })
    .select(
      "relationshipUsername relationshipBio coverPhoto relationshipPhoto relationshipStartDate relationshipStartedAt partnerOneId partnerTwoId",
    )
    .populate([
      { path: "partnerOneId", select: "name profilePhoto" },
      { path: "partnerTwoId", select: "name profilePhoto" },
    ])
    .limit(50);

  const profiles = couples
    .filter(
      (c) =>
        rx.test(c.relationshipUsername || "") ||
        rx.test(c.relationshipBio || "") ||
        rx.test(c.partnerOneId?.name || "") ||
        rx.test(c.partnerTwoId?.name || ""),
    )
    .slice(0, 20)
    .map((c) => publicCoupleCard(c));

  return { profiles };
};

// ─── Public relationship profile (public data only) ───────────────────────────
const getPublicProfile = async (username, viewerId) => {
  const couple = await Couple.findOne({
    relationshipUsername: String(username || "").toLowerCase(),
    exploreVisibility: "public",
  }).populate([
    { path: "partnerOneId", select: "name profilePhoto" },
    { path: "partnerTwoId", select: "name profilePhoto" },
  ]);

  if (!couple) throw badRequest("This relationship profile isn't public.", 404);

  const posts = await RelationshipPost.find({
    coupleId: couple._id,
    visibility: "public",
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate(COUPLE_POPULATE);

  // Achievements (gamification badges — not sensitive) if available.
  let achievements = [];
  try {
    const { getEngagementForUser } = require("../engagement/engagement.service");
    const eng = await getEngagementForUser(couple.partnerOneId?._id || couple.partnerOneId);
    achievements = (eng?.achievements || [])
      .filter((a) => a.unlocked)
      .map((a) => ({ key: a.key, label: a.label, emoji: a.emoji }));
  } catch {
    /* achievements optional */
  }

  return {
    couple: publicCoupleCard(couple),
    stats: {
      posts: posts.length,
      daysTogether: getDaysTogether(couple),
      togetherSince: getRelationshipStart(couple),
    },
    posts: posts.map((p) => mapPost(p, viewerId)),
    achievements,
  };
};

// ─── Create / delete posts ────────────────────────────────────────────────────
const requireCouple = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user?.currentCoupleId) {
    throw badRequest("You need an active relationship to post to Explore.", 400);
  }
  return user.currentCoupleId;
};

const createPost = async (userId, { uploaded, type, caption, category, location, visibility }) => {
  const coupleId = await requireCouple(userId);

  const post = await RelationshipPost.create({
    coupleId,
    authorId: userId,
    caption: String(caption || "").slice(0, 2000),
    category: CATEGORY_KEYS.includes(category) ? category : "date",
    location: String(location || "").slice(0, 120),
    type: type === "video" ? "video" : "image",
    mediaUrl: uploaded.secure_url,
    publicId: uploaded.public_id || "",
    width: uploaded.width || null,
    height: uploaded.height || null,
    visibility: ["public", "partner_only", "private"].includes(visibility)
      ? visibility
      : "partner_only",
  });

  await post.populate(COUPLE_POPULATE);
  return mapPost(post, userId, { includeVisibility: true });
};

const deletePost = async (userId, postId) => {
  const coupleId = await requireCouple(userId);
  const post = await RelationshipPost.findOne({ _id: postId, coupleId });
  if (!post) throw badRequest("Post not found.", 404);

  if (post.publicId && cloudinary.isConfigured()) {
    try {
      await cloudinary.uploader.destroy(post.publicId, {
        resource_type: post.type === "video" ? "video" : "image",
      });
    } catch (err) {
      console.error("[explore] cloudinary destroy failed:", err.message);
    }
  }
  await PostComment.deleteMany({ postId: post._id });
  await post.deleteOne();
  return { success: true };
};

const getMyPosts = async (userId) => {
  const coupleId = await requireCouple(userId);
  const rows = await RelationshipPost.find({ coupleId })
    .sort({ createdAt: -1 })
    .populate(COUPLE_POPULATE);
  return rows.map((p) => mapPost(p, userId, { includeVisibility: true }));
};

// ─── Reactions (one CoupleCare reaction per user, toggleable) ──────────────────
const reactToPost = async (userId, postId, type) => {
  if (!REACTION_KEYS.includes(type)) throw badRequest("Unknown reaction.");
  const post = await RelationshipPost.findById(postId);
  if (!post) throw badRequest("Post not found.", 404);

  const idx = post.reactions.findIndex(
    (r) => String(r.userId) === String(userId),
  );
  if (idx >= 0) {
    if (post.reactions[idx].type === type) {
      post.reactions.splice(idx, 1); // same reaction → toggle off
    } else {
      post.reactions[idx].type = type; // switch reaction
    }
  } else {
    post.reactions.push({ userId, type });
  }
  post.reactionCount = post.reactions.length;
  await post.save();

  return reactionsSummary(post, userId);
};

// ─── Comments ─────────────────────────────────────────────────────────────────
const listComments = async (postId, { before, limit } = {}) => {
  const lim = Math.min(Number(limit) || 20, 50);
  const filter = { postId };
  if (before) {
    const d = new Date(before);
    if (!Number.isNaN(d.getTime())) filter.createdAt = { $lt: d };
  }
  const rows = await PostComment.find(filter)
    .sort({ createdAt: -1 })
    .limit(lim + 1)
    .populate({ path: "userId", select: "name profilePhoto username" });

  const hasMore = rows.length > lim;
  const items = rows.slice(0, lim).map((c) => ({
    _id: c._id,
    text: c.text,
    createdAt: c.createdAt,
    user: {
      _id: c.userId?._id,
      name: c.userId?.name,
      username: c.userId?.username,
      profilePhoto: c.userId?.profilePhoto,
    },
  }));
  return { items, nextCursor: hasMore ? items[items.length - 1].createdAt : null, hasMore };
};

const addComment = async (userId, postId, text) => {
  const clean = String(text || "").trim().slice(0, 500);
  if (!clean) throw badRequest("Comment can't be empty.");

  const post = await RelationshipPost.findById(postId).select("visibility commentCount");
  if (!post) throw badRequest("Post not found.", 404);
  if (post.visibility !== "public") throw badRequest("Comments are closed on this post.", 403);

  const comment = await PostComment.create({ postId, userId, text: clean });
  await RelationshipPost.updateOne({ _id: postId }, { $inc: { commentCount: 1 } });

  const user = await User.findById(userId).select("name profilePhoto username");
  return {
    _id: comment._id,
    text: comment.text,
    createdAt: comment.createdAt,
    user: {
      _id: user._id,
      name: user.name,
      username: user.username,
      profilePhoto: user.profilePhoto,
    },
  };
};

// ─── Explore settings (the public-profile opt-in) ─────────────────────────────
const getSettings = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user?.currentCoupleId) return { hasCouple: false };
  const couple = await Couple.findById(user.currentCoupleId).select(
    "relationshipUsername relationshipBio exploreVisibility",
  );
  return {
    hasCouple: true,
    relationshipUsername: couple.relationshipUsername || "",
    relationshipBio: couple.relationshipBio || "",
    exploreVisibility: couple.exploreVisibility,
    isPublic: couple.exploreVisibility === "public",
  };
};

const updateSettings = async (userId, { relationshipUsername, relationshipBio, exploreVisibility }) => {
  const coupleId = await requireCouple(userId);
  const couple = await Couple.findById(coupleId);

  if (relationshipUsername !== undefined) {
    const handle = String(relationshipUsername || "").trim().toLowerCase();
    if (handle) {
      if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
        throw badRequest(
          "Username must be 3–20 characters: letters, numbers or underscores.",
        );
      }
      const clash = await Couple.findOne({
        relationshipUsername: handle,
        _id: { $ne: coupleId },
      }).select("_id");
      if (clash) throw badRequest("That relationship username is taken.");
      couple.relationshipUsername = handle;
    } else {
      couple.relationshipUsername = null;
    }
  }

  if (relationshipBio !== undefined) {
    couple.relationshipBio = String(relationshipBio || "").slice(0, 300);
  }

  if (exploreVisibility !== undefined) {
    if (!["public", "friends", "partner_only", "private"].includes(exploreVisibility)) {
      throw badRequest("Invalid visibility.");
    }
    // Going public requires a handle so the profile is reachable.
    if (exploreVisibility === "public" && !couple.relationshipUsername) {
      throw badRequest("Set a relationship username before going public.");
    }
    couple.exploreVisibility = exploreVisibility;
  }

  await couple.save();
  return getSettings(userId);
};

module.exports = {
  getFeed,
  getInspiration,
  searchProfiles,
  getPublicProfile,
  createPost,
  deletePost,
  getMyPosts,
  reactToPost,
  listComments,
  addComment,
  getSettings,
  updateSettings,
  // exported for the AI module
  publicCoupleIds,
};
