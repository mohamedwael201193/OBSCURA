/**
 * Wave 5 PAY V3 — Native ocUSDC migration config.
 *
 * All V3 contracts use the handle-based pattern (confidentialTransferFromHandle)
 * instead of forwarding InEuint64 proofs to child contracts (which fails with
 * CoFHE InvalidSigner). This file should be imported by V3-specific hooks and
 * components; legacy V2 hooks keep importing from payV2.ts.
 *
 * NOTE: Addresses are populated from .env after the Wave 5 migration deployment.
 * Run `npx hardhat run scripts/deployWave5PayMigration.ts --network arb-sepolia`
 * to deploy, then fill in the addresses below.
 */

// ─── InEuint64 / InEaddress tuple shape (cofhe-sdk encryptInputs output) ──
const InEuint64Components = [
  { name: "ctHash",       type: "uint256" },
  { name: "securityZone", type: "uint8"   },
  { name: "utype",        type: "uint8"   },
  { name: "signature",    type: "bytes"   },
] as const;
const InEaddressComponents = InEuint64Components;

// ─── Addresses ────────────────────────────────────────────────────────────
/** Wave 5 PAY ocUSDC wrapper v2 — backed by Circle USDC, supports
 *  confidentialTransferFromHandle. Distinct from the Credit-market ocUSDC. */
export const OBSCURA_PAY_OCUSDC_ADDRESS = import.meta.env
  .VITE_OBSCURA_PAY_OCUSDC_ADDRESS as `0x${string}` | undefined;

/** Wave 5 ObscuraConfidentialEscrow v2 — created with the V2 PAY ocUSDC token
 *  and includes createFromHandles + fundFromHandle methods. */
export const OBSCURA_CONFIDENTIAL_ESCROW_V2_ADDRESS = import.meta.env
  .VITE_OBSCURA_CONFIDENTIAL_ESCROW_V2_ADDRESS as `0x${string}` | undefined;

/** Wave 5 ObscuraPayStreamV3 — no Reineira deps, uses ocUSDC v2 + escrow v2. */
export const OBSCURA_PAY_STREAM_V3_ADDRESS = import.meta.env
  .VITE_OBSCURA_PAY_STREAM_V3_ADDRESS as `0x${string}` | undefined;

/** Wave 5 ObscuraPayrollResolverV3 — plaintext commit-based auth, no InEaddress. */
export const OBSCURA_PAYROLL_RESOLVER_V3_ADDRESS = import.meta.env
  .VITE_OBSCURA_PAYROLL_RESOLVER_V3_ADDRESS as `0x${string}` | undefined;

/** Wave 5 ObscuraInsuranceSubscription v2 — same external interface as v1
 *  but uses IObscuraToken + confidentialTransferFromHandle internally. */
export const OBSCURA_INSURANCE_SUBSCRIPTION_V2_ADDRESS = import.meta.env
  .VITE_OBSCURA_INSURANCE_SUBSCRIPTION_V2_ADDRESS as `0x${string}` | undefined;

// ─── ObscuraPayStreamV3 ABI ────────────────────────────────────────────────
//
// Key difference from V2:
//   tickStream now accepts 6 parameters:
//     (streamId, encCycleAmount, encStealthOwner, employerSalt, approver, approverSalt)
//   The proofs are processed INSIDE the stream contract (no forwarding).
//   Prerequisite: employer must call cUSDC.setOperator(streamV3Addr, expiry) first.
//
//   getStream returns: (employer, periodSeconds, startTime, endTime, lastTickTime,
//                       cyclesPaid, jitterSeconds, paused)
//   NOTE: V3 swaps jitterSeconds/cyclesPaid order vs V2.
//
export const OBSCURA_PAY_STREAM_V3_ABI = [
  // ── stream management ──────────────────────────────────────────────────
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
      { name: "startTime",     type: "uint64" },
      { name: "endTime",       type: "uint64" },
      { name: "jitterSeconds", type: "uint32" },
    ],
    outputs: [{ name: "streamId", type: "uint256" }],
  },
  {
    type: "function",
    name: "tickStream",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId",        type: "uint256" },
      { name: "encCycleAmount",  type: "tuple",  components: InEuint64Components  },
      { name: "encStealthOwner", type: "tuple",  components: InEaddressComponents },
      { name: "employerSalt",    type: "bytes32" },
      { name: "approver",        type: "address" },
      { name: "approverSalt",    type: "bytes32" },
    ],
    outputs: [{ name: "escrowId", type: "uint256" }],
  },
  {
    type: "function",
    name: "setPaused",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId", type: "uint256" },
      { name: "paused",   type: "bool"    },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "setJitter",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId",      type: "uint256" },
      { name: "jitterSeconds", type: "uint32"  },
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
    name: "shareRecipientHint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId", type: "uint256" },
      { name: "reader",   type: "address" },
    ],
    outputs: [],
  },
  // ── views ──────────────────────────────────────────────────────────────
  {
    type: "function",
    name: "getStream",
    stateMutability: "view",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: [
      { name: "employer",       type: "address" },
      { name: "periodSeconds",  type: "uint64"  },
      { name: "startTime",      type: "uint64"  },
      { name: "endTime",        type: "uint64"  },
      { name: "lastTickTime",   type: "uint64"  },
      { name: "cyclesPaid",     type: "uint64"  }, // ← position differs from V2
      { name: "jitterSeconds",  type: "uint32"  }, // ← position differs from V2
      { name: "paused",         type: "bool"    },
    ],
  },
  {
    type: "function",
    name: "streamCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "streamsByEmployer",
    stateMutability: "view",
    inputs: [{ name: "employer", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  // ── events ─────────────────────────────────────────────────────────────
  {
    type: "event",
    name: "StreamCreated",
    anonymous: false,
    inputs: [
      { indexed: true,  name: "streamId",      type: "uint256" },
      { indexed: true,  name: "employer",       type: "address" },
      { indexed: false, name: "periodSeconds",  type: "uint64"  },
      { indexed: false, name: "startTime",      type: "uint64"  },
      { indexed: false, name: "endTime",        type: "uint64"  },
      { indexed: false, name: "jitterSeconds",  type: "uint32"  },
    ],
  },
  {
    type: "event",
    name: "CycleSettled",
    anonymous: false,
    inputs: [
      { indexed: true,  name: "streamId",    type: "uint256" },
      { indexed: true,  name: "escrowId",    type: "uint256" },
      { indexed: false, name: "cycleIndex",  type: "uint64"  },
      { indexed: false, name: "settledAt",   type: "uint64"  },
    ],
  },
  {
    type: "event",
    name: "StreamPausedSet",
    anonymous: false,
    inputs: [
      { indexed: true,  name: "streamId", type: "uint256" },
      { indexed: false, name: "paused",   type: "bool"    },
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
      { indexed: true,  name: "streamId",      type: "uint256" },
      { indexed: false, name: "jitterSeconds",  type: "uint32"  },
    ],
  },
] as const;

// ─── ObscuraPayrollResolverV3 ABI ─────────────────────────────────────────
//
// External interface is identical to V2 (cancel/approve/getCycle).
// Internal difference: no InEaddress in onConditionSet — uses plaintext commits.
//
export const OBSCURA_PAYROLL_RESOLVER_V3_ABI = [
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
      { name: "salt",     type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "uint256" },
      { name: "salt",     type: "bytes32" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getCycle",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [
      { name: "releaseTime",    type: "uint64"  },
      { name: "cancelled",      type: "bool"    },
      { name: "approved",       type: "bool"    },
      { name: "employerCommit", type: "bytes32" },
      { name: "approverCommit", type: "bytes32" },
    ],
  },
  {
    type: "event",
    name: "CycleRegistered",
    anonymous: false,
    inputs: [
      { indexed: true,  name: "escrowId",    type: "uint256" },
      { indexed: false, name: "releaseTime", type: "uint64"  },
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

// ─── ObscuraInsuranceSubscription V2 ABI ─────────────────────────────────
//
// External interface is IDENTICAL to v1. Only internal implementation changed
// (uses confidentialTransferFromHandle instead of forwarding InEuint64).
// Re-exported here so V2 components can import from payV3 without touching payV2.
//
export const OBSCURA_INSURANCE_SUBSCRIPTION_V2_ABI = [
  {
    type: "function",
    name: "subscribe",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId",   type: "uint256" },
      { name: "maxCycles",  type: "uint64"  },
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
    name: "setConsumer",
    stateMutability: "nonpayable",
    inputs: [{ name: "newConsumer", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "getSubscription",
    stateMutability: "view",
    inputs: [{ name: "subId", type: "uint256" }],
    outputs: [
      { name: "subscriber",      type: "address" },
      { name: "streamId",        type: "uint256" },
      { name: "maxCycles",       type: "uint64"  },
      { name: "cyclesConsumed",  type: "uint64"  },
      { name: "periodSeconds",   type: "uint64"  },
      { name: "lastConsumedAt",  type: "uint64"  },
      { name: "active",          type: "bool"    },
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
      { indexed: true,  name: "subId",         type: "uint256" },
      { indexed: true,  name: "subscriber",    type: "address" },
      { indexed: true,  name: "streamId",      type: "uint256" },
      { indexed: false, name: "maxCycles",     type: "uint64"  },
      { indexed: false, name: "periodSeconds", type: "uint64"  },
    ],
  },
  {
    type: "event",
    name: "Consumed",
    anonymous: false,
    inputs: [
      { indexed: true,  name: "subId",       type: "uint256" },
      { indexed: false, name: "cycleIndex",  type: "uint64"  },
      { indexed: false, name: "consumedAt",  type: "uint64"  },
    ],
  },
  {
    type: "event",
    name: "Cancelled",
    anonymous: false,
    inputs: [{ indexed: true, name: "subId", type: "uint256" }],
  },
] as const;

// ─── ObscuraConfidentialToken (PAY wrapper v2) ABI ─────────────────────────
// Minimal ABI for PAY page ocUSDC — setOperator + isOperator for operator
// pre-flight checks before tickStream / subscribe.
export const OBSCURA_PAY_OCUSDC_ABI = [
  {
    type: "function",
    name: "setOperator",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "expiry",  type: "uint48"  },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isOperator",
    stateMutability: "view",
    inputs: [
      { name: "holder",  type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "operatorExpiry",
    stateMutability: "view",
    inputs: [
      { name: "holder",  type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint48" }],
  },
  {
    type: "function",
    name: "shield",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "unshield",
    stateMutability: "nonpayable",
    inputs: [{ name: "amount", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "confidentialTransfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to",     type: "address" },
      { name: "amount", type: "tuple",   components: InEuint64Components },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "confidentialTransferFromHandle",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from",   type: "address" },
      { name: "to",     type: "address" },
      { name: "handle", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;
