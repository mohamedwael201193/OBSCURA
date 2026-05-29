import type { ActivityEventType } from "../types/index.js";

const CREDIT_ACTIVITY_EVENT_NAMES = [
  "ObscuraCreditMarket.Supplied",
  "ObscuraCreditMarket.Withdrawn",
  "ObscuraCreditMarket.Borrowed",
  "ObscuraCreditMarket.Repaid",
  "ObscuraCreditMarket.Liquidated",
  "ObscuraCreditMarket.CollateralSupplied",
  "ObscuraCreditMarket.CollateralWithdrawn",
  "ObscuraCreditVault.Deposited",
  "ObscuraCreditVault.Withdrew",
  "ObscuraCreditAuction.AuctionCreated",
  "ObscuraCreditAuction.BidPlaced",
  "ObscuraCreditAuction.AuctionSettled",
  "ObscuraCreditScoreV2.ScoreUpdated",
];

const VOTE_ACTIVITY_EVENT_NAMES = [
  "ObscuraVote.ProposalCreated",
  "ObscuraVote.VoteCast",
  "ObscuraVote.VoteChanged",
  "ObscuraVote.Delegated",
  "ObscuraVote.DelegationRemoved",
  "ObscuraVote.ProposalFinalized",
  "ObscuraTreasury.SpendAttached",
  "ObscuraTreasury.SpendExecuted",
  "ObscuraRewards.RewardAccrued",
  "ObscuraRewards.RewardWithdrawn",
];

export const ACTIVITY_EVENT_FILTERS: Record<ActivityEventType, readonly string[]> = {
  all: [],
  sent: ["ObscuraPay.PaymentSent"],
  received: ["ObscuraPay.PaymentReceived"],
  stream: [
    "ObscuraPayStreamV2.StreamCreated",
    "ObscuraPayStreamV2.StreamCancelled",
    "ObscuraPayStreamV2.StreamWithdrawn",
    "ObscuraPayStreamV3.StreamCreated",
    "ObscuraPayStreamV3.StreamCancelled",
    "ObscuraPayStreamV3.CycleSettled",
  ],
  invoice: ["ObscuraInvoice.InvoiceCreated", "ObscuraInvoice.InvoicePaid"],
  escrow: [
    "ObscuraConfidentialEscrow.EscrowCreated",
    "ObscuraConfidentialEscrow.EscrowFunded",
    "ObscuraConfidentialEscrow.EscrowRedeemed",
    "ObscuraConfidentialEscrow.EscrowCancelled",
    "ObscuraConfidentialEscrow.EscrowRefunded",
  ],
  stealth: ["ObscuraStealthRegistry.Announcement", "ObscuraStealthRegistry.MetaAddressSet"],
  credit: CREDIT_ACTIVITY_EVENT_NAMES,
  vote: VOTE_ACTIVITY_EVENT_NAMES,
};

export type ActivityEventFilterMap = typeof ACTIVITY_EVENT_FILTERS;
