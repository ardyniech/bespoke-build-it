// DRG App Service Worker — Web Push + basic PWA offline shell
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (_) {
    data = { title: "DRG App", body: event.data ? event.data.text() : "" };
  }
  const title = data.title || "🚨 SOS DRG";
  const options = {
    body: data.body || "Ada panggilan darurat dari rekan.",
    icon: "/icon-512.png",
    badge: "/icon-512.png",
    vibrate: [200, 100, 200, 100, 200],
    tag: data.tag || "drg-sos",
    renotify: true,
    requireInteraction: true,
    data: { url: data.url || "/kejadian" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/kejadian";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) {
        if ("focus" in c) {
          c.navigate(target);
          return c.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(target);
    })
  );
});