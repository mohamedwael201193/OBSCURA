/**
 * notifications.ts - worker-side Web Push dispatcher.
 *
 * The API still owns browser subscription registration. The worker sends push
 * notifications immediately after a new activity row is inserted so delivery
 * does not depend on the API's Supabase Realtime listener staying awake.
 */
import { createHash } from "crypto";
import webpush from "web-push";
import { db, type StoredActivityRecord } from "./db";

const VAPID_PUBLIC_KEY    = process.env.VAPID_PUBLIC_KEY ?? "";
const VAPID_PRIVATE_KEY   = process.env.VAPID_PRIVATE_KEY ?? "";
const VAPID_CONTACT_EMAIL = process.env.VAPID_CONTACT_EMAIL ?? "noreply@obscura.finance";
const FRONTEND_URL        = (process.env.FRONTEND_URL ?? "https://obscura-os-nine.vercel.app").replace(/\/$/, "");

const pushEnabled = Boolean(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY);

if (pushEnabled) {
  webpush.setVapidDetails(`mailto:${VAPID_CONTACT_EMAIL}`, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log(`[notifications] worker push dispatch enabled contact=${VAPID_CONTACT_EMAIL}`);
} else {
  console.warn("[notifications] VAPID_PUBLIC_KEY + VAPID_PRIVATE_KEY missing; worker push dispatch disabled");
}

interface NotificationPrefs {
  wallet: string;
  push_enabled: boolean;
  email_enabled: boolean;
  email?: string | null;
  events: string[];
}

interface DispatchSummary {
  queued: number;
  sent: number;
  failed: number;
  skippedNoPrefs: number;
  skippedEventPrefs: number;
  skippedNoSubscription: number;
  staleRemoved: number;
}

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

function activityUrl(eventName: string): string {
  if (eventName.startsWith("Credit")) return `${FRONTEND_URL}/credit`;
  if (
    eventName.startsWith("ObscuraVote.")
    || eventName.startsWith("ObscuraGovernor.")
    || eventName.startsWith("ObscuraTreasury.")
    || eventName.startsWith("ObscuraRewards.")
  ) return `${FRONTEND_URL}/vote`;
  return `${FRONTEND_URL}/pay?tab=activity`;
}

function candidateWallets(activity: StoredActivityRecord): string[] {
  const wallets = new Set<string>();
  for (const participant of activity.participants ?? []) {
    const wallet = normalizeWallet(participant);
    if (wallet) wallets.add(wallet);
  }

  const primaryWallet = normalizeWallet(activity.wallet);
  if (primaryWallet) wallets.add(primaryWallet);

  return [...wallets];
}

function buildPayload(activity: StoredActivityRecord, wallet: string): string {
  const eventLabel = activity.event_name.split(".").pop() ?? "Activity";
  const url = activityUrl(activity.event_name);
  const sentAt = new Date().toISOString();

  return JSON.stringify({
    title: `Obscura - ${eventLabel}`,
    body: `Activity detected for ${shortWallet(wallet)}.`,
    tag: `obscura-${activity.tx_hash.slice(2, 14)}-${activity.log_index}`,
    url,
    renotify: true,
    silent: false,
    sentAt,
    data: {
      url,
      eventName: activity.event_name,
      txHash: activity.tx_hash,
      activityId: activity.id,
      wallet,
      sentAt,
    },
  });
}

function notificationAliases(eventName: string): string[] {
  const suffix = eventName.split(".").pop() ?? "";

  if (eventName.startsWith("ObscuraVote.")) {
    const aliases = ["vote.*"];
    switch (suffix) {
      case "ProposalCreated":
        aliases.push("vote.proposal_created");
        break;
      case "VoteCast":
        aliases.push("vote.cast");
        break;
      case "VoteChanged":
        aliases.push("vote.changed");
        break;
      case "VoteFinalized":
        aliases.push("vote.finalized");
        break;
      case "ProposalCancelled":
        aliases.push("vote.cancelled");
        break;
      case "DeadlineExtended":
        aliases.push("vote.deadline_extended");
        break;
      case "DelegateSet":
        aliases.push("vote.delegated");
        break;
      case "DelegateRemoved":
        aliases.push("vote.undelegated");
        break;
      default:
        break;
    }
    return aliases;
  }

  if (eventName.startsWith("ObscuraGovernor.")) {
    const aliases = ["vote.*", "governor.*"];
    switch (suffix) {
      case "ProposalCreated":
        aliases.push("governor.proposal_created");
        break;
      case "VoteCast":
        aliases.push("governor.vote_cast");
        break;
      case "ProposalQueued":
        aliases.push("governor.queued");
        break;
      case "ProposalExecuted":
        aliases.push("governor.executed");
        break;
      case "ProposalCanceled":
        aliases.push("governor.cancelled");
        break;
      default:
        break;
    }
    return aliases;
  }

  if (eventName.startsWith("ObscuraTreasury.")) {
    const aliases = ["vote.*", "treasury.*"];
    switch (suffix) {
      case "SpendAttached":
        aliases.push("treasury.spend_attached");
        break;
      case "FinalizationRecorded":
        aliases.push("treasury.timelock_started");
        break;
      case "SpendExecuted":
        aliases.push("treasury.spend_executed");
        break;
      case "FundsReceived":
        aliases.push("treasury.funded");
        break;
      default:
        break;
    }
    return aliases;
  }

  if (eventName.startsWith("ObscuraRewards.")) {
    const aliases = ["vote.*", "rewards.*"];
    switch (suffix) {
      case "RewardAccrued":
        aliases.push("rewards.accrued");
        break;
      case "WithdrawalRequested":
        aliases.push("rewards.withdrawal_requested");
        break;
      case "RewardWithdrawn":
        aliases.push("rewards.withdrawn");
        break;
      case "RewardsFunded":
        aliases.push("rewards.funded");
        break;
      default:
        break;
    }
    return aliases;
  }

  if (!eventName.startsWith("Credit")) return [];
  const aliases = ["credit.*"];

  switch (suffix) {
    case "Supplied":
      aliases.push("credit.supplied");
      break;
    case "Withdrew":
      aliases.push(eventName.startsWith("CreditVault") ? "credit.vault_withdrew" : "credit.withdrew");
      break;
    case "CollateralSupplied":
      aliases.push("credit.collateral_supplied");
      break;
    case "CollateralWithdrawn":
      aliases.push("credit.collateral_withdrawn");
      break;
    case "Borrowed":
      aliases.push("credit.borrowed");
      break;
    case "Repaid":
      aliases.push("credit.repaid");
      break;
    case "LiquidationOpened":
    case "AuctionOpened":
      aliases.push("credit.liquidation_opened", "credit.health_warning");
      break;
    case "BidSubmitted":
      aliases.push("credit.auction_bid");
      break;
    case "AuctionSettled":
      aliases.push("credit.auction_settled");
      break;
    case "Deposited":
      aliases.push("credit.vault_deposited");
      break;
    case "ScoreUpdated":
      aliases.push("credit.score_tier_changed");
      break;
    default:
      break;
  }

  return aliases;
}

function eventAllowed(events: string[], eventName: string): boolean {
  return events.includes("*") || events.includes(eventName) || notificationAliases(eventName).some((alias) => events.includes(alias));
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

async function getSubscription(wallet: string): Promise<webpush.PushSubscription | null> {
  const { data, error } = await db
    .from("obscura_push_subscriptions")
    .select("subscription")
    .eq("wallet", wallet.toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return (data?.subscription as webpush.PushSubscription) ?? null;
}

async function removeSubscription(wallet: string): Promise<void> {
  const { error } = await db
    .from("obscura_push_subscriptions")
    .delete()
    .eq("wallet", wallet.toLowerCase());

  if (error) throw error;
  console.warn(`[notifications] stale subscription removed wallet=${shortWallet(wallet)}`);
}

export async function dispatchActivityNotification(activity: StoredActivityRecord): Promise<DispatchSummary> {
  const wallets = candidateWallets(activity);
  const summary: DispatchSummary = {
    queued: wallets.length,
    sent: 0,
    failed: 0,
    skippedNoPrefs: 0,
    skippedEventPrefs: 0,
    skippedNoSubscription: 0,
    staleRemoved: 0,
  };

  console.log(`[notifications] notification queued source=worker-indexer activity=${activity.id} event=${activity.event_name} tx=${shortTx(activity.tx_hash)} wallets=${wallets.length}`);

  if (!pushEnabled) {
    console.error(`[notifications] notification failed source=worker-indexer activity=${activity.id} event=${activity.event_name} reason=vapid-not-configured`);
    summary.failed += wallets.length;
    return summary;
  }

  for (const wallet of wallets) {
    try {
      const prefs = await getPrefs(wallet);
      if (!prefs) {
        summary.skippedNoPrefs++;
        console.log(`[notifications] skipped no prefs source=worker-indexer wallet=${shortWallet(wallet)} event=${activity.event_name}`);
        continue;
      }

      const events = Array.isArray(prefs.events) && prefs.events.length > 0 ? prefs.events : ["*"];
      if (!eventAllowed(events, activity.event_name)) {
        summary.skippedEventPrefs++;
        console.log(`[notifications] skipped event prefs source=worker-indexer wallet=${shortWallet(wallet)} event=${activity.event_name} allowed=${events.join(",")}`);
        continue;
      }

      if (!prefs.push_enabled) continue;

      const sub = await getSubscription(wallet);
      if (!sub) {
        summary.skippedNoSubscription++;
        console.log(`[notifications] skipped no subscription source=worker-indexer wallet=${shortWallet(wallet)} event=${activity.event_name}`);
        continue;
      }

      try {
        await webpush.sendNotification(sub, buildPayload(activity, wallet));
        summary.sent++;
        console.log(`[notifications] notification sent source=worker-indexer wallet=${shortWallet(wallet)} endpoint=${endpointHash(sub)} event=${activity.event_name}`);
      } catch (e) {
        const err = e as { statusCode?: number; body?: string; message?: string };
        const status = err.statusCode ?? "unknown";
        const body = err.body ? ` body=${err.body.slice(0, 220)}` : "";
        summary.failed++;
        console.error(`[notifications] notification failed source=worker-indexer wallet=${shortWallet(wallet)} endpoint=${endpointHash(sub)} event=${activity.event_name} status=${status} error=${err.message ?? "send failed"}${body}`);

        if (err.statusCode === 404 || err.statusCode === 410) {
          await removeSubscription(wallet);
          summary.staleRemoved++;
        }
      }
    } catch (e) {
      summary.failed++;
      console.error(`[notifications] notification failed source=worker-indexer wallet=${shortWallet(wallet)} event=${activity.event_name} error=${(e as Error).message}`);
    }
  }

  console.log(`[notifications] dispatch complete source=worker-indexer activity=${activity.id} event=${activity.event_name} sent=${summary.sent} failed=${summary.failed} noPrefs=${summary.skippedNoPrefs} noSub=${summary.skippedNoSubscription}`);
  return summary;
}