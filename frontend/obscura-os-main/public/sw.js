/**
 * sw.js — Obscura Pay Service Worker
 * Handles Web Push notifications dispatched by obscura-api.
 *
 * Must be served from the root path (/sw.js) so its scope covers the entire app.
 */

const SW_VERSION = "pay-final-p1-2";
const FALLBACK_URL = "https://obscura-os-nine.vercel.app/pay";

function notificationUrlFrom(data, nestedData) {
  const rawUrl = data.url || nestedData.url || data.clickUrl || nestedData.clickUrl || FALLBACK_URL;
  try {
    return new URL(rawUrl, self.location.origin).toString();
  } catch {
    return FALLBACK_URL;
  }
}

// ── Push event: display notification ──────────────────────────────────────────
self.addEventListener("push", function (event) {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Obscura Pay", body: event.data ? event.data.text() : "New activity" };
  }

  const nestedData = data && typeof data.data === "object" && data.data !== null ? data.data : {};
  const targetUrl = notificationUrlFrom(data, nestedData);
  const title   = data.title   || "Obscura Pay";
  const options = {
    body:    data.body    || "You have new activity on Obscura Pay.",
    icon:    data.icon    || "/favicon.ico",
    badge:   "/favicon.ico",
    tag:     data.tag     || "obscura-pay",
    renotify: true,
    data: {
      ...nestedData,
      url: targetUrl,
    },
  };

  console.info("[SW] push received", {
    title,
    tag: options.tag,
    eventName: options.data.eventName,
    txHash: options.data.txHash,
    version: SW_VERSION,
  });

  event.waitUntil(
    self.registration.showNotification(title, options).catch(function (err) {
      console.error("[SW] showNotification failed", err);
    })
  );
});

// ── Notification click: open/focus app tab ────────────────────────────────────
self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const targetUrl = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : FALLBACK_URL;

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

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Install & activate: skip waiting so the SW updates immediately ─────────────
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(clients.claim());
});
