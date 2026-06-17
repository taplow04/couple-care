const asyncHandler = require("../../utils/asyncHandler");
const {
  getPublicKey,
  saveSubscription,
  removeSubscription,
  getSubscriptionCount,
  sendPushToUser,
  isPushEnabled,
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

// End-to-end self-test: pushes to the caller's own devices so they can confirm
// the full pipeline works. Returns how many devices were targeted — devices:0
// means "this account/browser never subscribed" (the usual root cause).
const test = asyncHandler(async (req, res) => {
  const devices = await getSubscriptionCount(req.user._id);
  if (devices > 0) {
    await sendPushToUser(req.user._id, {
      title: "CoupleCare ✅",
      body: "Push notifications are working on this device.",
      data: { url: "/dashboard" },
      tag: "push-test",
    });
  }
  res.status(200).json({
    success: true,
    data: { pushEnabled: isPushEnabled(), devices },
  });
});

module.exports = { vapidPublicKey, subscribe, unsubscribe, test };
