/**
 * events.ts — ABI fragments for all Obscura Pay events to index
 */

export const PAY_EVENTS = [
  {
    type: "event" as const,
    name: "PaymentSent",
    inputs: [
      { name: "from",  type: "address", indexed: true },
      { name: "to",    type: "address", indexed: true },
      { name: "txId",  type: "bytes32", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "PaymentReceived",
    inputs: [
      { name: "from",  type: "address", indexed: true },
      { name: "to",    type: "address", indexed: true },
      { name: "txId",  type: "bytes32", indexed: true },
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
      { name: "invoiceId", type: "uint256", indexed: true },
      { name: "issuer",    type: "address", indexed: true },
      { name: "payer",     type: "address", indexed: true },
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
    name: "EscrowDeposited",
    inputs: [
      { name: "escrowId",  type: "uint256", indexed: true },
      { name: "depositor", type: "address", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "EscrowReleased",
    inputs: [
      { name: "escrowId",    type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: true },
    ],
  },
  {
    type: "event" as const,
    name: "EscrowRefunded",
    inputs: [
      { name: "escrowId",  type: "uint256", indexed: true },
      { name: "depositor", type: "address", indexed: true },
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

export const STEALTH_EVENTS = [
  {
    type: "event" as const,
    name: "StealthAddressRegistered",
    inputs: [
      { name: "owner",          type: "address", indexed: true },
      { name: "stealthAddress", type: "address", indexed: false },
    ],
  },
] as const;
