/**
 * useNotificationPrefs.ts — Read / write notification preferences + Web Push subscribe
 *
 * Endpoints on pay-notifications service (port 3702).
 * Service worker registration is assumed to happen at app boot via main.tsx.
 */

import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";

const NOTIFICATIONS_URL =
  import.meta.env.VITE_NOTIFICATIONS_URL as string ?? "http://localhost:3702";

export interface NotificationPrefs {
  wallet:       string;
  push_enabled: boolean;
  email_enabled: boolean;
  email?:       string;
  events:       string[];
}

const DEFAULT_PREFS: Omit<NotificationPrefs, "wallet"> = {
  push_enabled:  false,
  email_enabled: false,
  events:        ["*"],
};

interface UseNotificationPrefsResult {
  prefs:        NotificationPrefs | null;
  isLoading:    boolean;
  pushSupported: boolean;
  enable:       () => Promise<void>;
  disable:      () => Promise<void>;
  savePrefs:    (updates: Partial<NotificationPrefs>) => Promise<void>;
}

export function useNotificationPrefs(): UseNotificationPrefsResult {
  const { address } = useAccount();
  const wallet = address?.toLowerCase() ?? null;

  const [prefs,         setPrefs]         = useState<NotificationPrefs | null>(null);
  const [isLoading,     setIsLoading]     = useState(false);
  const [pushSupported, setPushSupported] = useState(false);

  // ── Check push support ────────────────────────────────────────────────────
  useEffect(() => {
    setPushSupported(
      "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
    );
  }, []);

  // ── Load prefs on connect ─────────────────────────────────────────────────
  useEffect(() => {
    if (!wallet) { setPrefs(null); return; }
    setIsLoading(true);
    fetch(`${NOTIFICATIONS_URL}/prefs/${wallet}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setPrefs(data ?? { wallet, ...DEFAULT_PREFS }))
      .catch(() => setPrefs({ wallet, ...DEFAULT_PREFS }))
      .finally(() => setIsLoading(false));
  }, [wallet]);

  // ── Subscribe to Web Push ─────────────────────────────────────────────────
  const enable = useCallback(async () => {
    if (!wallet || !pushSupported) return;

    if (Notification.permission === "denied") {
      throw new Error("Browser notifications are blocked for this site.");
    }

    if (Notification.permission !== "granted") {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }
    }

    // Get VAPID public key from service
    const keyResponse = await fetch(`${NOTIFICATIONS_URL}/vapid-public-key`);
    if (!keyResponse.ok) throw new Error(`VAPID key request failed (${keyResponse.status})`);
    const { publicKey } = await keyResponse.json() as { publicKey?: string };
    if (!publicKey) throw new Error("VAPID public key is missing.");

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription() ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey),
    });

    const subscribeResponse = await fetch(`${NOTIFICATIONS_URL}/subscribe`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ wallet, subscription: sub.toJSON() }),
    });
    if (!subscribeResponse.ok) {
      throw new Error(`Push subscription save failed (${subscribeResponse.status})`);
    }

    await savePrefsInner({ push_enabled: true });
  }, [wallet, pushSupported]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Unsubscribe ───────────────────────────────────────────────────────────
  const disable = useCallback(async () => {
    if (!wallet) return;

    const reg = await navigator.serviceWorker.ready;
    const sub = await reg.pushManager.getSubscription();
    if (sub) await sub.unsubscribe();

    const response = await fetch(`${NOTIFICATIONS_URL}/subscribe`, {
      method:  "DELETE",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ wallet }),
    });
    if (!response.ok) throw new Error(`Push subscription removal failed (${response.status})`);

    await savePrefsInner({ push_enabled: false });
  }, [wallet]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Save prefs ────────────────────────────────────────────────────────────
  const savePrefsInner = async (updates: Partial<NotificationPrefs>) => {
    if (!wallet) return;
    const updated = { ...(prefs ?? { wallet, ...DEFAULT_PREFS }), ...updates, wallet };
    if (!updated.events || updated.events.length === 0) updated.events = ["*"];
    setPrefs(updated);
    const response = await fetch(`${NOTIFICATIONS_URL}/prefs`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(updated),
    });
    if (!response.ok) throw new Error(`Notification preference save failed (${response.status})`);
  };

  const savePrefs = useCallback(savePrefsInner, [wallet, prefs]); // eslint-disable-line react-hooks/exhaustive-deps

  return { prefs, isLoading, pushSupported, enable, disable, savePrefs };
}

// ── Utility: base64url → Uint8Array for applicationServerKey ─────────────────
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = atob(base64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}
