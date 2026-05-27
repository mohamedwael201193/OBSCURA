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
