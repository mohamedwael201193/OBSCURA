/**
 * useCreditAlerts — local-only notification system for credit lifecycle events.
 *
 * Listens to severity transitions from useHealthEngine and surfaces a browser
 * Notification when the user has granted permission. All state is local to
 * the tab (no server). Snooze is persisted per-severity in localStorage.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { useHealthEngine, type HealthSeverity } from "./useHealthEngine";

export type AlertCategory = "liquidation" | "auction" | "faucet" | "interest" | "info";

export interface CreditAlert {
  id: string;
  category: AlertCategory;
  title: string;
  body: string;
  createdAt: number;
  read: boolean;
  severity?: HealthSeverity;
}

const STORAGE_KEY = "obscura:credit:alerts:v1";
const SNOOZE_KEY = "obscura:credit:snooze:v1";
const MAX_ALERTS = 50;

function load(): CreditAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CreditAlert[];
  } catch { return []; }
}
function persist(list: CreditAlert[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(list.slice(0, MAX_ALERTS))); } catch { /* */ }
}
function loadSnooze(): Record<string, number> {
  try { return JSON.parse(localStorage.getItem(SNOOZE_KEY) || "{}"); } catch { return {}; }
}
function persistSnooze(s: Record<string, number>) {
  try { localStorage.setItem(SNOOZE_KEY, JSON.stringify(s)); } catch { /* */ }
}

export function useCreditAlerts() {
  const [alerts, setAlerts] = useState<CreditAlert[]>(() => load());
  const [permission, setPermission] = useState<NotificationPermission>(
    () => (typeof Notification !== "undefined" ? Notification.permission : "default")
  );
  const lastSeverity = useRef<HealthSeverity | null>(null);
  const { aggregateSeverity, hasDebt } = useHealthEngine();

  const push = useCallback((a: Omit<CreditAlert, "id" | "createdAt" | "read">) => {
    setAlerts((prev) => {
      const next: CreditAlert[] = [
        { ...a, id: `${a.category}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, createdAt: Date.now(), read: false },
        ...prev,
      ].slice(0, MAX_ALERTS);
      persist(next);
      return next;
    });
    // Fire browser notification when allowed
    if (typeof Notification !== "undefined" && Notification.permission === "granted") {
      try { new Notification(`Obscura · ${a.title}`, { body: a.body, silent: false }); } catch { /* */ }
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (typeof Notification === "undefined") return "denied" as NotificationPermission;
    if (Notification.permission !== "default") {
      setPermission(Notification.permission);
      return Notification.permission;
    }
    const res = await Notification.requestPermission();
    setPermission(res);
    return res;
  }, []);

  const markAllRead = useCallback(() => {
    setAlerts((prev) => {
      const next = prev.map((a) => ({ ...a, read: true }));
      persist(next);
      return next;
    });
  }, []);

  const clear = useCallback(() => {
    setAlerts([]);
    persist([]);
  }, []);

  const snooze = useCallback((severity: HealthSeverity, hours = 1) => {
    const s = loadSnooze();
    s[severity] = Date.now() + hours * 3600_000;
    persistSnooze(s);
  }, []);

  // Severity-transition watcher
  useEffect(() => {
    if (!hasDebt) {
      lastSeverity.current = aggregateSeverity;
      return;
    }
    if (lastSeverity.current === null) {
      lastSeverity.current = aggregateSeverity;
      return;
    }
    if (aggregateSeverity === lastSeverity.current) return;

    const snoozeMap = loadSnooze();
    const snoozedUntil = snoozeMap[aggregateSeverity] ?? 0;
    if (Date.now() < snoozedUntil) {
      lastSeverity.current = aggregateSeverity;
      return;
    }

    if (aggregateSeverity === "warning" || aggregateSeverity === "critical") {
      push({
        category: "liquidation",
        title: aggregateSeverity === "critical" ? "Liquidation risk" : "Health declining",
        body: "A Credit position needs attention. Review risk before borrowing more.",
        severity: aggregateSeverity,
      });
    }
    lastSeverity.current = aggregateSeverity;
  }, [aggregateSeverity, hasDebt, push]);

  const unreadCount = alerts.filter((a) => !a.read).length;

  return { alerts, unreadCount, push, markAllRead, clear, snooze, permission, requestPermission };
}
