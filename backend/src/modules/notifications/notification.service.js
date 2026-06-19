const Notification = require("./notification.model");
const { emitToUser } = require("../../utils/realtime");
const { sendPushToUser } = require("../push/push.service");

// Map a notification type to the in-app screen its push should open.
const URL_FOR_TYPE = {
  partner_mood_alert: "/mood-analytics",
  mood_reminder: "/moods",
  memory_reminder: "/memories",
  anniversary_reminder: "/journey",
  relationship_milestone: "/journey",
  birthday_reminder: "/dashboard",
  weekly_summary_ready: "/ai",
  streak_reminder: "/dashboard",
  streak_milestone: "/dashboard",
  achievement_unlocked: "/journey",
  bucket_completed: "/bucket-list",
  surprise_ready: "/dashboard",
  love_letter_received: "/ai-center",
  sleep_reminder: "/sleep",
};

const createNotification = async (data) => {
  const notification = await Notification.create(data);

  // Push it to the recipient in real time (no-op if they're offline). Never
  // let a realtime failure break notification creation.
  try {
    emitToUser(notification.userId, "notification:new", notification);
  } catch {
    /* offline / io not ready */
  }

  // Also deliver as a real OS/browser push (works when the app is closed).
  // Best-effort — a push failure must never break notification creation.
  try {
    await sendPushToUser(notification.userId, {
      title: notification.title || "CoupleCare",
      body: notification.message || "",
      data: { url: URL_FOR_TYPE[notification.type] || "/notifications" },
      tag: notification.type || "system",
    });
  } catch {
    /* push disabled / send error */
  }

  return notification;
};

const getNotifications = async (userId, page = 1, limit = 20) => {
  const skip = (page - 1) * limit;

  return await Notification.find({
    userId,
  })
    .sort({
      createdAt: -1,
    })
    .skip(skip)
    .limit(limit);
};

const markRead = async (userId, notificationId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  notification.isRead = true;

  await notification.save();

  return notification;
};

const markAllRead = async (userId) => {
  await Notification.updateMany(
    {
      userId,
      isRead: false,
    },
    {
      isRead: true,
    },
  );

  return true;
};

const deleteNotification = async (userId, notificationId) => {
  const notification = await Notification.findOne({
    _id: notificationId,
    userId,
  });

  if (!notification) {
    throw new Error("Notification not found");
  }

  await notification.deleteOne();

  return true;
};

module.exports = {
  createNotification,
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
};
