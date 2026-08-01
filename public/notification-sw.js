self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || self.registration.scope;

  event.waitUntil((async () => {
    const clientsList = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of clientsList) {
      if ("focus" in client) {
        await client.focus();
        if ("navigate" in client) await client.navigate(targetUrl);
        return;
      }
    }

    if (clients.openWindow) await clients.openWindow(targetUrl);
  })());
});
