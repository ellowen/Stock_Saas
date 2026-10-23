// GIRO push notification handlers. Imported by the Workbox service worker in
// production (vite.config.ts importScripts) and registered directly in dev.

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "GIRO", body: event.data.text() };
  }

  const { title = "GIRO", body = "", icon = "/pwa-192x192.png", url = "/app/dashboard", tag } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag: tag ?? "giro-notification",
      badge: "/pwa-192x192.png",
      data: { url },
      requireInteraction: false,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/app/dashboard";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Focus existing window if open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Otherwise open new window
        if (self.clients.openWindow) {
          return self.clients.openWindow(url);
        }
      })
  );
});
