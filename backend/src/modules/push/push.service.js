const webpush = require("web-push");
const PushSubscription = require("./pushSubscription.model");

// Configure VAPID once. If keys are missing, push is disabled (logged) but the
// app keeps running — push is additive to the in-app realtime notifications.
let pushEnabled = false;
if (process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY) {
  // setVapidDetails THROWS on a malformed key. Guard it so a bad/typo'd env var
  // only disables push instead of crash-looping the entire backend at boot.
  try {
    webpush.setVapidDetails(
      process.env.VAPID_SUBJECT || "mailto:support@couplecare.app",
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY,
    );
    pushEnabled = true;
  } catch (e) {
    console.error(
      "[push] Invalid VAPID keys — push disabled. Fix VAPID_PUBLIC_KEY/VAPID_PRIVATE_KEY:",
      e.message,
    );
  }
} else {
  console.warn(
    "[push] VAPID keys not set — browser push notifications are disabled.",
  );
}

const isPushEnabled = () => pushEnabled;

const getPublicKey = () => process.env.VAPID_PUBLIC_KEY || null;

// Upsert by endpoint so re-subscribing the same browser doesn't duplicate.
const saveSubscription = async (userId, subscription, userAgent = "") => {
  if (!subscription?.endpoint || !subscription?.keys?.p256dh) {
    const err = new Error("Invalid push subscription");
    err.statusCode = 400;
    throw err;
  }

  await PushSubscription.findOneAndUpdate(
    { endpoint: subscription.endpoint },
    {
      userId,
      endpoint: subscription.endpoint,
      keys: subscription.keys,
      userAgent,
    },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  );

  return { success: true };
};

const removeSubscription = async (endpoint) => {
  if (!endpoint) return { success: true };
  await PushSubscription.deleteOne({ endpoint });
  return { success: true };
};

// How many devices a user currently has subscribed (for diagnostics).
const getSubscriptionCount = async (userId) => {
  try {
    return await PushSubscription.countDocuments({ userId });
  } catch {
    return 0;
  }
};

/**
 * Send a push to every device a user has registered. Best-effort: a failure for
 * one device never throws to the caller, and expired endpoints (404/410) are
 * pruned automatically. `payload` is an object — the SW reads title/body/data.
 */
const sendPushToUser = async (userId, payload) => {
  if (!pushEnabled || !userId) return;

  let subs;
  try {
    subs = await PushSubscription.find({ userId });
  } catch (e) {
    console.error("[push] lookup failed:", e.message);
    return;
  }
  if (!subs.length) return;

  const body = JSON.stringify(payload);
  // TTL keeps the message queued by the push service (FCM/Mozilla/Apple) for a
  // while if the device is briefly offline; high urgency for time-sensitive
  // events (messages/calls) so they wake the device.
  const options = { TTL: 3600, urgency: "high" };

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            // Convert the Mongoose subdoc to a plain object for web-push.
            keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
          },
          body,
          options,
        );
      } catch (err) {
        // 404 Gone / 410 = subscription expired or revoked → prune it.
        if (err.statusCode === 404 || err.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        } else {
          console.error("[push] send failed:", err.statusCode, err.message);
        }
      }
    }),
  );
};

module.exports = {
  isPushEnabled,
  getPublicKey,
  saveSubscription,
  removeSubscription,
  getSubscriptionCount,
  sendPushToUser,
};
