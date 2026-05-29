import { db, type StoredActivityRecord } from "./db";

const REPUTATION_EVENTS_ENABLED = (process.env.REPUTATION_EVENTS_ENABLED ?? "true").toLowerCase() !== "false";
const REPUTATION_BACKFILL_ON_START = (process.env.REPUTATION_BACKFILL_ON_START ?? "true").toLowerCase() !== "false";
const REPUTATION_BACKFILL_LIMIT = Math.max(
  1,
  Number.parseInt(process.env.REPUTATION_BACKFILL_LIMIT ?? "500", 10) || 500,
);

type PaySignalType =
  | "private_payment_sent"
  | "private_payment_received"
  | "stream_created"
  | "stream_cycle_settled"
  | "escrow_redeemed"
  | "invoice_paid"
  | "subscription_consumed";

type CreditSignalType =
  | "credit_liquidity_supplied"
  | "credit_liquidity_withdrawn"
  | "credit_collateral_supplied"
  | "credit_collateral_withdrawn"
  | "credit_borrowed"
  | "credit_repaid"
  | "credit_liquidation_opened"
  | "credit_auction_won"
  | "credit_vault_deposited"
  | "credit_vault_withdrew"
  | "credit_score_updated";

type VoteSignalType =
  | "vote_participated"
  | "vote_changed"
  | "vote_delegated"
  | "vote_delegation_removed"
  | "governance_vote_cast"
  | "governance_proposed"
  | "treasury_spend_attached"
  | "treasury_spend_executed"
  | "vote_reward_accrued"
  | "vote_reward_withdrawn";

type ReputationSourceApp = "pay" | "credit" | "vote";
type ReputationSignalType = PaySignalType | CreditSignalType | VoteSignalType;

interface ReputationEventRecord {
  wallet: string;
  source_app: ReputationSourceApp;
  signal_type: ReputationSignalType;
  signal_weight: number;
  event_ref: number;
  public_context: {
    source_event: string;
    relation: string;
    contract_address: string;
    chain_id: number;
  };
}

interface ReputationHealthSnapshot {
  enabled: boolean;
  backfillOnStart: boolean;
  backfillLimit: number;
  lastSignalAt: string | null;
  lastBackfillAt: string | null;
  lastBackfillChecked: number;
  lastBackfillInserted: number;
  lastErrorAt: string | null;
  lastError: string | null;
}

const reputationHealth: ReputationHealthSnapshot = {
  enabled: REPUTATION_EVENTS_ENABLED,
  backfillOnStart: REPUTATION_BACKFILL_ON_START,
  backfillLimit: REPUTATION_BACKFILL_LIMIT,
  lastSignalAt: null,
  lastBackfillAt: null,
  lastBackfillChecked: 0,
  lastBackfillInserted: 0,
  lastErrorAt: null,
  lastError: null,
};

export function getReputationHealth(): ReputationHealthSnapshot {
  return { ...reputationHealth };
}

export function shouldRunReputationBackfillOnStart(): boolean {
  return REPUTATION_EVENTS_ENABLED && REPUTATION_BACKFILL_ON_START;
}

function normalizeWallet(wallet: unknown): string | null {
  return typeof wallet === "string" && /^0x[0-9a-fA-F]{40}$/.test(wallet)
    ? wallet.toLowerCase()
    : null;
}

function shortWallet(wallet: string): string {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function errorMessage(error: unknown): string {
  const err = error as { message?: string };
  return err.message ?? String(error);
}

function argString(activity: StoredActivityRecord, key: string): string | null {
  const value = activity.args?.[key];
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "bigint") return value.toString();
  return null;
}

function contextFor(activity: StoredActivityRecord, relation: string): ReputationEventRecord["public_context"] {
  return {
    source_event: activity.event_name,
    relation,
    contract_address: activity.contract_address,
    chain_id: activity.chain_id,
  };
}

function makeSignal(
  activity: StoredActivityRecord,
  walletValue: unknown,
  signalType: ReputationSignalType,
  relation: string,
  sourceApp: ReputationSourceApp = "pay",
): ReputationEventRecord | null {
  const wallet = normalizeWallet(walletValue);
  if (!wallet || wallet === activity.contract_address.toLowerCase()) return null;
  return {
    wallet,
    source_app: sourceApp,
    signal_type: signalType,
    signal_weight: 1,
    event_ref: activity.id,
    public_context: contextFor(activity, relation),
  };
}

function makeCreditSignal(
  activity: StoredActivityRecord,
  walletValue: unknown,
  signalType: CreditSignalType,
  relation: string,
): ReputationEventRecord | null {
  return makeSignal(activity, walletValue, signalType, relation, "credit");
}

function makeVoteSignal(
  activity: StoredActivityRecord,
  walletValue: unknown,
  signalType: VoteSignalType,
  relation: string,
): ReputationEventRecord | null {
  return makeSignal(activity, walletValue, signalType, relation, "vote");
}

async function findLinkedActivity(
  eventName: string,
  argName: string,
  argValue: string | null,
): Promise<StoredActivityRecord | null> {
  if (!argValue) return null;

  const { data, error } = await db
    .from("obscura_activity")
    .select("*")
    .eq("event_name", eventName)
    .contains("args", { [argName]: argValue })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return (data as StoredActivityRecord | null) ?? null;
}

async function derivePaySignals(activity: StoredActivityRecord): Promise<ReputationEventRecord[]> {
  const signals: ReputationEventRecord[] = [];
  const add = (signal: ReputationEventRecord | null) => {
    if (!signal) return;
    const duplicate = signals.some((existing) =>
      existing.wallet === signal.wallet && existing.signal_type === signal.signal_type,
    );
    if (!duplicate) signals.push(signal);
  };

  switch (activity.event_name) {
    case "ObscuraStealthRegistry.Announcement":
      add(makeSignal(activity, activity.args.caller, "private_payment_sent", "sender"));
      add(makeSignal(activity, activity.args.stealthAddress, "private_payment_received", "stealth_recipient"));
      break;
    case "ObscuraPay.EmployeePaid":
      add(makeSignal(activity, activity.args.employer, "private_payment_sent", "employer"));
      add(makeSignal(activity, activity.args.employee, "private_payment_received", "employee"));
      break;
    case "ObscuraPayStreamV3.StreamCreated":
      add(makeSignal(activity, activity.args.employer, "stream_created", "stream_owner"));
      break;
    case "ObscuraPayStreamV3.CycleSettled": {
      const stream = await findLinkedActivity("ObscuraPayStreamV3.StreamCreated", "streamId", argString(activity, "streamId"));
      add(makeSignal(activity, stream?.args.employer, "stream_cycle_settled", "stream_owner"));
      break;
    }
    case "ObscuraConfidentialEscrow.EscrowRedeemed":
      add(makeSignal(activity, activity.args.caller, "escrow_redeemed", "redeemer"));
      break;
    case "ObscuraInvoice.InvoicePaid": {
      add(makeSignal(activity, activity.args.payer, "invoice_paid", "payer"));
      const invoice = await findLinkedActivity("ObscuraInvoice.InvoiceCreated", "invoiceId", argString(activity, "invoiceId"));
      add(makeSignal(activity, invoice?.args.creator, "invoice_paid", "request_creator"));
      break;
    }
    case "ObscuraInsuranceSubscriptionV2.Consumed": {
      const subscription = await findLinkedActivity("ObscuraInsuranceSubscriptionV2.Subscribed", "subId", argString(activity, "subId"));
      add(makeSignal(activity, subscription?.args.subscriber, "subscription_consumed", "subscriber"));
      break;
    }
    default:
      break;
  }

  return signals;
}

async function deriveCreditSignals(activity: StoredActivityRecord): Promise<ReputationEventRecord[]> {
  const signals: ReputationEventRecord[] = [];
  const add = (signal: ReputationEventRecord | null) => {
    if (!signal) return;
    const duplicate = signals.some((existing) =>
      existing.wallet === signal.wallet && existing.signal_type === signal.signal_type,
    );
    if (!duplicate) signals.push(signal);
  };

  const eventType = activity.event_name.split(".").pop();
  if (!activity.event_name.startsWith("Credit")) return signals;

  switch (eventType) {
    case "Supplied":
      add(makeCreditSignal(activity, activity.args.user, "credit_liquidity_supplied", "supplier"));
      break;
    case "Withdrew":
      if (activity.event_name.startsWith("CreditVault")) {
        add(makeCreditSignal(activity, activity.args.user, "credit_vault_withdrew", "vault_user"));
      } else {
        add(makeCreditSignal(activity, activity.args.user, "credit_liquidity_withdrawn", "supplier"));
      }
      break;
    case "CollateralSupplied":
      add(makeCreditSignal(activity, activity.args.user, "credit_collateral_supplied", "borrower"));
      break;
    case "CollateralWithdrawn":
      add(makeCreditSignal(activity, activity.args.user, "credit_collateral_withdrawn", "borrower"));
      break;
    case "Borrowed":
      add(makeCreditSignal(activity, activity.args.user, "credit_borrowed", "borrower"));
      break;
    case "Repaid":
      add(makeCreditSignal(activity, activity.args.user, "credit_repaid", "borrower"));
      break;
    case "LiquidationOpened":
    case "AuctionOpened":
      add(makeCreditSignal(activity, activity.args.borrower, "credit_liquidation_opened", "borrower"));
      break;
    case "AuctionSettled":
      add(makeCreditSignal(activity, activity.args.winner, "credit_auction_won", "winner"));
      break;
    case "Deposited":
      add(makeCreditSignal(activity, activity.args.user, "credit_vault_deposited", "vault_user"));
      break;
    case "ScoreUpdated":
      add(makeCreditSignal(activity, activity.args.user, "credit_score_updated", "score_subject"));
      break;
    default:
      break;
  }

  return signals;
}

async function deriveVoteSignals(activity: StoredActivityRecord): Promise<ReputationEventRecord[]> {
  const signals: ReputationEventRecord[] = [];
  const add = (signal: ReputationEventRecord | null) => {
    if (!signal) return;
    const duplicate = signals.some((existing) =>
      existing.wallet === signal.wallet && existing.signal_type === signal.signal_type,
    );
    if (!duplicate) signals.push(signal);
  };

  switch (activity.event_name) {
    case "ObscuraVote.VoteCast":
      add(makeVoteSignal(activity, activity.args.voter, "vote_participated", "voter"));
      break;
    case "ObscuraVote.VoteChanged":
      add(makeVoteSignal(activity, activity.args.voter, "vote_changed", "voter"));
      break;
    case "ObscuraVote.DelegateSet":
      add(makeVoteSignal(activity, activity.args.delegator, "vote_delegated", "delegator"));
      break;
    case "ObscuraVote.DelegateRemoved":
      add(makeVoteSignal(activity, activity.args.delegator, "vote_delegation_removed", "delegator"));
      break;
    case "ObscuraGovernor.VoteCast":
      add(makeVoteSignal(activity, activity.args.voter, "governance_vote_cast", "voter"));
      break;
    case "ObscuraGovernor.ProposalCreated":
      add(makeVoteSignal(activity, activity.args.proposer, "governance_proposed", "proposer"));
      break;
    case "ObscuraTreasury.SpendAttached":
      add(makeVoteSignal(activity, activity.args.recipient, "treasury_spend_attached", "recipient"));
      break;
    case "ObscuraTreasury.SpendExecuted":
      add(makeVoteSignal(activity, activity.args.recipient, "treasury_spend_executed", "recipient"));
      break;
    case "ObscuraRewards.RewardAccrued":
      add(makeVoteSignal(activity, activity.args.voter, "vote_reward_accrued", "voter"));
      break;
    case "ObscuraRewards.RewardWithdrawn":
      add(makeVoteSignal(activity, activity.args.voter, "vote_reward_withdrawn", "voter"));
      break;
    default:
      break;
  }

  return signals;
}

async function upsertReputationSignals(signals: ReputationEventRecord[]): Promise<number> {
  if (signals.length === 0) return 0;

  const { data, error } = await db
    .from("obscura_reputation_events")
    .upsert(signals, {
      onConflict: "wallet,source_app,signal_type,event_ref",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw error;
  const inserted = Array.isArray(data) ? data.length : 0;
  if (inserted > 0) reputationHealth.lastSignalAt = new Date().toISOString();
  return inserted;
}

export async function insertReputationSignalsForActivity(activity: StoredActivityRecord): Promise<number> {
  if (!REPUTATION_EVENTS_ENABLED) return 0;

  try {
    const signals = [
      ...(await derivePaySignals(activity)),
      ...(await deriveCreditSignals(activity)),
      ...(await deriveVoteSignals(activity)),
    ];
    const inserted = await upsertReputationSignals(signals);
    if (signals.length > 0) {
      console.log(`[reputation] activity=${activity.id} event=${activity.event_name} signals=${signals.length} inserted=${inserted}`);
    }
    return inserted;
  } catch (error) {
    reputationHealth.lastErrorAt = new Date().toISOString();
    reputationHealth.lastError = errorMessage(error);
    throw error;
  }
}

export async function backfillReputationEvents(limit = REPUTATION_BACKFILL_LIMIT): Promise<{ checked: number; inserted: number }> {
  if (!REPUTATION_EVENTS_ENABLED) return { checked: 0, inserted: 0 };

  const { data, error } = await db
    .from("obscura_activity")
    .select("*")
    .order("id", { ascending: false })
    .limit(limit);

  if (error) {
    reputationHealth.lastErrorAt = new Date().toISOString();
    reputationHealth.lastError = error.message;
    throw error;
  }

  const activities = ((data ?? []) as StoredActivityRecord[]).reverse();
  let inserted = 0;
  for (const activity of activities) {
    inserted += await insertReputationSignalsForActivity(activity);
  }

  reputationHealth.lastBackfillAt = new Date().toISOString();
  reputationHealth.lastBackfillChecked = activities.length;
  reputationHealth.lastBackfillInserted = inserted;
  console.log(`[reputation] backfill complete checked=${activities.length} inserted=${inserted}`);
  return { checked: activities.length, inserted };
}

export function summarizeSignalWallets(signals: ReputationEventRecord[]): string {
  return signals.map((signal) => shortWallet(signal.wallet)).join(",");
}