const asyncHandler = require("../../utils/asyncHandler");

const { sendMessage, getMessages, markSeen } = require("./chat.service");

const send = asyncHandler(async (req, res) => {
  const message = await sendMessage(req.user._id, req.body.text);

  res.status(201).json({
    success: true,
    data: message,
  });
});

const getAll = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;

  const limit = Number(req.query.limit) || 50;

  const messages = await getMessages(req.user._id, page, limit);

  res.status(200).json({
    success: true,
    data: messages,
  });
});

const seen = asyncHandler(async (req, res) => {
  const message = await markSeen(req.user._id, req.params.id);

  res.status(200).json({
    success: true,
    data: message,
  });
});

module.exports = {
  send,
  getAll,
  seen,
};
