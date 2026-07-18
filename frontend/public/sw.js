/* CoupleCare service worker — web push + notification routing + offline shell.

   Caching strategy is deliberately conservative to avoid the classic PWA
   "stuck on an old build" trap:
     • Navigations (HTML): network-FIRST → online users ALWAYS get the latest
       app shell; the cached copy is only a fallback when offline.
     • Hashed build assets (/assets/*) + static icons: cache-FIRST (immutable —
       Vite fingerprints filenames, so a new build = new URLs, never stale).
     • API / socket / Cloudinary / cross-origin: never cached (always network).
*/

// Bump this on every release that must invalidate stale clients. Changing these
// bytes makes the browser re-install the SW; `activate` then purges old caches,
// so users always pick up the latest build (V2.0 engagement features included).
const CACHE = "couple-care-v9";
const OFFLINE_URL = "/index.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cache = await caches.open(CACHE);
        await cache.add(OFFLINE_URL);
      } catch {
        /* offline at install — fetch handler will populate later */
      }
      self.skipWaiting();
    })(),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from previous versions.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

const isStaticAsset = (url) =>
  url.pathname.startsWith("/assets/") ||
  /\.(?:png|svg|ico|webmanifest|woff2?)$/.test(url.pathname);

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Only handle our own origin; never touch API/socket/Cloudinary/etc.
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;

  // Navigations → network-first with offline fallback.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE);
          cache.put(OFFLINE_URL, fresh.clone());
          return fresh;
        } catch {
          return (await caches.match(OFFLINE_URL)) || Response.error();
        }
      })(),
    );
    return;
  }

  // Immutable hashed assets → cache-first.
  if (isStaticAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        const res = await fetch(request);
        if (res.ok) {
          const cache = await caches.open(CACHE);
          cache.put(request, res.clone());
        }
        return res;
      })(),
    );
  }
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
