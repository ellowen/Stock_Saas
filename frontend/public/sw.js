// GIRO Service Worker — Push Notifications

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data;
  try {
    data = event.data.json();
  } catch {
    data = { title: "GIRO", body: event.data.text() };
  }

  const { title = "GIRO", body = "", icon = "/vite.svg", url = "/app/dashboard", tag } = data;

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon,
      tag: tag ?? "giro-notification",
      badge: "/vite.svg",
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
