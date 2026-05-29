import type { ReputationSummary } from "@/hooks/useReputationSummary";

export const REPUTATION_CATEGORY_SIGNALS = {
  pay: [
    "private_payment_sent",
    "private_payment_received",
    "stream_created",
    "stream_cycle_settled",
    "escrow_redeemed",
    "invoice_paid",
    "subscription_consumed",
  ],
  credit: [
    "credit_liquidity_supplied",
    "credit_collateral_supplied",
    "credit_borrowed",
    "credit_repaid",
    "credit_vault_deposited",
    "credit_score_updated",
  ],
  governance: [
    "vote_participated",
    "vote_changed",
    "vote_delegated",
    "governance_vote_cast",
    "governance_proposed",
  ],
} as const;

export const REPUTATION_TIER_LABEL: Record<ReputationSummary["tier"], string> = {
  new: "New",
  active: "Active",
  steady: "Steady",
  reliable: "Reliable",
};

export function categoryScore(summary: ReputationSummary | null, keys: readonly string[]): number {
  if (!summary) return 0;
  return keys.reduce((total, key) => total + (summary.signals[key]?.cappedWeight ?? 0), 0);
}

export function governanceEventCount(summary: ReputationSummary | null): number {
  if (!summary) return 0;
  return REPUTATION_CATEGORY_SIGNALS.governance.reduce(
    (total, key) => total + (summary.signals[key]?.count ?? 0),
    0,
  );
}
