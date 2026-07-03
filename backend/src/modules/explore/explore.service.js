const Couple = require("../couples/couple.model");
const RelationshipPost = require("./relationshipPost.model");
const PostComment = require("./postComment.model");
const User = require("../users/user.model");
const cloudinary = require("../../config/cloudinary");
const {
  getRelationshipStart,
  getDaysTogether,
} = require("../couples/couple.helpers");
const {
  CATEGORY_KEYS,
  REACTION_KEYS,
  INSPIRATION_RAILS,
  EXPLORE_VISIBILITY,
} = require("./explore.constants");

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

// Personal posts hydrate their author (the public Personal Profile card).
const AUTHOR_POPULATE = {
  path: "authorId",
  select: "name username profilePhoto coverPhoto exploreVisibility",
};

// Every feed/profile read hydrates BOTH — mapPost picks by scope.
const POST_POPULATE = [COUPLE_POPULATE, AUTHOR_POPULATE];

// The public "couple card" shown on relationship feed items + profile header.
// Public fields only — never private data.
const publicCoupleCard = (couple) => {
  if (!couple || typeof couple !== "object") return null;
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

// The public "personal card" shown on personal feed items + profile header.
const publicPersonalCard = (user) => {
  if (!user || typeof user !== "object") return null;
  return {
    id: user._id,
    username: user.username || null,
    name: user.name || "Someone",
    photo: user.profilePhoto || "",
    coverPhoto: user.coverPhoto || "",
  };
};

// Unified profile descriptor attached to every mapped post so the client can
// render one card component + resolve the right href regardless of scope.
const profileForPost = (post) => {
  if (post.scope === "personal") {
    const card = publicPersonalCard(post.authorId);
    if (!card) return null;
    return {
      kind: "personal",
      id: card.id,
      username: card.username,
      name: card.name,
      photo: card.photo,
      coverPhoto: card.coverPhoto,
      href: card.username ? `/u/${card.username}` : null,
    };
  }
  const card = publicCoupleCard(post.coupleId);
  if (!card) return null;
  return {
    kind: "couple",
    id: card.id,
    username: card.username,
    name: card.name,
    photo: card.photo,
    coverPhoto: card.coverPhoto,
    daysTogether: card.daysTogether,
    href: card.username ? `/r/${card.username}` : null,
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
  scope: post.scope || "relationship",
  caption: post.caption,
  category: post.category,
  location: post.location,
  type: post.type,
  mediaUrl: post.mediaUrl,
  width: post.width,
  height: post.height,
  createdAt: post.createdAt,
  // Unified card (works for both scopes).
  profile: profileForPost(post),
  // Back-compat: relationship posts still expose `couple` for older callers.
  couple: post.scope === "personal" ? null : publicCoupleCard(post.coupleId),
  reactions: reactionsSummary(post, viewerId),
  commentCount: post.commentCount || 0,
  ...(includeVisibility ? { visibility: post.visibility } : {}),
});

// The set of couples currently visible in Explore (opted in to "public").
const publicCoupleIds = async () => {
  const rows = await Couple.find({ exploreVisibility: "public" }).select("_id").lean();
  return rows.map((r) => r._id);
};

// The set of users whose PERSONAL profile is public in Explore.
const publicUserIds = async () => {
  const rows = await User.find({ exploreVisibility: "public" }).select("_id").lean();
  return rows.map((r) => r._id);
};

// The two-scope privacy gate as an $or fragment. Any Explore read that surfaces
// public posts MUST filter through this so nothing private ever leaks.
const publicScopeGate = async () => {
  const [coupleIds, userIds] = await Promise.all([publicCoupleIds(), publicUserIds()]);
  const branches = [];
  if (coupleIds.length)
    branches.push({ scope: "relationship", coupleId: { $in: coupleIds }, visibility: "public" });
  if (userIds.length)
    branches.push({ scope: "personal", authorId: { $in: userIds }, visibility: "public" });
  return { branches, coupleIds, userIds };
};

// ─── Feed (paginated, category + search filtered, privacy-enforced) ───────────
const getFeed = async ({ viewerId, category, q, before, limit } = {}) => {
  const lim = Math.min(Number(limit) || FEED_LIMIT, 30);
  const { branches, coupleIds, userIds } = await publicScopeGate();
  if (!branches.length) return { items: [], nextCursor: null, hasMore: false };

  const and = [{ $or: branches }];
  if (category && CATEGORY_KEYS.includes(category)) and.push({ category });
  if (before) {
    const d = new Date(before);
    if (!Number.isNaN(d.getTime())) and.push({ createdAt: { $lt: d } });
  }

  if (q && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim()), "i");
    // Public couples whose handle/name/bio match the query.
    const matchedCouples = await Couple.find({ _id: { $in: coupleIds } })
      .select("relationshipUsername relationshipBio partnerOneId partnerTwoId")
      .populate([
        { path: "partnerOneId", select: "name" },
        { path: "partnerTwoId", select: "name" },
      ]);
    const matchedCoupleIds = matchedCouples
      .filter(
        (c) =>
          rx.test(c.relationshipUsername || "") ||
          rx.test(c.relationshipBio || "") ||
          rx.test(c.partnerOneId?.name || "") ||
          rx.test(c.partnerTwoId?.name || ""),
      )
      .map((c) => c._id);
    // Public users whose handle/name/bio match the query.
    const matchedUsers = await User.find({ _id: { $in: userIds } })
      .select("username name bio")
      .lean();
    const matchedUserIds = matchedUsers
      .filter(
        (u) =>
          rx.test(u.username || "") ||
          rx.test(u.name || "") ||
          rx.test(u.bio || ""),
      )
      .map((u) => u._id);
    and.push({
      $or: [
        { caption: rx },
        { location: rx },
        { coupleId: { $in: matchedCoupleIds } },
        { authorId: { $in: matchedUserIds }, scope: "personal" },
      ],
    });
  }

  const rows = await RelationshipPost.find({ $and: and })
    .sort({ createdAt: -1 })
    .limit(lim + 1)
    .populate(POST_POPULATE);

  const hasMore = rows.length > lim;
  const items = rows.slice(0, lim).map((p) => mapPost(p, viewerId));
  const nextCursor = hasMore ? items[items.length - 1].createdAt : null;
  return { items, nextCursor, hasMore };
};

// ─── Inspiration rails (manually curated by category — NOT engagement-ranked) ──
const getInspiration = async ({ viewerId } = {}) => {
  const { branches } = await publicScopeGate();
  if (!branches.length) return { rails: [] };

  const rails = await Promise.all(
    INSPIRATION_RAILS.map(async (rail) => {
      const rows = await RelationshipPost.find({
        $and: [{ $or: branches }, { category: { $in: rail.categories } }],
      })
        .sort({ createdAt: -1 })
        .limit(10)
        .populate(POST_POPULATE);
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

// ─── Search public relationship profiles AND public personal profiles ─────────
const searchProfiles = async (q) => {
  if (!q || !q.trim()) return { couples: [], users: [], profiles: [] };
  const rx = new RegExp(escapeRegex(q.trim()), "i");

  const [couplesRaw, usersRaw] = await Promise.all([
    Couple.find({ exploreVisibility: "public" })
      .select(
        "relationshipUsername relationshipBio coverPhoto relationshipPhoto relationshipStartDate relationshipStartedAt partnerOneId partnerTwoId",
      )
      .populate([
        { path: "partnerOneId", select: "name profilePhoto" },
        { path: "partnerTwoId", select: "name profilePhoto" },
      ])
      .limit(60),
    User.find({ exploreVisibility: "public" })
      .select("name username bio profilePhoto coverPhoto")
      .limit(60),
  ]);

  const couples = couplesRaw
    .filter(
      (c) =>
        rx.test(c.relationshipUsername || "") ||
        rx.test(c.relationshipBio || "") ||
        rx.test(c.partnerOneId?.name || "") ||
        rx.test(c.partnerTwoId?.name || ""),
    )
    .slice(0, 20)
    .map((c) => publicCoupleCard(c));

  const users = usersRaw
    .filter(
      (u) =>
        rx.test(u.username || "") ||
        rx.test(u.name || "") ||
        rx.test(u.bio || ""),
    )
    .slice(0, 20)
    .map((u) => ({ ...publicPersonalCard(u), bio: u.bio || "" }));

  // `profiles` kept as an alias of `couples` for backward compatibility.
  return { couples, users, profiles: couples };
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
    scope: "relationship",
    visibility: "public",
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate(POST_POPULATE);

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

// ─── Public personal profile (public data only) ───────────────────────────────
const getPersonalProfile = async (username, viewerId) => {
  const user = await User.findOne({
    username: String(username || "").toLowerCase(),
    exploreVisibility: "public",
  }).select("name username bio profilePhoto coverPhoto createdAt growthAchievements");

  if (!user) throw badRequest("This profile isn't public.", 404);

  const posts = await RelationshipPost.find({
    authorId: user._id,
    scope: "personal",
    visibility: "public",
  })
    .sort({ createdAt: -1 })
    .limit(30)
    .populate(POST_POPULATE);

  // Personal (solo) growth badges from the user's unlocked-keys set — never
  // sensitive (gamification only). Mapped against the catalog for labels/emoji.
  let achievements = [];
  try {
    const {
      GROWTH_ACHIEVEMENT_MAP,
    } = require("../growth/growth.achievements.catalog");
    achievements = (user.growthAchievements || [])
      .map((key) => GROWTH_ACHIEVEMENT_MAP[key])
      .filter(Boolean)
      .map((a) => ({ key: a.key, label: a.title, emoji: a.emoji }));
  } catch {
    /* achievements optional */
  }

  return {
    user: {
      id: user._id,
      username: user.username || null,
      name: user.name,
      bio: user.bio || "",
      photo: user.profilePhoto || "",
      coverPhoto: user.coverPhoto || "",
      memberSince: user.createdAt,
    },
    stats: { posts: posts.length },
    posts: posts.map((p) => mapPost(p, viewerId)),
    achievements,
  };
};

// ─── Create / delete posts ────────────────────────────────────────────────────
const requireCouple = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user?.currentCoupleId) {
    throw badRequest("You need an active relationship to share a relationship post.", 400);
  }
  return user.currentCoupleId;
};

const createPost = async (
  userId,
  { uploaded, type, caption, category, location, visibility, scope },
) => {
  const wantsRelationship = scope === "relationship";
  // Relationship posts stay exclusive to active couples; everyone else (and
  // anyone choosing "personal") posts personally.
  const coupleId = wantsRelationship ? await requireCouple(userId) : null;
  const finalScope = wantsRelationship ? "relationship" : "personal";

  const post = await RelationshipPost.create({
    scope: finalScope,
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

  await post.populate(POST_POPULATE);
  return mapPost(post, userId, { includeVisibility: true });
};

const deletePost = async (userId, postId) => {
  const post = await RelationshipPost.findById(postId);
  if (!post) throw badRequest("Post not found.", 404);

  // Authorize: personal posts by author; relationship posts by a current partner.
  if ((post.scope || "relationship") === "personal") {
    if (String(post.authorId) !== String(userId)) throw badRequest("Post not found.", 404);
  } else {
    const coupleId = await requireCouple(userId);
    if (String(post.coupleId) !== String(coupleId)) throw badRequest("Post not found.", 404);
  }

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
  const user = await User.findById(userId).select("currentCoupleId");
  const or = [{ authorId: userId, scope: "personal" }];
  if (user?.currentCoupleId) or.push({ coupleId: user.currentCoupleId, scope: "relationship" });

  const rows = await RelationshipPost.find({ $or: or })
    .sort({ createdAt: -1 })
    .populate(POST_POPULATE);
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

// ─── Explore settings (personal + relationship public-profile opt-ins) ────────
const getSettings = async (userId) => {
  const user = await User.findById(userId).select(
    "currentCoupleId username exploreVisibility bio",
  );

  const personal = {
    username: user.username || "",
    bio: user.bio || "",
    exploreVisibility: user.exploreVisibility || "private",
    isPublic: user.exploreVisibility === "public",
  };

  let relationship = { hasCouple: false };
  if (user.currentCoupleId) {
    const couple = await Couple.findById(user.currentCoupleId).select(
      "relationshipUsername relationshipBio exploreVisibility",
    );
    if (couple) {
      relationship = {
        hasCouple: true,
        relationshipUsername: couple.relationshipUsername || "",
        relationshipBio: couple.relationshipBio || "",
        exploreVisibility: couple.exploreVisibility,
        isPublic: couple.exploreVisibility === "public",
      };
    }
  }

  return {
    personal,
    relationship,
    // Back-compat flat fields (older ExploreSettings read these directly).
    hasCouple: relationship.hasCouple,
    relationshipUsername: relationship.relationshipUsername || "",
    relationshipBio: relationship.relationshipBio || "",
    exploreVisibility: relationship.exploreVisibility,
    isPublic: relationship.isPublic || false,
  };
};

const USERNAME_RX = /^[a-z0-9_]{3,20}$/;

const updateSettings = async (
  userId,
  {
    relationshipUsername,
    relationshipBio,
    exploreVisibility,
    personalUsername,
    personalBio,
    personalExploreVisibility,
  },
) => {
  const user = await User.findById(userId);
  if (!user) throw badRequest("User not found.", 404);

  // ── Personal profile settings (available to EVERY user, no couple needed) ──
  if (personalUsername !== undefined) {
    const handle = String(personalUsername || "").trim().toLowerCase();
    if (handle) {
      if (!USERNAME_RX.test(handle)) {
        throw badRequest("Username must be 3–20 characters: letters, numbers or underscores.");
      }
      const clash = await User.findOne({ username: handle, _id: { $ne: userId } }).select("_id");
      if (clash) throw badRequest("That username is taken.");
      user.username = handle;
    } else {
      user.username = null;
    }
  }
  if (personalBio !== undefined) {
    user.bio = String(personalBio || "").slice(0, 300);
  }
  if (personalExploreVisibility !== undefined) {
    if (!EXPLORE_VISIBILITY.includes(personalExploreVisibility)) {
      throw badRequest("Invalid visibility.");
    }
    if (personalExploreVisibility === "public" && !user.username) {
      throw badRequest("Set a username before making your profile public.");
    }
    user.exploreVisibility = personalExploreVisibility;
  }
  await user.save();

  // ── Relationship profile settings (require an active couple) ──
  const touchesRelationship =
    relationshipUsername !== undefined ||
    relationshipBio !== undefined ||
    exploreVisibility !== undefined;

  if (touchesRelationship) {
    const coupleId = await requireCoupleForSettings(userId);
    const couple = await Couple.findById(coupleId);

    if (relationshipUsername !== undefined) {
      const handle = String(relationshipUsername || "").trim().toLowerCase();
      if (handle) {
        if (!USERNAME_RX.test(handle)) {
          throw badRequest("Username must be 3–20 characters: letters, numbers or underscores.");
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
      if (!EXPLORE_VISIBILITY.includes(exploreVisibility)) {
        throw badRequest("Invalid visibility.");
      }
      if (exploreVisibility === "public" && !couple.relationshipUsername) {
        throw badRequest("Set a relationship username before going public.");
      }
      couple.exploreVisibility = exploreVisibility;
    }
    await couple.save();
  }

  return getSettings(userId);
};

// Relationship settings need a couple; personal settings never do.
const requireCoupleForSettings = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId");
  if (!user?.currentCoupleId) {
    throw badRequest("You need an active relationship to edit the relationship profile.", 400);
  }
  return user.currentCoupleId;
};

module.exports = {
  getFeed,
  getInspiration,
  searchProfiles,
  getPublicProfile,
  getPersonalProfile,
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
  publicUserIds,
  publicScopeGate,
};
