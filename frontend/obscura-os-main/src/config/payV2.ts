/**
 * Wave 3 Pay — Privacy-hardened redeploys + new contracts.
 *
 * NOTE: This file is intentionally separate from wave2.ts. wave2.ts MUST NOT
 * be edited — components that still target the V1 surface (legacy escrows,
 * legacy stream cycles) keep importing from there. New code should import
 * from wave3.ts.
 */

// ─── InEuint64 / InEaddress tuple shape (cofhe-sdk encryptInputs output) ──
const InEuint64Components = [
  { name: "ctHash", type: "uint256" },
  { name: "securityZone", type: "uint8" },
  { name: "utype", type: "uint8" },
  { name: "signature", type: "bytes" },
] as const;
const InEaddressComponents = InEuint64Components;

// ─── Addresses ────────────────────────────────────────────────────────────
export const OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS = import.meta.env
  .VITE_OBSCURA_PAYROLL_RESOLVER_V2_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_PAY_STREAM_V2_ADDRESS = import.meta.env
  .VITE_OBSCURA_PAY_STREAM_V2_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_ADDRESS_BOOK_ADDRESS = import.meta.env
  .VITE_OBSCURA_ADDRESS_BOOK_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_INBOX_INDEX_ADDRESS = import.meta.env
  .VITE_OBSCURA_INBOX_INDEX_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS = import.meta.env
  .VITE_OBSCURA_INSURANCE_SUBSCRIPTION_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_SOCIAL_RESOLVER_ADDRESS = import.meta.env
  .VITE_OBSCURA_SOCIAL_RESOLVER_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_STEALTH_ROTATION_ADDRESS = import.meta.env
  .VITE_OBSCURA_STEALTH_ROTATION_ADDRESS as `0x${string}` | undefined;

// ─── ObscuraPayStreamV2 ABI ───────────────────────────────────────────────
export const OBSCURA_PAY_STREAM_V2_ABI = [
  {
    type: "function",
    name: "createStream",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "encRecipientHint",
        type: "tuple",
        components: InEaddressComponents,
      },
      { name: "periodSeconds", type: "uint64" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "jitterSeconds", type: "uint32" },
    ],
    outputs: [{ name: "streamId", type: "uint256" }],
  },
  {
    type: "function",
    name: "tickStream",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId", type: "uint256" },
      { name: "encAmount", type: "tuple", components: InEuint64Components },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [{ name: "escrowId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setPaused",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId", type: "uint256" },
      { name: "paused", type: "bool" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancelStream",
    stateMutability: "nonpayable",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "updateJitter",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId", type: "uint256" },
      { name: "jitterSeconds", type: "uint32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "shareRecipientHint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId", type: "uint256" },
      { name: "reader", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getStream",
    stateMutability: "view",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: [
      { name: "employer", type: "address" },
      { name: "periodSeconds", type: "uint64" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "lastTickTime", type: "uint64" },
      { name: "jitterSeconds", type: "uint32" },
      { name: "cyclesPaid", type: "uint64" },
      { name: "paused", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "getRecipientHint",
    stateMutability: "view",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }], // eaddress handle
  },
  {
    type: "function",
    name: "streamCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "StreamCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "streamId", type: "uint256" },
      { indexed: true, name: "employer", type: "address" },
      { indexed: false, name: "periodSeconds", type: "uint64" },
      { indexed: false, name: "startTime", type: "uint64" },
      { indexed: false, name: "endTime", type: "uint64" },
      { indexed: false, name: "jitterSeconds", type: "uint32" },
    ],
  },
  {
    type: "event",
    name: "CycleSettled",
    anonymous: false,
    inputs: [
      { indexed: true, name: "streamId", type: "uint256" },
      { indexed: true, name: "escrowId", type: "uint256" },
      { indexed: false, name: "scheduledFor", type: "uint64" },
      { indexed: false, name: "executedAt", type: "uint64" },
    ],
  },
  {
    type: "event",
    name: "StreamPausedSet",
    anonymous: false,
    inputs: [
      { indexed: true, name: "streamId", type: "uint256" },
      { indexed: false, name: "paused", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "StreamCancelled",
    anonymous: false,
    inputs: [{ indexed: true, name: "streamId", type: "uint256" }],
  },
  {
    type: "event",
    name: "StreamJitterUpdated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "streamId", type: "uint256" },
      { indexed: false, name: "jitterSeconds", type: "uint32" },
    ],
  },
] as const;

// ─── ObscuraPayrollResolverV2 ABI ─────────────────────────────────────────
export const OBSCURA_PAYROLL_RESOLVER_V2_ABI = [
  {
    type: "function",
    name: "isConditionMet",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "uint256" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "uint256" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "shareEmployer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "uint256" },
      { name: "reader", type: "address" },
      { name: "salt", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getCycle",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [
      { name: "releaseTime", type: "uint64" },
      { name: "cancelled", type: "bool" },
      { name: "approved", type: "bool" },
      { name: "employerCommit", type: "bytes32" },
      { name: "approverCommit", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "CycleRegistered",
    anonymous: false,
    inputs: [
      { indexed: true, name: "escrowId", type: "uint256" },
      { indexed: false, name: "releaseTime", type: "uint64" },
    ],
  },
  {
    type: "event",
    name: "CycleCancelled",
    anonymous: false,
    inputs: [{ indexed: true, name: "escrowId", type: "uint256" }],
  },
  {
    type: "event",
    name: "CycleApproved",
    anonymous: false,
    inputs: [{ indexed: true, name: "escrowId", type: "uint256" }],
  },
] as const;

// ─── ObscuraAddressBook ABI ───────────────────────────────────────────────
export const OBSCURA_ADDRESS_BOOK_ABI = [
  {
    type: "function",
    name: "addContact",
    stateMutability: "nonpayable",
    inputs: [
      { name: "labelHash", type: "bytes32" },
      { name: "encMeta", type: "tuple", components: InEaddressComponents },
    ],
    outputs: [{ name: "contactId", type: "uint256" }],
  },
  {
    type: "function",
    name: "relabel",
    stateMutability: "nonpayable",
    inputs: [
      { name: "contactId", type: "uint256" },
      { name: "newLabelHash", type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "removeContact",
    stateMutability: "nonpayable",
    inputs: [{ name: "contactId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getContact",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "contactId", type: "uint256" },
    ],
    outputs: [
      { name: "labelHash", type: "bytes32" },
      { name: "encMeta", type: "bytes32" },
      { name: "createdAt", type: "uint64" },
    ],
  },
  {
    type: "function",
    name: "listContactIds",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "nextContactId",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "ContactAdded",
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "contactId", type: "uint256" },
      { indexed: false, name: "labelHash", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "ContactRemoved",
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "contactId", type: "uint256" },
    ],
  },
  {
    type: "event",
    name: "ContactRelabelled",
    anonymous: false,
    inputs: [
      { indexed: true, name: "owner", type: "address" },
      { indexed: true, name: "contactId", type: "uint256" },
      { indexed: false, name: "newLabelHash", type: "bytes32" },
    ],
  },
] as const;

// ─── ObscuraInboxIndex ABI ────────────────────────────────────────────────
export const OBSCURA_INBOX_INDEX_ABI = [
  {
    type: "function",
    name: "ignoreSender",
    stateMutability: "nonpayable",
    inputs: [{ name: "ephHash", type: "bytes32" }],
    outputs: [],
  },
  {
    type: "function",
    name: "ignoreSenders",
    stateMutability: "nonpayable",
    inputs: [{ name: "ephHashes", type: "bytes32[]" }],
    outputs: [],
  },
  {
    type: "function",
    name: "resetFilter",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  {
    type: "function",
    name: "isIgnored",
    stateMutability: "view",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "ephHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "SenderIgnored",
    anonymous: false,
    inputs: [
      { indexed: true, name: "recipient", type: "address" },
      { indexed: true, name: "ephHash", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "FilterReset",
    anonymous: false,
    inputs: [{ indexed: true, name: "recipient", type: "address" }],
  },
] as const;

// ─── ObscuraInsuranceSubscription ABI ─────────────────────────────────────
export const OBSCURA_INSURANCE_SUBSCRIPTION_ABI = [
  {
    type: "function",
    name: "subscribe",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId", type: "uint256" },
      { name: "maxCycles", type: "uint64" },
      { name: "periodSeconds", type: "uint64" },
      {
        name: "encMaxPremiumPerCycle",
        type: "tuple",
        components: InEuint64Components,
      },
    ],
    outputs: [{ name: "subId", type: "uint256" }],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "subId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getSubscription",
    stateMutability: "view",
    inputs: [{ name: "subId", type: "uint256" }],
    outputs: [
      { name: "subscriber", type: "address" },
      { name: "streamId", type: "uint256" },
      { name: "maxCycles", type: "uint64" },
      { name: "cyclesConsumed", type: "uint64" },
      { name: "periodSeconds", type: "uint64" },
      { name: "lastConsumedAt", type: "uint64" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "subsBySubscriber",
    stateMutability: "view",
    inputs: [{ name: "subscriber", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "subCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "Subscribed",
    anonymous: false,
    inputs: [
      { indexed: true, name: "subId", type: "uint256" },
      { indexed: true, name: "subscriber", type: "address" },
      { indexed: true, name: "streamId", type: "uint256" },
      { indexed: false, name: "maxCycles", type: "uint64" },
      { indexed: false, name: "periodSeconds", type: "uint64" },
    ],
  },
  {
    type: "event",
    name: "Consumed",
    anonymous: false,
    inputs: [
      { indexed: true, name: "subId", type: "uint256" },
      { indexed: false, name: "cycleIndex", type: "uint64" },
      { indexed: false, name: "consumedAt", type: "uint64" },
    ],
  },
  {
    type: "event",
    name: "Cancelled",
    anonymous: false,
    inputs: [{ indexed: true, name: "subId", type: "uint256" }],
  },
] as const;

// ─── ObscuraSocialResolver ABI ────────────────────────────────────────────
export const OBSCURA_SOCIAL_RESOLVER_ABI = [
  {
    type: "function",
    name: "selfRegister",
    stateMutability: "nonpayable",
    inputs: [
      { name: "handle", type: "string" },
      { name: "metaSpendingPubKey", type: "bytes32" },
      { name: "metaViewingPubKey", type: "bytes32" },
      { name: "metaSpendingPrefix", type: "uint8" },
      { name: "metaViewingPrefix", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "registerWithEnsProof",
    stateMutability: "nonpayable",
    inputs: [
      { name: "handle", type: "string" },
      { name: "metaSpendingPubKey", type: "bytes32" },
      { name: "metaViewingPubKey", type: "bytes32" },
      { name: "metaSpendingPrefix", type: "uint8" },
      { name: "metaViewingPrefix", type: "uint8" },
      { name: "ensSignature", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "updateMeta",
    stateMutability: "nonpayable",
    inputs: [
      { name: "handle", type: "string" },
      { name: "metaSpendingPubKey", type: "bytes32" },
      { name: "metaViewingPubKey", type: "bytes32" },
      { name: "metaSpendingPrefix", type: "uint8" },
      { name: "metaViewingPrefix", type: "uint8" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "transferHandle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "handle", type: "string" },
      { name: "newOwner", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "resolve",
    stateMutability: "view",
    inputs: [{ name: "handle", type: "string" }],
    outputs: [
      { name: "owner", type: "address" },
      { name: "metaSpendingPubKey", type: "bytes32" },
      { name: "metaViewingPubKey", type: "bytes32" },
      { name: "metaSpendingPrefix", type: "uint8" },
      { name: "metaViewingPrefix", type: "uint8" },
      { name: "selfClaimed", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "handlesByOwner",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "bytes32[]" }],
  },
  {
    type: "event",
    name: "HandleRegistered",
    anonymous: false,
    inputs: [
      { indexed: true, name: "handleHash", type: "bytes32" },
      { indexed: true, name: "owner", type: "address" },
      { indexed: false, name: "selfClaimed", type: "bool" },
    ],
  },
  {
    type: "event",
    name: "MetaUpdated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "handleHash", type: "bytes32" },
      { indexed: true, name: "owner", type: "address" },
    ],
  },
  {
    type: "event",
    name: "HandleTransferred",
    anonymous: false,
    inputs: [
      { indexed: true, name: "handleHash", type: "bytes32" },
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
    ],
  },
] as const;

// ─── ObscuraStealthRotation ABI ───────────────────────────────────────────
export const OBSCURA_STEALTH_ROTATION_ABI = [
  {
    type: "function",
    name: "rotate",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spendingPubKey", type: "bytes" },
      { name: "viewingPubKey", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "currentMeta",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "spendingPubKey", type: "bytes" },
      { name: "viewingPubKey", type: "bytes" },
      { name: "publishedAt", type: "uint64" },
      { name: "index", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "metaAt",
    stateMutability: "view",
    inputs: [
      { name: "user", type: "address" },
      { name: "index", type: "uint256" },
    ],
    outputs: [
      { name: "spendingPubKey", type: "bytes" },
      { name: "viewingPubKey", type: "bytes" },
      { name: "publishedAt", type: "uint64" },
      { name: "active", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "historyLength",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "hasMeta",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "MetaRotated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: true, name: "newIndex", type: "uint256" },
      { indexed: false, name: "previousIndex", type: "uint256" },
      { indexed: false, name: "spendingPubKey", type: "bytes" },
      { indexed: false, name: "viewingPubKey", type: "bytes" },
    ],
  },
] as const;
