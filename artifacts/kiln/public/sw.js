self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(clients.claim()));

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data?.json() ?? {}; } catch {}
  const title = data.title ?? "Kiln";
  const options = {
    body: data.body ?? "You have a new notification",
    icon: "/kiln/favicon.ico",
    badge: "/kiln/favicon.ico",
    tag: data.tag ?? "kiln-notification",
    renotify: true,
    data: { url: data.url ?? "/kiln/" },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url ?? "/kiln/";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url.includes("/kiln/") && "focus" in client) return client.focus();
      }
      return clients.openWindow(targetUrl);
    }),
  );
});
