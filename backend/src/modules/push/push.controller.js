const asyncHandler = require("../../utils/asyncHandler");
const {
  getPublicKey,
  saveSubscription,
  removeSubscription,
} = require("./push.service");

const vapidPublicKey = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: { publicKey: getPublicKey() } });
});

const subscribe = asyncHandler(async (req, res) => {
  const { subscription } = req.body;
  await saveSubscription(req.user._id, subscription, req.headers["user-agent"]);
  res.status(201).json({ success: true });
});

const unsubscribe = asyncHandler(async (req, res) => {
  const { endpoint } = req.body;
  await removeSubscription(endpoint);
  res.status(200).json({ success: true });
});

module.exports = { vapidPublicKey, subscribe, unsubscribe };
