/**
 * sw.js — Obscura Pay Service Worker
 * Handles Web Push notifications dispatched by obscura-api.
 *
 * Must be served from the root path (/sw.js) so its scope covers the entire app.
 */

const SW_VERSION = "pay-final-p1-3";
const FALLBACK_URL = "https://obscuraos.online/pay";

function asObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : {};
}

function notificationUrlFrom(data, nestedData) {
  const rawUrl = data.url || nestedData.url || data.clickUrl || nestedData.clickUrl || FALLBACK_URL;
  try {
    return new URL(rawUrl, self.location.origin).toString();
  } catch {
    return FALLBACK_URL;
  }
}

function parsePushData(event) {
  if (!event.data) return {};
  try {
    return event.data.json();
  } catch {
    const text = event.data.text();
    try {
      return JSON.parse(text);
    } catch {
      return { title: "Obscura Pay", body: text || "New activity" };
    }
  }
}

function normalizeNotificationPayload(input) {
  const data = asObject(input);
  const nestedData = asObject(data.data);
  const targetUrl = notificationUrlFrom(data, nestedData);
  const debug = Boolean(data.debug || nestedData.debug || nestedData.eventName === "debug.push-test");
  const title = data.title || nestedData.title || "Obscura Pay";
  const body = data.body || nestedData.body || "You have new activity on Obscura Pay.";
  const sentAt = data.sentAt || nestedData.sentAt;
  const timestamp = typeof sentAt === "string" && !Number.isNaN(Date.parse(sentAt))
    ? Date.parse(sentAt)
    : Date.now();

  return {
    title,
    options: {
      body,
      icon: data.icon || nestedData.icon || "/favicon.ico",
      badge: data.badge || nestedData.badge || "/favicon.ico",
      tag: data.tag || nestedData.tag || (debug ? `obscura-debug-${timestamp}` : `obscura-pay-${timestamp}`),
      renotify: data.renotify !== false,
      requireInteraction: Boolean(data.requireInteraction || nestedData.requireInteraction || debug),
      silent: false,
      timestamp,
      actions: Array.isArray(data.actions) ? data.actions : [{ action: "open", title: "Open" }],
      data: {
        ...nestedData,
        url: targetUrl,
        eventName: nestedData.eventName || data.eventName,
        txHash: nestedData.txHash || data.txHash,
        wallet: nestedData.wallet || data.wallet,
        debug,
      },
    },
  };
}

async function broadcastPush(payload) {
  const windowClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
  for (const client of windowClients) {
    client.postMessage({
      type: "OBSCURA_PUSH_RECEIVED",
      version: SW_VERSION,
      payload: {
        title: payload.title,
        body: payload.options.body,
        tag: payload.options.tag,
        url: payload.options.data.url,
        eventName: payload.options.data.eventName,
        txHash: payload.options.data.txHash,
        debug: payload.options.data.debug,
      },
    });
  }
}

async function showObscuraNotification(payload, source) {
  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    console.warn("[SW] notification permission denied", { source, version: SW_VERSION });
    return;
  }

  console.info("[SW] showNotification", {
    source,
    title: payload.title,
    tag: payload.options.tag,
    eventName: payload.options.data.eventName,
    txHash: payload.options.data.txHash,
    permission: typeof Notification !== "undefined" ? Notification.permission : "unknown",
    version: SW_VERSION,
  });
  await self.registration.showNotification(payload.title, payload.options);
}

// ── Push event: display notification ──────────────────────────────────────────
self.addEventListener("push", function (event) {
  const payload = normalizeNotificationPayload(parsePushData(event));

  console.info("[SW] push received", {
    title: payload.title,
    tag: payload.options.tag,
    eventName: payload.options.data.eventName,
    txHash: payload.options.data.txHash,
    version: SW_VERSION,
  });

  event.waitUntil(
    Promise.all([
      broadcastPush(payload),
      showObscuraNotification(payload, "push"),
    ]).catch(function (err) {
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
        const target = new URL(targetUrl, self.location.origin).toString();
        const targetOrigin = new URL(target).origin;
        let sameOriginClient = null;

        for (const client of windowClients) {
          if (client.url === target && "focus" in client) {
            return client.focus();
          }
          if (!sameOriginClient && new URL(client.url).origin === targetOrigin) sameOriginClient = client;
        }

        if (sameOriginClient) {
          if ("navigate" in sameOriginClient) {
            return sameOriginClient.navigate(target).then(function (client) {
              return client && "focus" in client ? client.focus() : client;
            });
          }
          if ("focus" in sameOriginClient) return sameOriginClient.focus();
        }

        if (clients.openWindow) {
          return clients.openWindow(target);
        }
      })
  );
});

self.addEventListener("message", function (event) {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data && event.data.type === "OBSCURA_SHOW_NOTIFICATION") {
    const payload = normalizeNotificationPayload(event.data.payload || {});
    event.waitUntil(
      showObscuraNotification(payload, "client-message").catch(function (err) {
        console.error("[SW] client showNotification failed", err);
      })
    );
  }
});

// ── Install & activate: skip waiting so the SW updates immediately ─────────────
self.addEventListener("install", function () {
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(clients.claim());
});
