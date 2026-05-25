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
import webpush from "web-push";
import { Resend } from "resend";
import { db } from "./db";

// ─── Config ───────────────────────────────────────────────────────────────────
const VAPID_PUBLIC_KEY    = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY   = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL ?? "noreply@obscura.finance";
const RESEND_API_KEY      = process.env.RESEND_API_KEY ?? "";

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

// ─── DB helpers ───────────────────────────────────────────────────────────────
async function saveSubscription(wallet: string, sub: webpush.PushSubscription): Promise<void> {
  await db.from("obscura_push_subscriptions").upsert(
    { wallet: wallet.toLowerCase(), subscription: sub, updated_at: new Date().toISOString() },
    { onConflict: "wallet" }
  );
}

async function removeSubscription(wallet: string): Promise<void> {
  await db.from("obscura_push_subscriptions").delete().eq("wallet", wallet.toLowerCase());
}

async function getSubscription(wallet: string): Promise<webpush.PushSubscription | null> {
  const { data } = await db
    .from("obscura_push_subscriptions")
    .select("subscription")
    .eq("wallet", wallet.toLowerCase())
    .single();
  return (data?.subscription as webpush.PushSubscription) ?? null;
}

async function savePrefs(prefs: NotificationPrefs): Promise<void> {
  await db.from("obscura_notification_prefs").upsert(
    { ...prefs, wallet: prefs.wallet.toLowerCase(), updated_at: new Date().toISOString() },
    { onConflict: "wallet" }
  );
}

async function getPrefs(wallet: string): Promise<NotificationPrefs | null> {
  const { data } = await db
    .from("obscura_notification_prefs")
    .select("*")
    .eq("wallet", wallet.toLowerCase())
    .single();
  return data as NotificationPrefs | null;
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
async function dispatchNotification(activity: Record<string, unknown>): Promise<void> {
  const wallets = (activity.participants as string[]) ?? [activity.wallet as string];

  for (const wallet of wallets) {
    const prefs = await getPrefs(wallet);
    if (!prefs) continue;

    const eventName = activity.event_name as string;
    if (!prefs.events.includes(eventName) && !prefs.events.includes("*")) continue;

    const title   = `Obscura — ${eventName.split(".").pop()}`;
    const body    = `Activity detected on your wallet ${wallet.slice(0, 6)}…`;
    const payload = JSON.stringify({ title, body, data: { eventName, txHash: activity.tx_hash } });

    if (prefs.push_enabled) {
      const sub = await getSubscription(wallet);
      if (sub) {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (e) {
          if ((e as { statusCode?: number }).statusCode === 410) {
            await removeSubscription(wallet);
          }
        }
      }
    }

    if (prefs.email_enabled && prefs.email && resend) {
      await resend.emails.send({
        from:    `Obscura Finance <${VAPID_CONTACT_EMAIL}>`,
        to:      [prefs.email],
        subject: title,
        text:    `${body}\n\nTransaction: ${activity.tx_hash ?? "(unknown)"}`,
      });
    }
  }
}

// ─── Realtime listener ────────────────────────────────────────────────────────
export function startNotificationListener(): void {
  db.channel("obscura_activity_notifications")
    .on(
      "postgres_changes" as never,
      { event: "INSERT", schema: "public", table: "obscura_activity" } as never,
      (payload: { new: Record<string, unknown> }) => {
        dispatchNotification(payload.new).catch((e) =>
          console.error("[notifications] dispatch error:", (e as Error).message)
        );
      }
    )
    .subscribe((status: string) => {
      console.log(`[notifications] Realtime channel: ${status}`);
    });
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const notificationsRouter = Router();

notificationsRouter.get("/vapid-public-key", (_req: Request, res: Response) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

notificationsRouter.post("/subscribe", async (req: Request, res: Response) => {
  const { wallet, subscription } = req.body as { wallet?: string; subscription?: webpush.PushSubscription };
  if (!wallet || !subscription?.endpoint) {
    res.status(400).json({ error: "wallet and subscription.endpoint are required" });
    return;
  }
  await saveSubscription(wallet, subscription);
  res.json({ ok: true });
});

notificationsRouter.delete("/subscribe", async (req: Request, res: Response) => {
  const { wallet } = req.body as { wallet?: string };
  if (!wallet) { res.status(400).json({ error: "wallet is required" }); return; }
  await removeSubscription(wallet);
  res.json({ ok: true });
});

notificationsRouter.post("/prefs", async (req: Request, res: Response) => {
  const prefs = req.body as Partial<NotificationPrefs>;
  if (!prefs.wallet) { res.status(400).json({ error: "wallet is required" }); return; }
  await savePrefs(prefs as NotificationPrefs);
  res.json({ ok: true });
});

notificationsRouter.get("/prefs/:wallet", async (req: Request, res: Response) => {
  const p = await getPrefs(req.params.wallet);
  if (!p) { res.status(404).json({ error: "Not found" }); return; }
  res.json(p);
});
