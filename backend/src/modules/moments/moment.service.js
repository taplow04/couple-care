/**
 * Moments service — the business logic for CoupleCare Moments.
 *
 * Reuses the existing spine:
 *   • couple resolution      → chat.helpers (getCoupleByUser / getPartnerId)
 *   • realtime fan-out        → utils/realtime.emitToUser (per-user, no rooms)
 *   • notifications + push    → notifications/notification.service.createNotification
 *   • engagement (streak/XP)  → engagement.service.recordActivity
 *   • Journey persistence      → memories/memory.service.createMemory (feeds health)
 *   • AI understanding         → moment.ai.analyzeMoment (Groq, best-effort)
 *
 * Cloudinary upload + destroy are performed by the controller (which holds the
 * multer buffer); this service stays storage-agnostic and is fed the result.
 */
const mongoose = require("mongoose");
const Moment = require("./moment.model");
const Highlight = require("./highlight.model");
const cloudinary = require("../../config/cloudinary");
const User = require("../users/user.model");
const { getCoupleByUser, getPartnerId } = require("../chat/chat.helpers");
const { emitToUser } = require("../../utils/realtime");
const { createNotification } = require("../notifications/notification.service");
const { recordActivity } = require("../engagement/engagement.service");
const { ACTIVITY_TYPES } = require("../engagement/engagement.constants");
const memoryService = require("../memories/memory.service");
const { analyzeMoment } = require("./moment.ai");
const {
  MOMENT_TTL_MS,
  MAX_MOMENTS_PER_DAY,
  REACTION_SET,
  COUPLE_MOMENT_WINDOW_MS,
  SUGGESTABLE_MOODS,
} = require("./moment.constants");

const err = (message, statusCode = 400) => {
  const e = new Error(message);
  e.statusCode = statusCode;
  return e;
};

const firstName = (n) => (n || "").split(" ")[0] || "Your partner";

// ─── DTO ─────────────────────────────────────────────────────────────────────
// A serialisable moment, with `mine`/`viewed` flags resolved for `viewerId`.
const toDTO = (m, viewerId) => {
  const vid = String(viewerId);
  const authorId = m.authorId?._id ? m.authorId._id : m.authorId;
  const mine = String(authorId) === vid;
  return {
    _id: m._id,
    coupleId: m.coupleId,
    type: m.type,
    mediaUrl: m.mediaUrl,
    thumbnailUrl: m.thumbnailUrl || "",
    caption: m.caption || "",
    // Story Mood — a per-moment concept (own source/confidence/timestamp). It is
    // distinct from the manual Mood collection and the AI current mood.
    mood: m.mood || null,
    moodSource: m.moodSource || null,
    moodConfidence: m.moodConfidence ?? null,
    moodAt: m.moodAt || null,
    privacy: m.privacy,
    width: m.width,
    height: m.height,
    duration: m.duration,
    mine,
    author: m.authorId?.name
      ? {
          _id: authorId,
          name: m.authorId.name,
          profilePhoto: m.authorId.profilePhoto || "",
        }
      : { _id: authorId },
    reactions: m.reactions || [],
    // The viewer has "seen" it if they're the author or they're in `views`.
    viewed: mine || (m.views || []).some((v) => String(v.userId) === vid),
    // The author cares whether the PARTNER has viewed it.
    viewedByPartner: (m.views || []).some((v) => String(v.userId) !== String(authorId)),
    firstViewedAt: m.firstViewedAt,
    aiSuggestion: m.aiSuggestion || { text: "", moods: [] },
    kept: m.kept,
    savedToJourney: m.savedToJourney,
    highlightId: m.highlightId || null,
    coupleMomentId: m.coupleMomentId || null,
    createdAt: m.createdAt,
    expiresAt: m.expiresAt,
  };
};

// Live (non-expired) moments authored by one user, newest first. The viewer
// only sees `private` moments if they authored them.
const liveMomentsForAuthor = async (coupleId, authorId, viewerId) => {
  const query = {
    coupleId,
    authorId,
    expiresAt: { $gt: new Date() },
  };
  if (String(authorId) !== String(viewerId)) {
    query.privacy = { $ne: "private" };
  }
  return Moment.find(query)
    .sort({ createdAt: 1 })
    .populate("authorId", "name profilePhoto");
};

// ─── circles (dashboard story row) ─────────────────────────────────────────────
/**
 * The two-circle payload for the Moments bar: the user's own live moments and
 * the partner's. `hasUnseen` on the partner drives the animated gradient ring.
 */
const getCircles = async (userId) => {
  const couple = await getCoupleByUser(userId);
  const partnerId = await getPartnerId(userId);

  const [me, partner] = await Promise.all([
    User.findById(userId).select("name profilePhoto"),
    partnerId ? User.findById(partnerId).select("name profilePhoto") : null,
  ]);

  const [myMoments, partnerMoments] = await Promise.all([
    liveMomentsForAuthor(couple._id, userId, userId),
    partnerId ? liveMomentsForAuthor(couple._id, partnerId, userId) : [],
  ]);

  const myDTO = myMoments.map((m) => toDTO(m, userId));
  const partnerDTO = partnerMoments.map((m) => toDTO(m, userId));

  return {
    self: {
      author: me ? { _id: me._id, name: me.name, profilePhoto: me.profilePhoto } : null,
      moments: myDTO,
      hasMoments: myDTO.length > 0,
      // The author wants to know if the partner has seen their latest.
      seenByPartner: myDTO.length > 0 && myDTO.every((m) => m.viewedByPartner),
    },
    partner: {
      author: partner
        ? { _id: partner._id, name: partner.name, profilePhoto: partner.profilePhoto }
        : null,
      moments: partnerDTO,
      hasMoments: partnerDTO.length > 0,
      hasUnseen: partnerDTO.some((m) => !m.viewed),
    },
  };
};

// ─── create ────────────────────────────────────────────────────────────────────
const countToday = async (authorId) => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Moment.countDocuments({ authorId, createdAt: { $gte: start } });
};

/**
 * Persist a freshly-uploaded moment. `uploaded` is the Cloudinary result; the
 * controller performs the actual upload. Runs AI analysis inline (best-effort),
 * notifies + pushes the partner, feeds engagement, and checks the couple-moment
 * window. Returns the moment DTO.
 */
const createMoment = async (userId, { type, uploaded, caption, privacy, duration, mood }) => {
  const couple = await getCoupleByUser(userId);

  // Anti-spam daily cap (Feature 15).
  const today = await countToday(userId);
  if (today >= MAX_MOMENTS_PER_DAY) {
    throw err(
      `You've reached today's limit of ${MAX_MOMENTS_PER_DAY} Moments. Come back tomorrow! 💕`,
      429,
    );
  }

  const cleanCaption =
    typeof caption === "string" ? caption.trim().slice(0, 500) : "";
  const cleanPrivacy = ["partner_only", "private", "save_journey"].includes(privacy)
    ? privacy
    : "partner_only";
  const cleanMood = SUGGESTABLE_MOODS.includes(mood) ? mood : null;

  // AI understanding (advisory only — Feature 13). Never blocks/overwrites.
  const aiSuggestion = await analyzeMoment(userId, { type, caption: cleanCaption });

  const moment = await Moment.create({
    coupleId: couple._id,
    authorId: userId,
    type,
    mediaUrl: uploaded.secure_url,
    publicId: uploaded.public_id,
    resourceType: uploaded.resource_type === "video" ? "video" : "image",
    thumbnailUrl:
      uploaded.resource_type === "video" && uploaded.public_id
        ? cloudinary.url(uploaded.public_id, {
            resource_type: "video",
            format: "jpg",
            transformation: [{ width: 600, crop: "scale" }],
          })
        : "",
    caption: cleanCaption,
    // Story mood picked at capture time (own provenance — never an intensity).
    mood: cleanMood,
    moodSource: cleanMood ? "user" : null,
    moodConfidence: cleanMood ? 100 : null,
    moodAt: cleanMood ? new Date() : null,
    privacy: cleanPrivacy,
    width: uploaded.width || null,
    height: uploaded.height || null,
    duration: duration || (uploaded.duration ? Math.round(uploaded.duration) : null),
    aiSuggestion,
    expiresAt: new Date(Date.now() + MOMENT_TTL_MS),
  });

  await moment.populate("authorId", "name profilePhoto");
  const dto = toDTO(moment, userId);

  // Feed the shared engagement loop (streak / XP / achievements). Never throws.
  recordActivity(couple._id, userId, ACTIVITY_TYPES.MOMENT, { momentId: moment._id });

  // Realtime + notification to the partner (skipped when private — Feature 9).
  const partnerId = await getPartnerId(userId).catch(() => null);
  if (partnerId && cleanPrivacy !== "private") {
    emitToUser(partnerId, "moment:new", dto);
    const author = await User.findById(userId).select("name");
    createNotification({
      userId: partnerId,
      title: "New Moment 💞",
      message: `❤️ ${firstName(author?.name)} shared a new Moment.`,
      type: "moment_new",
      metadata: { momentId: moment._id },
    }).catch(() => {});

    // Did this complete a "Couple Moment" window? Offer to merge (Feature 12).
    checkCoupleMomentWindow(couple._id, userId, partnerId).catch(() => {});

    // ❤️ Daily Couple Moment: if BOTH partners have now posted today, auto-create
    // the lasting daily recap. Fire-and-forget — never blocks/breaks the upload.
    // Required lazily so the moment↔dailyMoment service pair has no circular load.
    require("../dailyMoment/dailyMoment.service")
      .ensureForDay(couple._id, userId)
      .catch(() => {});
  }

  // Echo to the author's other devices so their own ring updates live.
  emitToUser(userId, "moment:new", dto);

  return dto;
};

// ─── story mood ──────────────────────────────────────────────────────────────
/**
 * Attach (or update) the Story Mood for a moment. This is the ONLY way an
 * AI-suggested mood is accepted — it is recorded on the Moment itself, NOT in the
 * manual Mood collection, so a Story mood can never inherit a manual mood's
 * intensity (the original bug). `source` is "ai_suggested" when the author tapped
 * a suggestion, else "user". Author-only.
 */
const setMoodForMoment = async (userId, momentId, { mood, source = "user" }) => {
  const moment = await Moment.findById(momentId);
  if (!moment) throw err("Moment not found", 404);
  assertAuthor(moment, userId);
  if (!SUGGESTABLE_MOODS.includes(mood)) throw err("Invalid mood");

  moment.mood = mood;
  moment.moodSource = source === "ai_suggested" ? "ai_suggested" : "user";
  // AI-suggested moods carry the suggestion's confidence (best-effort); a mood the
  // author picked themselves is certain.
  moment.moodConfidence = moment.moodSource === "ai_suggested" ? 80 : 100;
  moment.moodAt = new Date();
  await moment.save();

  return toDTO(await moment.populate("authorId", "name profilePhoto"), userId);
};

// ─── view ────────────────────────────────────────────────────────────────────
/**
 * Mark a partner's moment as viewed (Feature 5). Author-self views are no-ops.
 * Idempotent: only the FIRST view notifies the uploader.
 */
const markViewed = async (userId, momentId) => {
  const moment = await Moment.findById(momentId);
  if (!moment) throw err("Moment not found", 404);

  // Only the partner (non-author, same couple) can register a view.
  if (String(moment.authorId) === String(userId)) {
    return toDTO(await moment.populate("authorId", "name profilePhoto"), userId);
  }
  const member = await getCoupleByUser(userId);
  if (String(member._id) !== String(moment.coupleId)) {
    throw err("Not allowed", 403);
  }
  if (moment.privacy === "private") throw err("Not allowed", 403);

  // Atomically record the view only if this user hasn't already viewed it, so
  // the socket + REST paths can't both fire a "viewed" notification (race-safe).
  const viewedAt = new Date();
  const upd = await Moment.updateOne(
    { _id: momentId, "views.userId": { $ne: userId } },
    {
      $push: { views: { userId, viewedAt } },
      $set: { firstViewedAt: moment.firstViewedAt || viewedAt },
    },
  );

  if (upd.modifiedCount > 0) {
    // Keep the in-memory doc in sync so the returned DTO reflects the view.
    moment.views.push({ userId, viewedAt });
    if (!moment.firstViewedAt) moment.firstViewedAt = viewedAt;

    // Notify the uploader (Feature 5) + live emit with the viewer + time.
    const viewer = await User.findById(userId).select("name profilePhoto");
    emitToUser(moment.authorId, "moment:viewed", {
      momentId: String(moment._id),
      viewer: {
        _id: viewer?._id,
        name: viewer?.name,
        profilePhoto: viewer?.profilePhoto || "",
      },
      viewedAt,
    });
    createNotification({
      userId: moment.authorId,
      title: "Your Moment was seen 👀",
      message: `👀 ${firstName(viewer?.name)} viewed your Moment.`,
      type: "moment_viewed",
      metadata: { momentId: moment._id },
    }).catch(() => {});
  }

  await moment.populate("authorId", "name profilePhoto");
  return toDTO(moment, userId);
};

// ─── react ───────────────────────────────────────────────────────────────────
/**
 * Toggle a single emoji reaction (Feature 6). Used by both the socket handler
 * and a REST fallback. Notifies + emits to the uploader.
 */
const reactToMoment = async (userId, momentId, emoji) => {
  if (!REACTION_SET.has(emoji)) throw err("Invalid reaction");
  const moment = await Moment.findById(momentId);
  if (!moment) throw err("Moment not found", 404);

  const member = await getCoupleByUser(userId);
  if (String(member._id) !== String(moment.coupleId)) throw err("Not allowed", 403);

  const uid = String(userId);
  const existing = moment.reactions.find((r) => String(r.userId) === uid);
  let added = false;
  if (existing) {
    if (existing.emoji === emoji) {
      moment.reactions = moment.reactions.filter((r) => String(r.userId) !== uid);
    } else {
      existing.emoji = emoji;
      added = true;
    }
  } else {
    moment.reactions.push({ userId, emoji });
    added = true;
  }
  await moment.save();

  // Broadcast the new reaction set to both partners.
  emitToUser(moment.authorId, "moment:reaction", {
    momentId: String(moment._id),
    reactions: moment.reactions,
  });
  emitToUser(userId, "moment:reaction", {
    momentId: String(moment._id),
    reactions: moment.reactions,
  });

  // Notify the uploader only when the reactor is the partner and added/changed.
  if (added && String(moment.authorId) !== uid) {
    const reactor = await User.findById(userId).select("name");
    createNotification({
      userId: moment.authorId,
      title: "New reaction 💗",
      message: `${emoji} ${firstName(reactor?.name)} reacted ${emoji} to your Moment.`,
      type: "moment_reaction",
      metadata: { momentId: moment._id, emoji },
    }).catch(() => {});
  }

  return { reactions: moment.reactions };
};

// ─── keep / save-to-journey / delete ────────────────────────────────────────────
const assertAuthor = (moment, userId) => {
  if (String(moment.authorId) !== String(userId)) throw err("Not allowed", 403);
};

// Manually keep a moment past 24h (Feature 10).
const keepMoment = async (userId, momentId) => {
  const moment = await Moment.findById(momentId);
  if (!moment) throw err("Moment not found", 404);
  assertAuthor(moment, userId);
  moment.kept = true;
  await moment.save();
  return toDTO(await moment.populate("authorId", "name profilePhoto"), userId);
};

// Promote a moment into the Journey as a Memory (Feature 9/10). Idempotent.
const saveToJourney = async (userId, moment) => {
  if (moment.savedToJourney && moment.memoryId) return moment;
  const memory = await memoryService.createMemory(userId, {
    title: moment.caption ? moment.caption.slice(0, 100) : "A shared Moment",
    description: moment.aiSuggestion?.text || "",
    memoryType: "other",
    memoryDate: moment.createdAt,
    photos: moment.type === "photo" ? [moment.mediaUrl] : [],
  });
  moment.savedToJourney = true;
  moment.memoryId = memory._id;
  await moment.save();
  return moment;
};

const saveToJourneyById = async (userId, momentId) => {
  const moment = await Moment.findById(momentId);
  if (!moment) throw err("Moment not found", 404);
  assertAuthor(moment, userId);
  await saveToJourney(userId, moment);
  return toDTO(await moment.populate("authorId", "name profilePhoto"), userId);
};

const destroyAsset = async (moment) => {
  if (moment.publicId && cloudinary.isConfigured()) {
    try {
      await cloudinary.uploader.destroy(moment.publicId, {
        resource_type: moment.resourceType === "video" ? "video" : "image",
      });
    } catch (e) {
      console.error("[moments] cloudinary destroy failed:", e.message);
    }
  }
};

const deleteMoment = async (userId, momentId) => {
  const moment = await Moment.findById(momentId);
  if (!moment) throw err("Moment not found", 404);
  assertAuthor(moment, userId);

  // If it lives in a highlight, detach the reference too.
  if (moment.highlightId) {
    await Highlight.updateOne(
      { _id: moment.highlightId },
      { $pull: { momentIds: moment._id } },
    );
  }

  await destroyAsset(moment);
  await moment.deleteOne();

  const partnerId = await getPartnerId(userId).catch(() => null);
  const payload = { momentId: String(momentId) };
  if (partnerId) emitToUser(partnerId, "moment:deleted", payload);
  emitToUser(userId, "moment:deleted", payload);

  return { success: true };
};

// ─── expiry sweep (cron) ─────────────────────────────────────────────────────
/**
 * Expire moments older than 24h (Feature 10/16). Save-aware:
 *   • kept / highlighted / already-in-journey → left in place (they simply drop
 *     out of the live ring because expiresAt has passed); media is preserved.
 *   • privacy === "save_journey" → auto-create the Journey entry, then keep.
 *   • everything else → destroy the Cloudinary asset + delete the doc, and emit
 *     `moment:expired` to both partners.
 * Returns the count actually destroyed.
 */
const expireMoments = async () => {
  const expired = await Moment.find({ expiresAt: { $lte: new Date() } });
  let destroyed = 0;

  for (const moment of expired) {
    try {
      if (moment.kept || moment.highlightId || moment.savedToJourney) {
        continue; // persistent — leave it
      }
      if (moment.privacy === "save_journey") {
        await saveToJourney(moment.authorId, moment); // keeps media + doc
        continue;
      }

      await destroyAsset(moment);
      const { coupleId, _id } = moment;
      await moment.deleteOne();
      destroyed += 1;

      // Tell both partners so any open viewer/ring drops it live.
      try {
        const couple = await require("../couples/couple.model").findById(coupleId);
        if (couple) {
          [couple.partnerOneId, couple.partnerTwoId]
            .filter(Boolean)
            .forEach((id) => emitToUser(id, "moment:expired", { momentId: String(_id) }));
        }
      } catch {
        /* emit best-effort */
      }
    } catch (e) {
      console.error("[moments] expire failed for", String(moment._id), e.message);
    }
  }
  return destroyed;
};

// ─── couple moment (Feature 12) ─────────────────────────────────────────────────
// Most recent live moment per author within the window.
const latestWithinWindow = async (coupleId, authorId) =>
  Moment.findOne({
    coupleId,
    authorId,
    privacy: { $ne: "private" },
    createdAt: { $gte: new Date(Date.now() - COUPLE_MOMENT_WINDOW_MS) },
    expiresAt: { $gt: new Date() },
    coupleMomentId: null,
  }).sort({ createdAt: -1 });

// After an upload, if BOTH partners have a fresh moment, offer a merge.
const checkCoupleMomentWindow = async (coupleId, userId, partnerId) => {
  const [mine, theirs] = await Promise.all([
    latestWithinWindow(coupleId, userId),
    latestWithinWindow(coupleId, partnerId),
  ]);
  if (mine && theirs) {
    const payload = {
      momentIds: [String(mine._id), String(theirs._id)],
      coupleId: String(coupleId),
    };
    emitToUser(userId, "moment:couple-available", payload);
    emitToUser(partnerId, "moment:couple-available", payload);
  }
};

// Whether a couple-moment merge is currently on offer (for page load).
const getCoupleMomentCandidate = async (userId) => {
  const couple = await getCoupleByUser(userId);
  const partnerId = await getPartnerId(userId);
  if (!partnerId) return { available: false };
  const [mine, theirs] = await Promise.all([
    latestWithinWindow(couple._id, userId),
    latestWithinWindow(couple._id, partnerId),
  ]);
  if (mine && theirs) {
    return { available: true, momentIds: [String(mine._id), String(theirs._id)] };
  }
  return { available: false };
};

/**
 * Merge two recent moments into one shared entry: links them, saves both to the
 * Journey (creating a Memory), and surfaces them as a relationship gallery item.
 */
const createCoupleMoment = async (userId, momentIds) => {
  const couple = await getCoupleByUser(userId);
  const ids = (momentIds || [])
    .filter((id) => mongoose.Types.ObjectId.isValid(id))
    .slice(0, 2);
  const moments = await Moment.find({ _id: { $in: ids }, coupleId: couple._id });
  if (moments.length < 2) throw err("Both Moments are required to combine", 400);

  const sharedId = moments[0]._id;
  for (const m of moments) {
    m.coupleMomentId = sharedId;
    m.kept = true; // a shared moment is persistent
    await m.save();
    // Each author's media joins the Journey via a Memory.
    await saveToJourney(m.authorId, m).catch(() => {});
  }

  // Notify both partners of the new shared entry.
  [couple.partnerOneId, couple.partnerTwoId].filter(Boolean).forEach((id) => {
    emitToUser(id, "moment:couple-created", { coupleMomentId: String(sharedId) });
    createNotification({
      userId: id,
      title: "Shared Moment created 💑",
      message: "❤️ You both shared a Moment — it's now in your Journey.",
      type: "couple_moment_ready",
      metadata: { coupleMomentId: sharedId },
    }).catch(() => {});
  });

  return { coupleMomentId: String(sharedId) };
};

// ─── highlights (Feature 11) ─────────────────────────────────────────────────────
const listHighlights = async (userId) => {
  const couple = await getCoupleByUser(userId);
  const highlights = await Highlight.find({ coupleId: couple._id }).sort({
    updatedAt: -1,
  });
  return highlights;
};

const getHighlight = async (userId, highlightId) => {
  const couple = await getCoupleByUser(userId);
  const highlight = await Highlight.findOne({ _id: highlightId, coupleId: couple._id });
  if (!highlight) throw err("Highlight not found", 404);
  const moments = await Moment.find({ _id: { $in: highlight.momentIds } })
    .sort({ createdAt: 1 })
    .populate("authorId", "name profilePhoto");
  return { highlight, moments: moments.map((m) => toDTO(m, userId)) };
};

const createHighlight = async (userId, { title, emoji, momentId }) => {
  const couple = await getCoupleByUser(userId);
  if (!title || !title.trim()) throw err("A highlight title is required");

  const momentIds = [];
  let coverUrl = "";
  if (momentId && mongoose.Types.ObjectId.isValid(momentId)) {
    const moment = await Moment.findOne({ _id: momentId, coupleId: couple._id });
    if (moment) {
      momentIds.push(moment._id); // highlightId is set after the highlight exists
      coverUrl = moment.thumbnailUrl || moment.mediaUrl;
    }
  }

  const highlight = await Highlight.create({
    coupleId: couple._id,
    createdBy: userId,
    title: title.trim().slice(0, 60),
    emoji: emoji?.slice(0, 8) || "⭐",
    coverUrl,
    momentIds,
  });

  if (momentIds.length) {
    await Moment.updateMany(
      { _id: { $in: momentIds } },
      { $set: { highlightId: highlight._id } },
    );
  }
  return highlight;
};

const addToHighlight = async (userId, highlightId, momentId) => {
  const couple = await getCoupleByUser(userId);
  const highlight = await Highlight.findOne({ _id: highlightId, coupleId: couple._id });
  if (!highlight) throw err("Highlight not found", 404);
  const moment = await Moment.findOne({ _id: momentId, coupleId: couple._id });
  if (!moment) throw err("Moment not found", 404);

  if (!highlight.momentIds.some((id) => String(id) === String(moment._id))) {
    highlight.momentIds.push(moment._id);
    if (!highlight.coverUrl) highlight.coverUrl = moment.thumbnailUrl || moment.mediaUrl;
    await highlight.save();
  }
  // Pinning into a highlight makes the moment persistent.
  moment.highlightId = highlight._id;
  await moment.save();
  return highlight;
};

const removeFromHighlight = async (userId, highlightId, momentId) => {
  const couple = await getCoupleByUser(userId);
  const highlight = await Highlight.findOne({ _id: highlightId, coupleId: couple._id });
  if (!highlight) throw err("Highlight not found", 404);
  highlight.momentIds = highlight.momentIds.filter((id) => String(id) !== String(momentId));
  await highlight.save();
  await Moment.updateOne({ _id: momentId }, { $set: { highlightId: null } });
  return highlight;
};

const deleteHighlight = async (userId, highlightId) => {
  const couple = await getCoupleByUser(userId);
  const highlight = await Highlight.findOne({ _id: highlightId, coupleId: couple._id });
  if (!highlight) throw err("Highlight not found", 404);
  await Moment.updateMany(
    { highlightId: highlight._id },
    { $set: { highlightId: null } },
  );
  await highlight.deleteOne();
  return { success: true };
};

// ─── profile integration (Feature 17) ─────────────────────────────────────────────
// All of a user's (or the partner's) saved/live moments, for the profile grid.
const listForProfile = async (viewerId, ownerId) => {
  const couple = await getCoupleByUser(viewerId);
  const query = { coupleId: couple._id, authorId: ownerId };
  if (String(ownerId) !== String(viewerId)) query.privacy = { $ne: "private" };
  const moments = await Moment.find(query)
    .sort({ createdAt: -1 })
    .limit(200)
    .populate("authorId", "name profilePhoto");
  return moments.map((m) => toDTO(m, viewerId));
};

module.exports = {
  toDTO,
  getCircles,
  createMoment,
  setMoodForMoment,
  markViewed,
  reactToMoment,
  keepMoment,
  saveToJourneyById,
  deleteMoment,
  expireMoments,
  getCoupleMomentCandidate,
  createCoupleMoment,
  listHighlights,
  getHighlight,
  createHighlight,
  addToHighlight,
  removeFromHighlight,
  deleteHighlight,
  listForProfile,
};
