const asyncHandler = require("../../utils/asyncHandler");

const {
  getNotifications,
  markRead,
  markAllRead,
  deleteNotification,
} = require("./notification.service");

const getAll = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;

  const limit = Number(req.query.limit) || 20;

  const notifications = await getNotifications(req.user._id, page, limit);

  res.status(200).json({
    success: true,
    data: notifications,
  });
});

const read = asyncHandler(async (req, res) => {
  const notification = await markRead(req.user._id, req.params.id);

  res.status(200).json({
    success: true,
    data: notification,
  });
});

const readAll = asyncHandler(async (req, res) => {
  await markAllRead(req.user._id);

  res.status(200).json({
    success: true,
    message: "All notifications marked as read",
  });
});

const remove = asyncHandler(async (req, res) => {
  await deleteNotification(req.user._id, req.params.id);

  res.status(200).json({
    success: true,
    message: "Notification deleted",
  });
});

module.exports = {
  getAll,
  read,
  readAll,
  remove,
};
