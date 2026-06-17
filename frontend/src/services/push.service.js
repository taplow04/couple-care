import api from "../api/axios";

// Push + service workers require a secure context (HTTPS or localhost) and
// browser support. Everything here is a no-op when unsupported.
export const isPushSupported = () =>
  typeof window !== "undefined" &&
  "serviceWorker" in navigator &&
  "PushManager" in window &&
  "Notification" in window;

const urlBase64ToUint8Array = (base64String) => {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) output[i] = raw.charCodeAt(i);
  return output;
};

export const registerServiceWorker = async () => {
  if (!isPushSupported()) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch (err) {
    console.error("[push] SW registration failed:", err);
    return null;
  }
};

export const getPermission = () =>
  isPushSupported() ? Notification.permission : "denied";

/**
 * Ensure the browser is subscribed and the subscription is saved server-side.
 * Requests permission if needed (must be called from a user gesture the first
 * time). Returns true on success. Safe to call repeatedly (idempotent).
 */
export const subscribeToPush = async () => {
  if (!isPushSupported()) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration =
    (await navigator.serviceWorker.getRegistration()) ||
    (await registerServiceWorker());
  if (!registration) return false;
  await navigator.serviceWorker.ready;

  // Fetch the server's VAPID public key.
  let publicKey;
  try {
    const res = await api.get("/push/vapid-public-key");
    publicKey = res.data?.data?.publicKey;
  } catch {
    return false;
  }
  if (!publicKey) return false; // push not configured on the server

  let subscription = await registration.pushManager.getSubscription();
  if (!subscription) {
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });
  }

  try {
    await api.post("/push/subscribe", { subscription });
    return true;
  } catch {
    return false;
  }
};

// True if THIS browser currently holds an active push subscription.
export const isSubscribed = async () => {
  if (!isPushSupported()) return false;
  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const sub = await registration?.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
};

// Fires a real OS push to the current user's own devices (end-to-end test).
// Returns { pushEnabled, devices } so the UI can explain failures precisely.
export const sendTestPush = async () => {
  const res = await api.post("/push/test");
  return res.data?.data || { pushEnabled: false, devices: 0 };
};

export const unsubscribeFromPush = async () => {
  if (!isPushSupported()) return;
  const registration = await navigator.serviceWorker.getRegistration();
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  try {
    await api.post("/push/unsubscribe", { endpoint: subscription.endpoint });
  } catch {
    /* ignore */
  }
  await subscription.unsubscribe();
};
