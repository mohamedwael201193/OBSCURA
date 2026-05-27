/**
 * notifications.ts — Web Push (VAPID) + email (Resend) notification service
 *
 * Routes:
 *   POST   /subscribe       — save a Web Push subscription for a wallet
 *   DELETE /subscribe       — remove a subscription
 *   POST   /prefs           — save notification preferences for a wallet
 *   GET    /prefs/:wallet   — get notification preferences
 *   GET    /vapid-public-key — public key for frontend subscription
 *
 * Background:
 *   Listens to Supabase Realtime `obscura_activity` INSERT events
 *   and dispatches push + email notifications per user preferences.
 */
import { Router, Request, Response } from "express";
import { createHash } from "crypto";
import webpush from "web-push";
import { Resend } from "resend";
import { db } from "./db";

// ─── Config ───────────────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY    = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY   = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL ?? "noreply@obscura.finance";
const RESEND_API_KEY      = process.env.RESEND_API_KEY ?? "";
const FRONTEND_URL        = (process.env.FRONTEND_URL ?? "https://obscura-os-nine.vercel.app").replace(/\/$/, "");
const DEBUG_PUSH_LIMIT    = 25;
const DEBUG_WINDOW_MS     = 60_000;
const DEBUG_MAX_PER_IP    = 5;

if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("[notifications] VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY required");
  process.exit(1);
}

webpush.setVapidDetails(`mailto:${VAPID_CONTACT_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

// ─── Types ────────────────────────────────────────────────────────────────────
export interface NotificationPrefs {
  wallet:        string;
  push_enabled:  boolean;
  email_enabled: boolean;
  email?:        string;
  events:        string[];
}

interface PushSubscriptionRow {
  wallet: string;
  subscription: webpush.PushSubscription;
  updated_at?: string;
}

interface DispatchSummary {
  source: string;
  eventName: string;
  activityId: string;
  queued: number;
  skippedNoPrefs: number;
  skippedEventPrefs: number;
  skippedNoSubscription: number;
  pushSent: number;
  pushFailed: number;
  staleRemoved: number;
  emailSent: number;
  emailFailed: number;
  errors: string[];
}

const debugIpWindows = new Map<string, { count: number; resetAt: number }>();

function normalizeWallet(wallet: unknown): string | null {
  return typeof wallet === "string" && /^0x[0-9a-fA-F]{40}$/.test(wallet)
    ? wallet.toLowerCase()
    : null;
}

function shortWallet(wallet: string): string {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function shortTx(txHash: unknown): string {
  return typeof txHash === "string" && txHash.length > 12 ? `${txHash.slice(0, 12)}...` : String(txHash ?? "unknown");
}

function endpointHash(sub: webpush.PushSubscription): string {
  return createHash("sha256").update(sub.endpoint).digest("hex").slice(0, 12);
}

function candidateWallets(activity: Record<string, unknown>): string[] {
  const wallets = new Set<string>();
  const participants = Array.isArray(activity.participants) ? activity.participants : [];

  for (const participant of participants) {
    const wallet = normalizeWallet(participant);
    if (wallet) wallets.add(wallet);
  }

  const primaryWallet = normalizeWallet(activity.wallet);
  if (primaryWallet) wallets.add(primaryWallet);

  return [...wallets];
}

function getEventName(activity: Record<string, unknown>): string {
  return typeof activity.event_name === "string" ? activity.event_name : "ObscuraPay.Activity";
}

function getActivityId(activity: Record<string, unknown>): string {
  return String(activity.id ?? `${activity.tx_hash ?? "unknown"}:${activity.log_index ?? "0"}`);
}

function buildActivityPayload(activity: Record<string, unknown>, wallet: string): string {
  const eventName = getEventName(activity);
  const eventLabel = eventName.split(".").pop() ?? "Activity";
  const txHash = typeof activity.tx_hash === "string" ? activity.tx_hash : undefined;
  const url = eventName.startsWith("Credit")
    ? `${FRONTEND_URL}/credit`
    : `${FRONTEND_URL}/pay?tab=activity`;
  const sentAt = new Date().toISOString();

  return JSON.stringify({
    title: `Obscura - ${eventLabel}`,
    body: `Activity detected for ${shortWallet(wallet)}.`,
    tag: txHash ? `obscura-${txHash.slice(2, 14)}-${activity.log_index ?? 0}` : `obscura-${Date.now()}`,
    url,
    renotify: true,
    silent: false,
    sentAt,
    data: {
      url,
      eventName,
      txHash,
      activityId: activity.id,
      wallet,
      sentAt,
    },
  });
}

function buildDebugPayload(wallet: string): string {
  const url = `${FRONTEND_URL}/pay?tab=settings&sub=notifications`;
  const sentAt = new Date().toISOString();
  return JSON.stringify({
    title: "Obscura Push Test",
    body: `Test notification for ${shortWallet(wallet)}.`,
    tag: `obscura-debug-${wallet.slice(2, 10)}-${Date.now()}`,
    url,
    requireInteraction: true,
    renotify: true,
    silent: false,
    sentAt,
    data: {
      url,
      eventName: "debug.push-test",
      wallet,
      debug: true,
      sentAt,
    },
  });
}

function debugRateCheck(ip: string): boolean {
  const now = Date.now();
  let rec = debugIpWindows.get(ip);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + DEBUG_WINDOW_MS };
    debugIpWindows.set(ip, rec);
  }
  rec.count++;
  return rec.count <= DEBUG_MAX_PER_IP;
}

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function saveSubscription(wallet: string, sub: webpush.PushSubscription): Promise<void> {
  const normalizedWallet = wallet.toLowerCase();
  const { error } = await db.from("obscura_push_subscriptions").upsert(
    { wallet: wallet.toLowerCase(), subscription: sub, updated_at: new Date().toISOString() },
    { onConflict: "wallet" }
  );

  if (error) throw error;
  console.log(`[notifications] subscription saved wallet=${shortWallet(normalizedWallet)} endpoint=${endpointHash(sub)}`);
}

async function removeSubscription(wallet: string): Promise<void> {
  const normalizedWallet = wallet.toLowerCase();
  const { error } = await db.from("obscura_push_subscriptions").delete().eq("wallet", normalizedWallet);
  if (error) throw error;
  console.log(`[notifications] subscription removed wallet=${shortWallet(normalizedWallet)}`);
}

async function getSubscription(wallet: string): Promise<webpush.PushSubscription | null> {
  const { data, error } = await db
    .from("obscura_push_subscriptions")
    .select("subscription")
    .eq("wallet", wallet.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return (data?.subscription as webpush.PushSubscription) ?? null;
}

async function getSubscriptions(limit = DEBUG_PUSH_LIMIT): Promise<PushSubscriptionRow[]> {
  const { data, error } = await db
    .from("obscura_push_subscriptions")
    .select("wallet, subscription, updated_at")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PushSubscriptionRow[];
}

async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  const normalizedWallet = prefs.wallet.toLowerCase();
  const events = Array.isArray(prefs.events) && prefs.events.length > 0 ? prefs.events : ["*"];
  const { error } = await db.from("obscura_notification_prefs").upsert(
    { ...prefs, wallet: normalizedWallet, events, updated_at: new Date().toISOString() },
    { onConflict: "wallet" }
  );

  if (error) throw error;
  console.log(`[notifications] prefs saved wallet=${shortWallet(normalizedWallet)} push=${!!prefs.push_enabled} email=${!!prefs.email_enabled} events=${events.join(",")}`);
}

async function getPrefs(wallet: string): Promise<NotificationPrefs | null> {
  const { data, error } = await db
    .from("obscura_notification_prefs")
    .select("*")
    .eq("wallet", wallet.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data as NotificationPrefs | null;
}

async function sendPush(
  wallet: string,
  sub: webpush.PushSubscription,
  payload: string,
  summary: Pick<DispatchSummary, "pushSent" | "pushFailed" | "staleRemoved" | "errors">,
  source: string,
): Promise<void> {
  try {
    await webpush.sendNotification(sub, payload);
    summary.pushSent++;
    console.log(`[notifications] notification sent source=${source} wallet=${shortWallet(wallet)} endpoint=${endpointHash(sub)}`);
  } catch (e) {
    const err = e as { statusCode?: number; body?: string; message?: string };
    const status = err.statusCode ?? "unknown";
    const body = err.body ? ` body=${err.body.slice(0, 220)}` : "";
    summary.pushFailed++;
    summary.errors.push(`${wallet}: push ${status} ${err.message ?? "send failed"}`);
    console.error(`[notifications] notification failed source=${source} wallet=${shortWallet(wallet)} endpoint=${endpointHash(sub)} status=${status} error=${err.message ?? "send failed"}${body}`);

    if (err.statusCode === 404 || err.statusCode === 410) {
      await removeSubscription(wallet);
      summary.staleRemoved++;
      console.warn(`[notifications] stale subscription removed wallet=${shortWallet(wallet)} status=${err.statusCode}`);
    }
  }
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export async function dispatchNotification(activity: Record<string, unknown>, source = "realtime"): Promise<DispatchSummary> {
  const wallets = candidateWallets(activity);
  const eventName = getEventName(activity);
  const activityId = getActivityId(activity);
  const summary: DispatchSummary = {
    source,
    eventName,
    activityId,
    queued: wallets.length,
    skippedNoPrefs: 0,
    skippedEventPrefs: 0,
    skippedNoSubscription: 0,
    pushSent: 0,
    pushFailed: 0,
    staleRemoved: 0,
    emailSent: 0,
    emailFailed: 0,
    errors: [],
  };

  console.log(`[notifications] notification queued source=${source} activity=${activityId} event=${eventName} tx=${shortTx(activity.tx_hash)} wallets=${wallets.length}`);

  if (wallets.length === 0) {
    console.warn(`[notifications] no candidate wallets source=${source} activity=${activityId} event=${eventName}`);
    return summary;
  }

  for (const wallet of wallets) {
    try {
      const prefs = await getPrefs(wallet);
      if (!prefs) {
        summary.skippedNoPrefs++;
        console.log(`[notifications] skipped no prefs source=${source} wallet=${shortWallet(wallet)} event=${eventName}`);
        continue;
      }

      const events = Array.isArray(prefs.events) && prefs.events.length > 0 ? prefs.events : ["*"];
      if (!events.includes(eventName) && !events.includes("*")) {
        summary.skippedEventPrefs++;
        console.log(`[notifications] skipped event prefs source=${source} wallet=${shortWallet(wallet)} event=${eventName} allowed=${events.join(",")}`);
        continue;
      }

      const payload = buildActivityPayload(activity, wallet);

      if (prefs.push_enabled) {
        const sub = await getSubscription(wallet);
        if (!sub) {
          summary.skippedNoSubscription++;
          console.log(`[notifications] skipped no subscription source=${source} wallet=${shortWallet(wallet)} event=${eventName}`);
        } else {
          await sendPush(wallet, sub, payload, summary, source);
        }
      }

      if (prefs.email_enabled && prefs.email && resend) {
        try {
          const title = `Obscura - ${eventName.split(".").pop() ?? "Activity"}`;
          const body = `Activity detected for wallet ${shortWallet(wallet)}.`;
          await resend.emails.send({
            from:    `Obscura Finance <${VAPID_CONTACT_EMAIL}>`,
            to:      [prefs.email],
            subject: title,
            text:    `${body}\n\nTransaction: ${activity.tx_hash ?? "(unknown)"}`,
          });
          summary.emailSent++;
          console.log(`[notifications] email sent source=${source} wallet=${shortWallet(wallet)} event=${eventName}`);
        } catch (e) {
          summary.emailFailed++;
          summary.errors.push(`${wallet}: email ${(e as Error).message}`);
          console.error(`[notifications] email failed source=${source} wallet=${shortWallet(wallet)} event=${eventName} error=${(e as Error).message}`);
        }
      }
    } catch (e) {
      summary.errors.push(`${wallet}: ${(e as Error).message}`);
      console.error(`[notifications] dispatch wallet error source=${source} wallet=${shortWallet(wallet)} event=${eventName} error=${(e as Error).message}`);
    }
  }

  console.log(`[notifications] dispatch complete source=${source} activity=${activityId} event=${eventName} sent=${summary.pushSent} failed=${summary.pushFailed} noPrefs=${summary.skippedNoPrefs} noSub=${summary.skippedNoSubscription}`);
  return summary;
}

async function sendDebugPush(wallet?: string): Promise<{
  ok: boolean;
  attempted: number;
  sent: number;
  failed: number;
  staleRemoved: number;
  targets: string[];
  errors: string[];
}> {
  const rows = wallet
    ? await (async () => {
        const sub = await getSubscription(wallet);
        return sub ? [{ wallet, subscription: sub }] : [];
      })()
    : await getSubscriptions(DEBUG_PUSH_LIMIT);

  const summary = { pushSent: 0, pushFailed: 0, staleRemoved: 0, errors: [] as string[] };
  const targets = rows.map((row) => row.wallet.toLowerCase());
  console.log(`[notifications] notification queued source=debug-push-test wallets=${targets.length}`);

  for (const row of rows) {
    const targetWallet = row.wallet.toLowerCase();
    await sendPush(targetWallet, row.subscription, buildDebugPayload(targetWallet), summary, "debug-push-test");
  }

  return {
    ok: summary.pushFailed === 0,
    attempted: rows.length,
    sent: summary.pushSent,
    failed: summary.pushFailed,
    staleRemoved: summary.staleRemoved,
    targets: targets.map(shortWallet),
    errors: summary.errors,
  };
}

// ─── Realtime listener ────────────────────────────────────────────────────────
export function startNotificationListener(): void {
  db.channel("obscura_activity_notifications")
    .on(
      "postgres_changes" as never,
      { event: "INSERT", schema: "public", table: "obscura_activity" } as never,
      (payload: { new: Record<string, unknown> }) => {
        console.log(`[notifications] activity insert received source=realtime activity=${getActivityId(payload.new)} event=${getEventName(payload.new)} tx=${shortTx(payload.new.tx_hash)}`);
        dispatchNotification(payload.new, "realtime").catch((e) =>
          console.error("[notifications] dispatch error:", (e as Error).message)
        );
      }
    )
    .subscribe((status: string) => {
      console.log(`[notifications] Realtime channel: ${status}`);
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED") {
        console.error(`[notifications] Realtime channel unhealthy: ${status}`);
      }
    });
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const notificationsRouter = Router();

notificationsRouter.get("/vapid-public-key", (_req: Request, res: Response) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

notificationsRouter.post("/subscribe", async (req: Request, res: Response) => {
  try {
    const { wallet, subscription } = req.body as { wallet?: string; subscription?: webpush.PushSubscription };
    if (!wallet || !subscription?.endpoint) {
      res.status(400).json({ error: "wallet and subscription.endpoint are required" });
      return;
    }
    await saveSubscription(wallet, subscription);
    res.json({ ok: true });
  } catch (e) {
    console.error(`[notifications] subscribe failed: ${(e as Error).message}`);
    res.status(500).json({ error: "Failed to save subscription" });
  }
});

notificationsRouter.delete("/subscribe", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.body as { wallet?: string };
    if (!wallet) { res.status(400).json({ error: "wallet is required" }); return; }
    await removeSubscription(wallet);
    res.json({ ok: true });
  } catch (e) {
    console.error(`[notifications] unsubscribe failed: ${(e as Error).message}`);
    res.status(500).json({ error: "Failed to remove subscription" });
  }
});

notificationsRouter.post("/prefs", async (req: Request, res: Response) => {
  try {
    const prefs = req.body as Partial<NotificationPrefs>;
    if (!prefs.wallet) { res.status(400).json({ error: "wallet is required" }); return; }
    await savePrefs({
      wallet: prefs.wallet,
      push_enabled: !!prefs.push_enabled,
      email_enabled: !!prefs.email_enabled,
      email: prefs.email,
      events: Array.isArray(prefs.events) && prefs.events.length > 0 ? prefs.events : ["*"],
    });
    res.json({ ok: true });
  } catch (e) {
    console.error(`[notifications] prefs save failed: ${(e as Error).message}`);
    res.status(500).json({ error: "Failed to save preferences" });
  }
});

notificationsRouter.get("/prefs/:wallet", async (req: Request, res: Response) => {
  try {
    const p = await getPrefs(req.params.wallet);
    if (!p) { res.status(404).json({ error: "Not found" }); return; }
    res.json(p);
  } catch (e) {
    console.error(`[notifications] prefs load failed: ${(e as Error).message}`);
    res.status(500).json({ error: "Failed to load preferences" });
  }
});

async function handleDebugPushTest(req: Request, res: Response): Promise<void> {
  const ip = req.ip ?? "unknown";
  if (!debugRateCheck(ip)) {
    res.status(429).json({ error: "Debug push rate limit exceeded" });
    return;
  }

  try {
    const body = (req.body ?? {}) as { wallet?: string };
    const queryWallet = typeof req.query.wallet === "string" ? req.query.wallet : undefined;
    const normalizedWallet = normalizeWallet(body.wallet ?? queryWallet ?? null) ?? undefined;
    const result = await sendDebugPush(normalizedWallet);
    res.status(result.ok ? 200 : 207).json(result);
  } catch (e) {
    console.error(`[notifications] debug push failed: ${(e as Error).message}`);
    res.status(500).json({ error: "Debug push failed", detail: (e as Error).message });
  }
}

notificationsRouter.get("/debug/push-test", handleDebugPushTest);
notificationsRouter.post("/debug/push-test", handleDebugPushTest);
