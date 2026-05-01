/**
 * Wave 2 Pay v4 — ReineiraOS-integrated payroll config & ABIs.
 * Kept in a separate file so contracts.ts (Wave 1) stays untouched.
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
export const OBSCURA_PAYROLL_RESOLVER_ADDRESS = import.meta.env
  .VITE_OBSCURA_PAYROLL_RESOLVER_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_STEALTH_REGISTRY_ADDRESS = import.meta.env
  .VITE_OBSCURA_STEALTH_REGISTRY_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_PAY_STREAM_ADDRESS = import.meta.env
  .VITE_OBSCURA_PAY_STREAM_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_PAYROLL_UNDERWRITER_ADDRESS = import.meta.env
  .VITE_OBSCURA_PAYROLL_UNDERWRITER_ADDRESS as `0x${string}` | undefined;

// ReineiraOS deployed contracts (Arbitrum Sepolia 421614)
export const REINEIRA_CUSDC_ADDRESS = import.meta.env
  .VITE_REINEIRA_CUSDC_ADDRESS as `0x${string}` | undefined;
/** @deprecated The deployed Reineira escrow proxy at this address is
 *  incompatible with the deployed cUSDC token (calls a non-existent
 *  selector 0xeb3155b5). Use OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS instead.
 *  Kept for legacy escrow lookups in My Escrows. */
export const REINEIRA_ESCROW_ADDRESS = import.meta.env
  .VITE_REINEIRA_ESCROW_ADDRESS as `0x${string}` | undefined;
/** Obscura's own confidential cUSDC escrow — replaces the broken Reineira
 *  proxy. Calls cUSDC via the present uint256-handle overloads (0xca49d7cd
 *  inbound, 0xfe3f670d outbound). End-to-end working on Arbitrum Sepolia. */
export const OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS = import.meta.env
  .VITE_OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS as `0x${string}` | undefined;
/** Obscura confidential invoice contract — Phase B1.
 *  Inverse of escrow: creator publishes an encrypted billed amount; payer
 *  pays via cUSDC.confidentialTransfer + invoice.recordPayment. */
export const OBSCURA_INVOICE_ADDRESS = import.meta.env
  .VITE_OBSCURA_INVOICE_ADDRESS as `0x${string}` | undefined;
export const REINEIRA_COVERAGE_MANAGER_ADDRESS = import.meta.env
  .VITE_REINEIRA_COVERAGE_MANAGER_ADDRESS as `0x${string}` | undefined;
export const REINEIRA_POOL_FACTORY_ADDRESS = import.meta.env
  .VITE_REINEIRA_POOL_FACTORY_ADDRESS as `0x${string}` | undefined;
export const REINEIRA_POLICY_REGISTRY_ADDRESS = import.meta.env
  .VITE_REINEIRA_POLICY_REGISTRY_ADDRESS as `0x${string}` | undefined;
export const REINEIRA_CCTP_RECEIVER_ADDRESS = import.meta.env
  .VITE_REINEIRA_CCTP_RECEIVER_ADDRESS as `0x${string}` | undefined;

// ─── ObscuraPayrollResolver ABI ───────────────────────────────────────────
export const OBSCURA_PAYROLL_RESOLVER_ABI = [
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
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "uint256" }],
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
      { name: "employer", type: "address" },
      { name: "approver", type: "address" },
    ],
  },
  {
    type: "event",
    name: "CycleRegistered",
    anonymous: false,
    inputs: [
      { indexed: true, name: "escrowId", type: "uint256" },
      { indexed: true, name: "employer", type: "address" },
      { indexed: true, name: "approver", type: "address" },
      { indexed: false, name: "releaseTime", type: "uint64" },
    ],
  },
] as const;

// ─── ObscuraStealthRegistry ABI ──────────────────────────────────────────
export const OBSCURA_STEALTH_REGISTRY_ABI = [
  {
    type: "function",
    name: "setMetaAddress",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spendingPubKey", type: "bytes" },
      { name: "viewingPubKey", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getMetaAddress",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [
      { name: "spendingPubKey", type: "bytes" },
      { name: "viewingPubKey", type: "bytes" },
      { name: "publishedAt", type: "uint256" },
    ],
  },
  {
    type: "function",
    name: "hasMetaAddress",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "registeredCount",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "announce",
    stateMutability: "nonpayable",
    inputs: [
      { name: "stealthAddress", type: "address" },
      { name: "ephemeralPubKey", type: "bytes" },
      { name: "viewTag", type: "bytes1" },
      { name: "metadata", type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "event",
    name: "MetaAddressSet",
    anonymous: false,
    inputs: [
      { indexed: true, name: "user", type: "address" },
      { indexed: false, name: "spendingPubKey", type: "bytes" },
      { indexed: false, name: "viewingPubKey", type: "bytes" },
    ],
  },
  {
    type: "event",
    name: "Announcement",
    anonymous: false,
    inputs: [
      { indexed: true, name: "schemeId", type: "uint256" },
      { indexed: true, name: "stealthAddress", type: "address" },
      { indexed: true, name: "caller", type: "address" },
      { indexed: false, name: "ephemeralPubKey", type: "bytes" },
      { indexed: false, name: "viewTag", type: "bytes1" },
      { indexed: false, name: "metadata", type: "bytes" },
    ],
  },
] as const;

// ─── ObscuraPayStream ABI ────────────────────────────────────────────────
export const OBSCURA_PAY_STREAM_ABI = [
  {
    type: "function",
    name: "createStream",
    stateMutability: "nonpayable",
    inputs: [
      { name: "recipientHint", type: "address" },
      { name: "periodSeconds", type: "uint64" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
    ],
    outputs: [{ name: "streamId", type: "uint256" }],
  },
  {
    type: "function",
    name: "tickStream",
    stateMutability: "nonpayable",
    inputs: [
      { name: "streamId", type: "uint256" },
      {
        name: "encryptedStealthOwner",
        type: "tuple",
        components: [...InEaddressComponents],
      },
      {
        name: "encryptedAmount",
        type: "tuple",
        components: [...InEuint64Components],
      },
      { name: "approver", type: "address" },
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
    name: "getStream",
    stateMutability: "view",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: [
      { name: "employer", type: "address" },
      { name: "recipientHint", type: "address" },
      { name: "periodSeconds", type: "uint64" },
      { name: "startTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
      { name: "lastTickTime", type: "uint64" },
      { name: "cyclesPaid", type: "uint64" },
      { name: "paused", type: "bool" },
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
  {
    type: "function",
    name: "streamsByRecipient",
    stateMutability: "view",
    inputs: [{ name: "recipient", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "pendingCycles",
    stateMutability: "view",
    inputs: [{ name: "streamId", type: "uint256" }],
    outputs: [{ name: "", type: "uint64" }],
  },
  {
    type: "event",
    name: "StreamCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "streamId", type: "uint256" },
      { indexed: true, name: "employer", type: "address" },
      { indexed: true, name: "recipientHint", type: "address" },
      { indexed: false, name: "periodSeconds", type: "uint64" },
      { indexed: false, name: "startTime", type: "uint64" },
      { indexed: false, name: "endTime", type: "uint64" },
    ],
  },
  {
    type: "event",
    name: "CycleSettled",
    anonymous: false,
    inputs: [
      { indexed: true, name: "streamId", type: "uint256" },
      { indexed: true, name: "escrowId", type: "uint256" },
      { indexed: false, name: "cycleIndex", type: "uint64" },
      { indexed: false, name: "settledAt", type: "uint64" },
    ],
  },
] as const;

// ─── Reineira ConfidentialUSDC (cUSDC) ABI — minimal ─────────────────────
// NOTE: Reineira FHERC20 uses the OPERATOR model. Standard ERC-20 approve(),
// transfer(), transferFrom() ALL REVERT. Use setOperator(spender, expiry) instead.
export const REINEIRA_CUSDC_ABI = [
  {
    type: "function",
    name: "setOperator",
    stateMutability: "nonpayable",
    inputs: [
      { name: "operator", type: "address" },
      { name: "until", type: "uint48" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "isOperator",
    stateMutability: "view",
    inputs: [
      { name: "holder", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "holder", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], // euint64 handle
  },
  {
    type: "function",
    name: "confidentialBalanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }], // euint64 handle
  },
  {
    type: "function",
    name: "wrap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }, // plaintext USDC in
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "unwrap",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }, // euint64 handle
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "confidentialTransfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "amount", type: "uint256" }, // euint64 handle
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  // InEuint64-accepting overload (selector 0xa794ee95) — for EOA callers
  {
    type: "function",
    name: "confidentialTransfer",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      {
        name: "amount",
        type: "tuple",
        components: [...InEuint64Components],
      },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ─── ObscuraConfidentialEscrow ABI ──────────────────────────────────────
// Our own escrow contract (replaces broken Reineira proxy). Uses the
// uint256-handle cUSDC overloads (0xca49d7cd inbound, 0xfe3f670d outbound)
// which are confirmed present on the deployed cUSDC bytecode.
export const OBSCURA_CONFIDENTIAL_ESCROW_ABI = [
  {
    type: "function",
    name: "createWithExpiry",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_encOwner", type: "tuple", components: [...InEaddressComponents] },
      { name: "_encAmount", type: "tuple", components: [...InEuint64Components] },
      { name: "_resolver", type: "address" },
      { name: "_resolverData", type: "bytes" },
      { name: "_expiryBlock", type: "uint256" },
    ],
    outputs: [{ name: "escrowId", type: "uint256" }],
  },
  {
    type: "function",
    name: "createBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_encOwners", type: "tuple[]", components: [...InEaddressComponents] },
      { name: "_encAmounts", type: "tuple[]", components: [...InEuint64Components] },
      { name: "_resolver", type: "address" },
      { name: "_resolverData", type: "bytes" },
      { name: "_expiryBlock", type: "uint256" },
    ],
    outputs: [{ name: "ids", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "fund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_escrowId", type: "uint256" },
      { name: "_encPayment", type: "tuple", components: [...InEuint64Components] },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "redeem",
    stateMutability: "nonpayable",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "refund",
    stateMutability: "nonpayable",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "exists",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isCancelled",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isRefunded",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "isExpired",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getExpiryBlock",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getCreator",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getResolver",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "getRedeemAmount",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "event",
    name: "EscrowCreated",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "resolver", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EscrowFunded",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EscrowRedeemed",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "caller", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EscrowCancelled",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EscrowRefunded",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "caller", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "EscrowExpirySet",
    inputs: [
      { name: "escrowId", type: "uint256", indexed: true },
      { name: "expiryBlock", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
] as const;

// ─── ObscuraInvoice ABI (Phase B1) ──────────────────────────────────────
// Confidential invoice contract. Creator publishes encrypted billed amount;
// payer pays via cUSDC.confidentialTransfer + invoice.recordPayment.
export const OBSCURA_INVOICE_ABI = [
  {
    type: "function",
    name: "create",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_encAmount", type: "tuple", components: [...InEuint64Components] },
      { name: "_memoHash", type: "bytes32" },
      { name: "_expiryBlock", type: "uint256" },
    ],
    outputs: [{ name: "invoiceId", type: "uint256" }],
  },
  {
    type: "function",
    name: "recordPayment",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_invoiceId", type: "uint256" },
      { name: "_encPayment", type: "tuple", components: [...InEuint64Components] },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "cancel",
    stateMutability: "nonpayable",
    inputs: [{ name: "_invoiceId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "exists",
    stateMutability: "view",
    inputs: [{ name: "_invoiceId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getCreator",
    stateMutability: "view",
    inputs: [{ name: "_invoiceId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "isCancelled",
    stateMutability: "view",
    inputs: [{ name: "_invoiceId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "getExpiryBlock",
    stateMutability: "view",
    inputs: [{ name: "_invoiceId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "getMemoHash",
    stateMutability: "view",
    inputs: [{ name: "_invoiceId", type: "uint256" }],
    outputs: [{ name: "", type: "bytes32" }],
  },
  {
    type: "event",
    name: "InvoiceCreated",
    inputs: [
      { name: "invoiceId", type: "uint256", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "memoHash", type: "bytes32", indexed: false },
      { name: "expiryBlock", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "InvoicePaid",
    inputs: [
      { name: "invoiceId", type: "uint256", indexed: true },
      { name: "payer", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "event",
    name: "InvoiceCancelled",
    inputs: [
      { name: "invoiceId", type: "uint256", indexed: true },
    ],
    anonymous: false,
  },
  // Phase B3 — selective disclosure
  {
    type: "function",
    name: "grantAuditor",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_invoiceId", type: "uint256" },
      { name: "_auditor", type: "address" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getAuditors",
    stateMutability: "view",
    inputs: [{ name: "_invoiceId", type: "uint256" }],
    outputs: [{ name: "", type: "address[]" }],
  },
  {
    type: "event",
    name: "AuditorGranted",
    inputs: [
      { name: "invoiceId", type: "uint256", indexed: true },
      { name: "auditor", type: "address", indexed: true },
    ],
    anonymous: false,
  },
] as const;

// ─── Reineira ConfidentialEscrow ABI — minimal (LEGACY / DEPRECATED) ────
/** @deprecated See OBSCURA_CONFIDENTIAL_ESCROW_ABI. Retained for read-only
 *  legacy lookups of escrows created against the broken Reineira proxy. */
export const REINEIRA_ESCROW_ABI = [
  {
    type: "function",
    name: "create",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "encryptedOwner",
        type: "tuple",
        components: [...InEaddressComponents],
      },
      {
        name: "encryptedAmount",
        type: "tuple",
        components: [...InEuint64Components],
      },
      { name: "resolver", type: "address" },
      { name: "resolverData", type: "bytes" },
    ],
    outputs: [{ name: "escrowId", type: "uint256" }],
  },
  {
    type: "function",
    name: "fund",
    stateMutability: "nonpayable",
    inputs: [
      { name: "escrowId", type: "uint256" },
      {
        name: "encryptedPayment",
        type: "tuple",
        components: [...InEuint64Components],
      },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "redeem",
    stateMutability: "nonpayable",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [],
  },
  {
    type: "function",
    name: "exists",
    stateMutability: "view",
    inputs: [{ name: "escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

// ─── Reineira ConfidentialCoverageManager ABI — minimal ─────────────────
export const REINEIRA_COVERAGE_MANAGER_ABI = [
  {
    type: "function",
    name: "purchaseCoverage",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "encryptedHolder",
        type: "tuple",
        components: [...InEaddressComponents],
      },
      { name: "pool", type: "address" },
      { name: "policy", type: "address" },
      { name: "escrowId", type: "uint256" },
      {
        name: "encryptedCoverageAmount",
        type: "tuple",
        components: [...InEuint64Components],
      },
      { name: "coverageExpiry", type: "uint256" },
      { name: "policyData", type: "bytes" },
      { name: "riskProof", type: "bytes" },
    ],
    outputs: [{ name: "coverageId", type: "uint256" }],
  },
  {
    type: "function",
    name: "dispute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "coverageId", type: "uint256" },
      { name: "disputeProof", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

// ─── USDC on Arbitrum Sepolia (underlying asset for cUSDC wrap) ─────────
export const USDC_ARB_SEPOLIA = "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d" as const;

// ─── Circle CCTP V1 TokenMessenger (Ethereum Sepolia, domain 0) ─────────
// Used by useCrossChainFund — the user signs depositForBurn on Sepolia.
// V2 (depositForBurnWithHook) is NOT deployed on Sepolia testnet.
export const CCTP_TOKEN_MESSENGER_SEPOLIA = "0x9f3B8679c73C2Fef8b59B4f3444d4e156fb70AA5" as const;
export const USDC_SEPOLIA = "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238" as const;
export const ARBITRUM_SEPOLIA_DOMAIN = 3 as const;

export const CCTP_TOKEN_MESSENGER_ABI = [
  {
    type: "function",
    name: "depositForBurn",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "destinationDomain", type: "uint32" },
      { name: "mintRecipient", type: "bytes32" },
      { name: "burnToken", type: "address" },
    ],
    outputs: [{ name: "_nonce", type: "uint64" }],
  },
] as const;

export const ERC20_APPROVE_ABI = [
  {
    type: "function",
    name: "approve",
    stateMutability: "nonpayable",
    inputs: [
      { name: "spender", type: "address" },
      { name: "amount", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ─── Reineira Insurance auxiliary contracts (set by operator via setupReineiraPool.ts) ──
export const REINEIRA_INSURANCE_POOL_ADDRESS = (import.meta.env
  .VITE_REINEIRA_INSURANCE_POOL_ADDRESS ?? "") as `0x${string}` | "";

export const REINEIRA_POLICY_REGISTRY_ABI = [
  {
    type: "function",
    name: "registerPolicy",
    stateMutability: "nonpayable",
    inputs: [{ name: "policy", type: "address" }],
    outputs: [{ name: "policyId", type: "uint256" }],
  },
  {
    type: "function",
    name: "isPolicy",
    stateMutability: "view",
    inputs: [{ name: "policy", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const REINEIRA_POOL_FACTORY_ABI = [
  {
    type: "function",
    name: "createPool",
    stateMutability: "nonpayable",
    inputs: [{ name: "cUSDC", type: "address" }],
    outputs: [
      { name: "poolId", type: "uint256" },
      { name: "pool", type: "address" },
    ],
  },
  {
    type: "function",
    name: "isPool",
    stateMutability: "view",
    inputs: [{ name: "pool", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "event",
    name: "PoolCreated",
    anonymous: false,
    inputs: [
      { indexed: true, name: "poolId", type: "uint256" },
      { indexed: true, name: "pool", type: "address" },
      { indexed: true, name: "underwriter", type: "address" },
      { indexed: false, name: "cUSDC", type: "address" },
    ],
  },
] as const;

export const REINEIRA_INSURANCE_POOL_ABI = [
  {
    type: "function",
    name: "addPolicy",
    stateMutability: "nonpayable",
    inputs: [{ name: "policy", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "isPolicy",
    stateMutability: "view",
    inputs: [{ name: "policy", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "stake",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "encryptedAmount",
        type: "tuple",
        components: [...InEuint64Components],
      },
    ],
    outputs: [{ name: "stakeId", type: "uint256" }],
  },
] as const;
