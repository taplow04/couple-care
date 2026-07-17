const BucketItem = require("./bucket.model");
const User = require("../users/user.model");
const { getPartnerId } = require("../chat/chat.helpers");
const { createNotification } = require("../notifications/notification.service");
const { recordActivity } = require("../engagement/engagement.service");
const { ACTIVITY_TYPES } = require("../engagement/engagement.constants");

const firstName = (name) => name?.split(" ")[0] || "Your partner";

const createError = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
};

const getActiveCoupleId = async (userId) => {
  const user = await User.findById(userId).select("currentCoupleId name");
  if (!user) throw createError("User not found", 404);
  if (!user.currentCoupleId) throw createError("No active relationship", 400);
  return { coupleId: user.currentCoupleId, name: user.name };
};

const getItems = async (userId) => {
  const { coupleId } = await getActiveCoupleId(userId);
  return BucketItem.find({ coupleId }).sort({ completed: 1, createdAt: -1 });
};

const getStats = async (userId) => {
  const { coupleId } = await getActiveCoupleId(userId);
  const [total, completed] = await Promise.all([
    BucketItem.countDocuments({ coupleId }),
    BucketItem.countDocuments({ coupleId, completed: true }),
  ]);
  const percent = total === 0 ? 0 : Math.round((completed / total) * 100);
  return { total, completed, remaining: total - completed, percent };
};

const createItem = async (userId, data) => {
  const { coupleId } = await getActiveCoupleId(userId);

  if (!data.title?.trim()) throw createError("Title is required", 400);

  const item = await BucketItem.create({
    coupleId,
    createdBy: userId,
    title: data.title.trim(),
    notes: data.notes || "",
    category: data.category || "other",
    deadline: data.deadline || null,
  });

  // Interest Engine: planning a goal in a category is a deliberate in-app
  // interest signal (fire-and-forget, never blocks the create).
  require("../interests/interest.service").recordBucketCategory(
    userId,
    item.category,
    "bucket_add",
  );

  return item;
};

const updateItem = async (userId, itemId, data) => {
  const { coupleId } = await getActiveCoupleId(userId);

  const item = await BucketItem.findOne({ _id: itemId, coupleId });
  if (!item) throw createError("Bucket item not found", 404);

  const allowed = ["title", "notes", "category", "deadline"];
  allowed.forEach((field) => {
    if (data[field] !== undefined) item[field] = data[field];
  });

  await item.save();
  return item;
};

// Toggle (or set) completion. Completing fires the engagement loop + a partner
// notification; un-completing simply reverts the flags.
const setComplete = async (userId, itemId, completed) => {
  const { coupleId, name } = await getActiveCoupleId(userId);

  const item = await BucketItem.findOne({ _id: itemId, coupleId });
  if (!item) throw createError("Bucket item not found", 404);

  const wasCompleted = item.completed;
  const nowCompleted = completed === undefined ? !item.completed : !!completed;

  item.completed = nowCompleted;
  item.completedAt = nowCompleted ? new Date() : null;
  item.completedBy = nowCompleted ? userId : null;
  await item.save();

  // Only celebrate on a fresh completion (false -> true).
  if (nowCompleted && !wasCompleted) {
    await recordActivity(coupleId, userId, ACTIVITY_TYPES.BUCKET_COMPLETE, {
      bucketItemId: item._id,
      title: item.title,
      category: item.category,
    });

    // Actually DOING it is the strongest interest signal (fire-and-forget).
    require("../interests/interest.service").recordBucketCategory(
      userId,
      item.category,
      "bucket_complete",
    );

    try {
      const partnerId = await getPartnerId(userId);
      if (partnerId) {
        await createNotification({
          userId: partnerId,
          title: "🎯 Goal completed!",
          message: `${firstName(name)} checked off "${item.title}" from your bucket list!`,
          type: "bucket_completed",
          metadata: { bucketItemId: item._id },
        });
      }
    } catch {
      /* notification failure must not break completion */
    }
  }

  return item;
};

const deleteItem = async (userId, itemId) => {
  const { coupleId } = await getActiveCoupleId(userId);
  const item = await BucketItem.findOne({ _id: itemId, coupleId });
  if (!item) throw createError("Bucket item not found", 404);
  await item.deleteOne();
  return true;
};

module.exports = {
  getItems,
  getStats,
  createItem,
  updateItem,
  setComplete,
  deleteItem,
};
