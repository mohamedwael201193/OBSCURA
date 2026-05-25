/**
 * index.ts — Obscura Pay Notification Service
 *
 * Listens to Supabase Realtime for new activity records,
 * then dispatches Web Push (VAPID) and/or email (Resend) based on user preferences.
 *
 * Endpoints:
 *   POST /subscribe     — save a Web Push subscription for a wallet
 *   DELETE /subscribe   — remove a subscription
 *   POST /prefs         — save notification preferences for a wallet
 *   GET  /prefs/:wallet — get notification preferences
 */

import express, { Request, Response } from "express";
import cors from "cors";
import webpush from "web-push";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

// ─── Config ───────────────────────────────────────────────────────────────────
const PORT                   = parseInt(process.env.PORT ?? "3702");
const SUPABASE_URL           = process.env.SUPABASE_URL ?? "";
const SUPABASE_SERVICE_KEY   = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const VAPID_PUBLIC_KEY       = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY      = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_CONTACT_EMAIL    = process.env.VAPID_CONTACT_EMAIL ?? "noreply@obscura.finance";
const RESEND_API_KEY         = process.env.RESEND_API_KEY ?? "";
const ALLOWED_ORIGINS        = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",");

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("[notifications] SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY required");
  process.exit(1);
}
if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
  console.error("[notifications] VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY required. Run: npm run generate-vapid");
  process.exit(1);
}

// ─── Clients ──────────────────────────────────────────────────────────────────
webpush.setVapidDetails(`mailto:${VAPID_CONTACT_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

const db = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, { auth: { persistSession: false } });

// ─── Notification preference types ────────────────────────────────────────────
export interface NotificationPrefs {
  wallet: string;
  push_enabled: boolean;
  email_enabled: boolean;
  email?: string;
  events: string[];  // e.g. ["ObscuraPay.PaymentSent", "ObscuraInvoice.InvoicePaid"]
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
  return data?.subscription ?? null;
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

    // Web Push
    if (prefs.push_enabled) {
      const sub = await getSubscription(wallet);
      if (sub) {
        try {
          await webpush.sendNotification(sub, payload);
        } catch (e) {
          // Subscription expired — clean up
          if ((e as { statusCode?: number }).statusCode === 410) {
            await removeSubscription(wallet);
          }
        }
      }
    }

    // Email
    if (prefs.email_enabled && prefs.email && resend) {
      await resend.emails.send({
        from: `Obscura Finance <${VAPID_CONTACT_EMAIL}>`,
        to:   [prefs.email],
        subject: title,
        text: `${body}\n\nTransaction: ${activity.tx_hash ?? "(unknown)"}`,
      });
    }
  }
}

// ─── Realtime listener ────────────────────────────────────────────────────────
function startRealtimeListener(): void {
  db.channel("obscura_activity_feed")
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
      console.log(`[notifications] Realtime channel status: ${status}`);
    });
}

// ─── HTTP API ─────────────────────────────────────────────────────────────────
const app = express();
app.use(cors({ origin: ALLOWED_ORIGINS }));
app.use(express.json({ limit: 8192 }));

// Health check (required by Render)
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", service: "obscura-pay-notifications" });
});

// VAPID public key (needed by the frontend to subscribe)
app.get("/vapid-public-key", (_req: Request, res: Response) => {
  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// Save a Web Push subscription
app.post("/subscribe", async (req: Request, res: Response) => {
  const { wallet, subscription } = req.body as { wallet?: string; subscription?: webpush.PushSubscription };
  if (!wallet || !subscription?.endpoint) {
    res.status(400).json({ error: "wallet and subscription.endpoint are required" });
    return;
  }
  await saveSubscription(wallet, subscription);
  res.json({ ok: true });
});

// Remove a Web Push subscription
app.delete("/subscribe", async (req: Request, res: Response) => {
  const { wallet } = req.body as { wallet?: string };
  if (!wallet) { res.status(400).json({ error: "wallet is required" }); return; }
  await removeSubscription(wallet);
  res.json({ ok: true });
});

// Save notification preferences
app.post("/prefs", async (req: Request, res: Response) => {
  const prefs = req.body as Partial<NotificationPrefs>;
  if (!prefs.wallet) { res.status(400).json({ error: "wallet is required" }); return; }
  await savePrefs(prefs as NotificationPrefs);
  res.json({ ok: true });
});

// Get notification preferences
app.get("/prefs/:wallet", async (req: Request, res: Response) => {
  const p = await getPrefs(req.params.wallet);
  if (!p) { res.status(404).json({ error: "Not found" }); return; }
  res.json(p);
});

app.listen(PORT, () => {
  console.log(`[notifications] Obscura Notifications Service listening on :${PORT}`);
  startRealtimeListener();
});
