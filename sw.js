// MyServiceTime — background helper ("service worker").
// 1) Offline: it keeps MyServiceTime's own files on this device, so the website opens instantly the next time and
//    works with no signal. Only the app's files are kept (never people's data, which stays encrypted in the app's
//    own storage), and nothing from other sites (the Cloud, maps, weather, payments) is kept.
// 2) It receives reminder alerts from the server even when MyServiceTime is closed, and shows them as
// phone/computer notifications. The alert never contains what the reminder is about (that stays
// encrypted); tapping it opens MyServiceTime, which then rings with all the details.

const VERSION = new URL(self.location).searchParams.get("v") || "0";
const CACHE = "mst-files-" + VERSION;
// the first things the app needs, kept straight away; everything else is kept the first time it is used
const SHELL = ["./", "index.html", "manifest.json", "icons/logo.svg", "icons/icon-192.png", "icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (event) => event.waitUntil((async () => {
  // a new version: forget the old copies
  for (const name of await caches.keys()) if (name.startsWith("mst-files-") && name !== CACHE) await caches.delete(name);
  await self.clients.claim();
})()));

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;        // other sites: never kept here
  if (url.pathname.startsWith("/dev/")) return;            // the test server's files
  if (url.pathname.endsWith("/version.json")) return;     // "a new version is ready": always asked online

  if (req.mode === "navigate") {
    // the page itself: the newest from the internet when there is a signal, the kept copy when there isn't
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        if (fresh.ok) (await caches.open(CACHE)).put("index.html", fresh.clone());
        return fresh;
      } catch {
        return (await caches.match("index.html")) || (await caches.match("./")) || Response.error();
      }
    })());
    return;
  }
  // files (scripts, styles, pictures, sounds): every version has its own address (…?v=217), so a kept copy is
  // always right — use it at once, and keep anything new the first time it is downloaded
  event.respondWith((async () => {
    const kept = await caches.match(req);
    if (kept) return kept;
    const fresh = await fetch(req);
    if (fresh.ok && fresh.type === "basic") (await caches.open(CACHE)).put(req, fresh.clone());
    return fresh;
  })());
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { /* plain text or empty */ }

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    const open = windows.find((w) => w.visibilityState === "visible");
    if (open) {
      // MyServiceTime is on screen: it rings by itself with the full details.
      open.postMessage({ type: "reminder" });
      return;
    }
    await self.registration.showNotification(data.title || "MyServiceTime", {
      body: data.body || "⏰",
      tag: data.tag || "daily-time-reminder",
      renotify: true,
      requireInteraction: true,
      icon: "icons/icon-192.png",
      badge: "icons/badge-72.png",
      vibrate: [300, 150, 300, 150, 300],
      data: { url: self.registration.scope },
    });
  })());
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const w of windows) {
      if ("focus" in w) {
        w.postMessage({ type: "reminder" });
        return w.focus();
      }
    }
    return self.clients.openWindow(event.notification.data?.url || "./");
  })());
});
