const Notification = require("./notification.model");
const { emitToUser } = require("../../utils/realtime");

const createNotification = async (data) => {
  const notification = await Notification.create(data);

  // Push it to the recipient in real time (no-op if they're offline). Never
  // let a realtime failure break notification creation.
  try {
    emitToUser(notification.userId, "notification:new", notification);
  } catch {
    /* offline / io not ready */
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
