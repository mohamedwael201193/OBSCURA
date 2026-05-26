/**
 * sw.js — Obscura Pay Service Worker
 * Handles Web Push notifications dispatched by obscura-api.
 *
 * Must be served from the root path (/sw.js) so its scope covers the entire app.
 */

// ── Push event: display notification ──────────────────────────────────────────
self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Obscura Pay", body: event.data ? event.data.text() : "New activity" };
  }

  const title   = data.title   || "Obscura Pay";
  const options = {
    body:    data.body    || "You have new activity on Obscura Pay.",
    icon:    data.icon    || "/favicon.ico",
    badge:   "/favicon.ico",
    tag:     data.tag     || "obscura-pay",
    renotify: true,
    data: {
      url: data.url || "https://obscura-os-nine.vercel.app/pay",
    },
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// ── Notification click: open/focus app tab ────────────────────────────────────
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : "https://obscura-os-nine.vercel.app/pay";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        // Focus an existing tab if available
        for (const client of windowClients) {
          if (client.url === targetUrl && "focus" in client) {
            return client.focus();
          }
        }
        // Otherwise open a new tab
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

// ── Install & activate: skip waiting so the SW updates immediately ─────────────
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(clients.claim());
});
