const Notification = require("./notification.model");

const createNotification = async (data) => {
  return await Notification.create(data);
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
