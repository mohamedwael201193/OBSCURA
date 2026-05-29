/**
 * events.ts — ABI fragments for all Obscura Pay events to index
 * Event signatures verified against deployed contracts on Arbitrum Sepolia.
 */

// ObscuraPay (Wave 1 payroll) — 0x91CdD9a481C732bEB09Ce039da23DC11e83547a4
export const PAY_EVENTS = [
  {
    type: "event" as const,
    name: "EmployeePaid",
    inputs: [
      { name: "employer", type: "address", indexed: true },
      { name: "employee", type: "address", indexed: true },
    ],
  },
] as const;

export const PAYSTREAM_EVENTS = [
  {
    type: "event" as const,
    name: "StreamCreated",
    inputs: [
      { name: "streamId",      type: "uint256", indexed: true },
      { name: "employer",      type: "address", indexed: true },
      { name: "periodSeconds", type: "uint64",  indexed: false },
      { name: "startTime",     type: "uint64",  indexed: false },
      { name: "endTime",       type: "uint64",  indexed: false },
      { name: "jitterSeconds", type: "uint32",  indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "StreamCancelled",
    inputs: [
      { name: "streamId", type: "uint256", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "CycleSettled",
    inputs: [
      { name: "streamId",   type: "uint256", indexed: true },
      { name: "escrowId",   type: "uint256", indexed: true },
      { name: "cycleIndex", type: "uint64",  indexed: false },
      { name: "settledAt",  type: "uint64",  indexed: false },
    ],
  },
] as const;

export const INVOICE_EVENTS = [
  {
    type: "event" as const,
    name: "InvoiceCreated",
    inputs: [
      { name: "invoiceId",   type: "uint256", indexed: true },
      { name: "creator",     type: "address", indexed: true },
      { name: "memoHash",    type: "bytes32", indexed: false },
      { name: "expiryBlock", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "InvoicePaid",
    inputs: [
      { name: "invoiceId", type: "uint256", indexed: true },
      { name: "payer",     type: "address", indexed: true },
    ],
  },
] as const;

export const ESCROW_EVENTS = [
  {
    type: "event" as const,
    name: "EscrowCreated",
    inputs: [
      { name: "escrowId",  type: "uint256", indexed: true },
      { name: "creator",   type: "address", indexed: true },
      { name: "resolver",  type: "address", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "EscrowFunded",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "payer",    type: "address", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "EscrowRedeemed",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "caller",   type: "address", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "EscrowCancelled",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "creator",  type: "address", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "EscrowRefunded",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "caller",   type: "address", indexed: true },
    ],
  },
] as const;

export const INSURANCE_EVENTS = [
  {
    type: "event" as const,
    name: "Subscribed",
    inputs: [
      { name: "subId",         type: "uint256", indexed: true },
      { name: "subscriber",    type: "address", indexed: true },
      { name: "streamId",      type: "uint256", indexed: true },
      { name: "maxCycles",     type: "uint64",  indexed: false },
      { name: "periodSeconds", type: "uint64",  indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "Consumed",
    inputs: [
      { name: "subId",      type: "uint256", indexed: true },
      { name: "cycleIndex", type: "uint64",  indexed: false },
      { name: "consumedAt", type: "uint64",  indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "Cancelled",
    inputs: [
      { name: "subId", type: "uint256", indexed: true },
    ],
  },
] as const;

// ObscuraStealthRegistry — 0xa36e791a611D36e2C817a7DA0f41547D30D4917d
// Announcement: emitted on every stealth send so wallets can scan with view-tag filter
// MetaAddressSet: emitted when a user registers/updates their meta-address
export const STEALTH_EVENTS = [
  {
    type: "event" as const,
    name: "Announcement",
    inputs: [
      { name: "schemeId",       type: "uint256", indexed: true },
      { name: "stealthAddress", type: "address", indexed: true },
      { name: "caller",         type: "address", indexed: true },
      { name: "ephemeralPubKey", type: "bytes",  indexed: false },
      { name: "viewTag",        type: "bytes1",  indexed: false },
      { name: "metadata",       type: "bytes",   indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "MetaAddressSet",
    inputs: [
      { name: "user",           type: "address", indexed: true },
      { name: "spendingPubKey", type: "bytes",   indexed: false },
      { name: "viewingPubKey",  type: "bytes",   indexed: false },
    ],
  },
] as const;

export const CREDIT_MARKET_EVENTS = [
  {
    type: "event" as const,
    name: "Supplied",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
  {
    type: "event" as const,
    name: "Withdrew",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
  {
    type: "event" as const,
    name: "CollateralSupplied",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
  {
    type: "event" as const,
    name: "CollateralWithdrawn",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
  {
    type: "event" as const,
    name: "Borrowed",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
  {
    type: "event" as const,
    name: "Repaid",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
  {
    type: "event" as const,
    name: "LiquidationOpened",
    inputs: [
      { name: "borrower", type: "address", indexed: true },
      { name: "auctionId", type: "uint256", indexed: true },
    ],
  },
] as const;

export const CREDIT_AUCTION_EVENTS = [
  {
    type: "event" as const,
    name: "AuctionOpened",
    inputs: [
      { name: "auctionId", type: "uint256", indexed: true },
      { name: "market", type: "address", indexed: true },
      { name: "borrower", type: "address", indexed: true },
      { name: "endsAt", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "BidSubmitted",
    inputs: [
      { name: "auctionId", type: "uint256", indexed: true },
      { name: "newCount", type: "uint32", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "AuctionSettled",
    inputs: [
      { name: "auctionId", type: "uint256", indexed: true },
      { name: "winner", type: "address", indexed: true },
    ],
  },
] as const;

export const CREDIT_VAULT_EVENTS = [
  {
    type: "event" as const,
    name: "Deposited",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
  {
    type: "event" as const,
    name: "Withdrew",
    inputs: [{ name: "user", type: "address", indexed: true }],
  },
] as const;

export const CREDIT_SCORE_EVENTS = [
  {
    type: "event" as const,
    name: "ScoreUpdated",
    inputs: [
      { name: "user", type: "address", indexed: true },
      { name: "tier", type: "uint8", indexed: false },
    ],
  },
] as const;

export const VOTE_EVENTS = [
  {
    type: "event" as const,
    name: "ProposalCreated",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "title", type: "string", indexed: false },
      { name: "numOptions", type: "uint8", indexed: false },
      { name: "deadline", type: "uint256", indexed: false },
      { name: "category", type: "uint8", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "VoteCast",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "voter", type: "address", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "VoteChanged",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "voter", type: "address", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "VoteFinalized",
    inputs: [{ name: "proposalId", type: "uint256", indexed: true }],
  },
  {
    type: "event" as const,
    name: "ProposalCancelled",
    inputs: [{ name: "proposalId", type: "uint256", indexed: true }],
  },
  {
    type: "event" as const,
    name: "DeadlineExtended",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "newDeadline", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "DelegateSet",
    inputs: [
      { name: "delegator", type: "address", indexed: true },
      { name: "delegatee", type: "address", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "DelegateRemoved",
    inputs: [
      { name: "delegator", type: "address", indexed: true },
      { name: "formerDelegatee", type: "address", indexed: true },
    ],
  },
] as const;

export const TREASURY_EVENTS = [
  {
    type: "event" as const,
    name: "FundsReceived",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "SpendAttached",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "FinalizationRecorded",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "timelockEnds", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "SpendExecuted",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "recipient", type: "address", indexed: true },
      { name: "amountWei", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "TimelockDurationUpdated",
    inputs: [
      { name: "oldDuration", type: "uint256", indexed: false },
      { name: "newDuration", type: "uint256", indexed: false },
    ],
  },
] as const;

export const REWARDS_EVENTS = [
  {
    type: "event" as const,
    name: "RewardAccrued",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: true },
      { name: "voter", type: "address", indexed: true },
      { name: "rewardGwei", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "WithdrawalRequested",
    inputs: [{ name: "voter", type: "address", indexed: true }],
  },
  {
    type: "event" as const,
    name: "RewardWithdrawn",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "amountWei", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "RewardsFunded",
    inputs: [
      { name: "from", type: "address", indexed: true },
      { name: "amountWei", type: "uint256", indexed: false },
    ],
  },
] as const;

export const GOVERNOR_EVENTS = [
  {
    type: "event" as const,
    name: "ProposalCreated",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "proposer", type: "address", indexed: false },
      { name: "targets", type: "address[]", indexed: false },
      { name: "values", type: "uint256[]", indexed: false },
      { name: "signatures", type: "string[]", indexed: false },
      { name: "calldatas", type: "bytes[]", indexed: false },
      { name: "voteStart", type: "uint256", indexed: false },
      { name: "voteEnd", type: "uint256", indexed: false },
      { name: "description", type: "string", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "VoteCast",
    inputs: [
      { name: "voter", type: "address", indexed: true },
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "support", type: "uint8", indexed: false },
      { name: "weight", type: "uint256", indexed: false },
      { name: "reason", type: "string", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "ProposalQueued",
    inputs: [
      { name: "proposalId", type: "uint256", indexed: false },
      { name: "etaSeconds", type: "uint256", indexed: false },
    ],
  },
  {
    type: "event" as const,
    name: "ProposalExecuted",
    inputs: [{ name: "proposalId", type: "uint256", indexed: false }],
  },
  {
    type: "event" as const,
    name: "ProposalCanceled",
    inputs: [{ name: "proposalId", type: "uint256", indexed: false }],
  },
] as const;
