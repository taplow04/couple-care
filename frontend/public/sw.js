/* CoupleCare service worker — web push + notification routing. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Incoming push → show an OS notification.
self.addEventListener("push", (event) => {
  const readPayload = () => {
    try {
      return event.data ? event.data.json() : {};
    } catch {
      return { title: "CoupleCare", body: event.data ? event.data.text() : "" };
    }
  };
  const payload = readPayload();

  const {
    title = "CoupleCare",
    body = "",
    data = {},
    tag,
    requireInteraction = false,
    type,
  } = payload;

  event.waitUntil(
    (async () => {
      // WhatsApp behavior: if it's a call and the app is already open & focused,
      // let the in-app incoming-call modal handle it — don't double-notify.
      if (type === "call") {
        const clients = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        });
        if (clients.some((c) => c.visibilityState === "visible")) return;
      }

      await self.registration.showNotification(title, {
        body,
        icon: "/icon-192.png",
        badge: "/icon-192.png",
        tag,
        data,
        requireInteraction,
        vibrate: type === "call" ? [400, 200, 400, 200, 400] : [100, 50, 100],
      });
    })(),
  );
});

// Tap a notification → focus an existing window (navigating it) or open one.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if ("focus" in client) {
          if ("navigate" in client) {
            try {
              await client.navigate(url);
            } catch {
              /* cross-origin / not allowed — ignore */
            }
          }
          return client.focus();
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
