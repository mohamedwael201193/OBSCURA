import { Router, Request, Response } from "express";
import { db } from "./db";

const PAY_SIGNAL_CAPS: Record<string, number> = {
  private_payment_sent: 20,
  private_payment_received: 20,
  stream_created: 10,
  stream_cycle_settled: 20,
  escrow_redeemed: 10,
  invoice_paid: 20,
  subscription_consumed: 20,
  credit_liquidity_supplied: 20,
  credit_liquidity_withdrawn: 10,
  credit_collateral_supplied: 20,
  credit_collateral_withdrawn: 10,
  credit_borrowed: 20,
  credit_repaid: 24,
  credit_liquidation_opened: 5,
  credit_auction_won: 10,
  credit_vault_deposited: 20,
  credit_vault_withdrew: 10,
  credit_score_updated: 10,
  vote_participated: 20,
  vote_changed: 10,
  vote_delegated: 10,
  vote_delegation_removed: 5,
  governance_vote_cast: 20,
  governance_proposed: 10,
};

interface ReputationEventRow {
  source_app: string;
  signal_type: string;
  signal_weight: number;
  created_at: string;
  public_context?: Record<string, unknown> | null;
}

function normalizeWallet(wallet: unknown): string | null {
  return typeof wallet === "string" && /^0x[0-9a-fA-F]{40}$/.test(wallet)
    ? wallet.toLowerCase()
    : null;
}

function tierFor(weight: number): "new" | "active" | "steady" | "reliable" {
  if (weight >= 24) return "reliable";
  if (weight >= 12) return "steady";
  if (weight >= 3) return "active";
  return "new";
}

function signalLabel(signalType: string): string {
  return signalType
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function summarizeRows(rows: ReputationEventRow[]) {
  const bySignal: Record<string, { label: string; count: number; cappedWeight: number; latestAt: string | null }> = {};
  const bySource: Record<string, number> = {};
  let totalCappedWeight = 0;

  for (const row of rows) {
    const signalType = row.signal_type;
    const cap = PAY_SIGNAL_CAPS[signalType] ?? 10;
    const current = bySignal[signalType] ?? {
      label: signalLabel(signalType),
      count: 0,
      cappedWeight: 0,
      latestAt: null,
    };
    current.count += 1;
    current.cappedWeight = Math.min(cap, current.cappedWeight + Math.max(1, row.signal_weight || 1));
    current.latestAt = !current.latestAt || row.created_at > current.latestAt ? row.created_at : current.latestAt;
    bySignal[signalType] = current;
    bySource[row.source_app] = (bySource[row.source_app] ?? 0) + Math.max(1, row.signal_weight || 1);
  }

  for (const signal of Object.values(bySignal)) {
    totalCappedWeight += signal.cappedWeight;
  }

  return {
    totalCappedWeight,
    tier: tierFor(totalCappedWeight),
    signals: bySignal,
    sources: bySource,
    updatedAt: rows[0]?.created_at ?? null,
  };
}

export const reputationRouter = Router();

reputationRouter.get("/reputation/:wallet", async (req: Request, res: Response) => {
  const wallet = normalizeWallet(req.params.wallet);
  if (!wallet) {
    res.status(400).json({ error: "Invalid wallet address" });
    return;
  }

  try {
    const { data, error } = await db
      .from("obscura_reputation_events")
      .select("source_app, signal_type, signal_weight, created_at, public_context")
      .eq("wallet", wallet)
      .in("source_app", ["pay", "credit", "vote"])
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) throw error;
    const rows = (data ?? []) as ReputationEventRow[];
    res.json({
      wallet,
      sourceApp: "all",
      ...summarizeRows(rows),
    });
  } catch (e) {
    console.error(`[reputation] summary failed wallet=${wallet.slice(0, 6)}...${wallet.slice(-4)} error=${(e as Error).message}`);
    res.status(503).json({ error: "Reputation summary unavailable" });
  }
});