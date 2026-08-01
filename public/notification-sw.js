self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || self.registration.scope;

  event.waitUntil((async () => {
    const target = new URL(targetUrl);
    const clientsList = await clients.matchAll({ type: "window", includeUncontrolled: true });

    // Focus eerst het bestaande speltabblad zonder navigatie of reload.
    // Daardoor blijft de actuele room- en spelstate intact.
    for (const client of clientsList) {
      const clientUrl = new URL(client.url);
      if (clientUrl.origin === target.origin && clientUrl.pathname === target.pathname && "focus" in client) {
        await client.focus();
        return;
      }
    }

    // Alleen als het spel niet meer openstaat, wordt een room-link geopend.
    if (clients.openWindow) await clients.openWindow(targetUrl);
  })());
});
