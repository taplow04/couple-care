const GalleryItem = require("./gallery.model");
const cloudinary = require("../../config/cloudinary");
const { getCoupleByUser } = require("../chat/chat.helpers");
const { canPartnerView } = require("../users/privacy.helper");
const User = require("../users/user.model");

/**
 * List the caller's own personal gallery (newest first). Always fully visible
 * to the owner regardless of privacy (privacy only gates the PARTNER's view).
 */
const listPersonal = async (ownerId) =>
  GalleryItem.find({ ownerId, scope: "personal" }).sort({ createdAt: -1 });

/**
 * Personal gallery of a PARTNER, honoring that partner's privacy. Images are
 * gated by galleryVisibility, videos by videoVisibility; per-item "private"
 * always hides. Returns { items, hidden } so the UI can show a lock state.
 */
const listPartnerPersonal = async (partnerId) => {
  const partner = await User.findById(partnerId).select("privacy");
  const galleryOk = canPartnerView(partner?.privacy?.galleryVisibility);
  const videoOk = canPartnerView(partner?.privacy?.videoVisibility);

  if (!galleryOk && !videoOk) {
    return { items: [], hidden: true };
  }

  const allowedTypes = [];
  if (galleryOk) allowedTypes.push("image");
  if (videoOk) allowedTypes.push("video");

  const items = await GalleryItem.find({
    ownerId: partnerId,
    scope: "personal",
    type: { $in: allowedTypes },
    visibility: { $ne: "private" },
  }).sort({ createdAt: -1 });

  return { items, hidden: false };
};

/** Couple's relationship (co-owned) gallery — visible to both partners. */
const listRelationship = async (coupleId) =>
  GalleryItem.find({ coupleId, scope: "relationship" }).sort({ createdAt: -1 });

/** Personal photo/video counts for the profile stats row. */
const getStats = async (ownerId) => {
  const [photos, videos] = await Promise.all([
    GalleryItem.countDocuments({ ownerId, scope: "personal", type: "image" }),
    GalleryItem.countDocuments({ ownerId, scope: "personal", type: "video" }),
  ]);
  return { photos, videos };
};

/**
 * Persist an uploaded item. `uploaded` is the Cloudinary result; the caller
 * (controller) handles the actual upload so this stays pure-ish. For a
 * relationship-scope item the couple is resolved + attached.
 */
const createItem = async (ownerId, { scope, type, uploaded, caption, visibility }) => {
  let coupleId = null;
  if (scope === "relationship") {
    const couple = await getCoupleByUser(ownerId);
    coupleId = couple._id;
  }

  return GalleryItem.create({
    ownerId,
    coupleId,
    scope: scope === "relationship" ? "relationship" : "personal",
    type,
    url: uploaded.secure_url,
    publicId: uploaded.public_id,
    caption: caption || "",
    width: uploaded.width || null,
    height: uploaded.height || null,
    mediaDuration: uploaded.duration ? Math.round(uploaded.duration) : null,
    visibility: ["private", "partner_only", "shared"].includes(visibility)
      ? visibility
      : "partner_only",
  });
};

/** Edit a caption / per-item visibility. Owner only. */
const updateItem = async (ownerId, itemId, { caption, visibility }) => {
  const item = await GalleryItem.findById(itemId);
  if (!item) {
    const err = new Error("Gallery item not found");
    err.statusCode = 404;
    throw err;
  }
  if (item.ownerId.toString() !== ownerId.toString()) {
    const err = new Error("Not allowed");
    err.statusCode = 403;
    throw err;
  }
  if (caption !== undefined) item.caption = String(caption).slice(0, 500);
  if (["private", "partner_only", "shared"].includes(visibility)) {
    item.visibility = visibility;
  }
  await item.save();
  return item;
};

/** Delete an item + its Cloudinary asset. Owner only. */
const deleteItem = async (ownerId, itemId) => {
  const item = await GalleryItem.findById(itemId);
  if (!item) {
    const err = new Error("Gallery item not found");
    err.statusCode = 404;
    throw err;
  }
  if (item.ownerId.toString() !== ownerId.toString()) {
    const err = new Error("Not allowed");
    err.statusCode = 403;
    throw err;
  }

  // Best-effort asset cleanup — a Cloudinary failure must not block the delete.
  if (item.publicId && cloudinary.isConfigured()) {
    try {
      await cloudinary.uploader.destroy(item.publicId, {
        resource_type: item.type === "video" ? "video" : "image",
      });
    } catch (err) {
      console.error("[cloudinary] gallery destroy failed:", err.message);
    }
  }

  await item.deleteOne();
  return { success: true };
};

module.exports = {
  listPersonal,
  listPartnerPersonal,
  listRelationship,
  getStats,
  createItem,
  updateItem,
  deleteItem,
};
