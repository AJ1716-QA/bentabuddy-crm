const CACHE_NAME = "bentabuddy-shell-v6";
const APP_SHELL = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.json", "./icons/icon.svg"];
self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
    ))
  );
  self.clients.claim();
});
self.addEventListener("push", (event) => {
  let payload = { title: "BentaBuddy order update", body: "You have an update about your order." };
  try { if (event.data) payload = { ...payload, ...event.data.json() }; } catch (_) {}
  event.waitUntil(self.registration.showNotification(payload.title || "BentaBuddy order update", {
    body: payload.body || "You have an update about your order.",
    icon: "./icons/icon.svg",
    badge: "./icons/icon.svg",
    data: { url: payload.url || self.registration.scope }
  }));
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url;
  event.waitUntil((async () => {
    const url = new URL(target || self.registration.scope, self.location.origin);
    if (url.origin !== self.location.origin) return;
    const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(self.location.origin) && "focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(url.href);
        return;
      }
    }
    if (self.clients.openWindow) await self.clients.openWindow(url.href);
  })());
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // Never cache Supabase API/Auth responses or other cross-origin requests.
  if (url.origin !== self.location.origin || request.method !== "GET") return;
  event.respondWith(
    fetch(request).then((response) => {
      if (response && response.ok) {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(async () => {
      const cached = await caches.match(request);
      return cached || (request.mode === "navigate" ? caches.match("./index.html") : Response.error());
    })
  );
});
