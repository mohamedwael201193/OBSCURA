export const OBSCURA_PAY_ADDRESS = import.meta.env.VITE_OBSCURA_PAY_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_ESCROW_ADDRESS = import.meta.env.VITE_OBSCURA_ESCROW_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_CONDITION_RESOLVER_ADDRESS = import.meta.env.VITE_OBSCURA_CONDITION_RESOLVER_ADDRESS as `0x${string}` | undefined;

// InEuint64 tuple: { ctHash: uint256, securityZone: uint8, utype: uint8, signature: bytes }
const InEuint64Components = [
  { name: "ctHash", type: "uint256" },
  { name: "securityZone", type: "uint8" },
  { name: "utype", type: "uint8" },
  { name: "signature", type: "bytes" },
] as const;

export const OBSCURA_PAY_ABI = [
  // constructor
  { inputs: [], stateMutability: "nonpayable", type: "constructor" },
  // errors
  {
    inputs: [
      { name: "got", type: "uint8" },
      { name: "expected", type: "uint8" },
    ],
    name: "InvalidEncryptedInput",
    type: "error",
  },
  {
    inputs: [{ name: "value", type: "int32" }],
    name: "SecurityZoneOutOfBounds",
    type: "error",
  },
  // events
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "auditor", type: "address" }],
    name: "AuditAccessGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "employer", type: "address" },
      { indexed: true, name: "employee", type: "address" },
    ],
    name: "EmployeePaid",
    type: "event",
  },
  // payEmployee(address, InEuint64) â€” open to any wallet
  {
    name: "payEmployee",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_emp", type: "address" },
      { name: "_encSalary", type: "tuple", components: [...InEuint64Components] },
    ],
    outputs: [],
  },
  // batchPay(address[], InEuint64[])
  {
    name: "batchPay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_emps", type: "address[]" },
      { name: "_salaries", type: "tuple[]", components: [...InEuint64Components] },
    ],
    outputs: [],
  },
  // getMyBalance() returns (euint64 â†’ uint256 bigint)
  {
    name: "getMyBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // grantAuditAccess(address) â€” owner only
  {
    name: "grantAuditAccess",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_auditor", type: "address" }],
    outputs: [],
  },
  // getAggregateTotal() returns (euint64 â†’ uint256 bigint) â€” auditor/owner only
  {
    name: "getAggregateTotal",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getEmployees() returns (address[])
  {
    name: "getEmployees",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address[]" }],
  },
  // getEmployeeCount() returns (uint256)
  {
    name: "getEmployeeCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // owner() returns (address)
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // roles(address) returns (uint8)
  {
    name: "roles",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  // isEmployee(address) returns (bool)
  {
    name: "isEmployee",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "bool" }],
  },
  // employees(uint256) returns (address)
  {
    name: "employees",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  // grantRole(address, uint8) â€” owner only
  {
    name: "grantRole",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_user", type: "address" },
      { name: "_role", type: "uint8" },
    ],
    outputs: [],
  },
  // revokeRole(address) — owner only
  {
    name: "revokeRole",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [],
  },
  // ─── Payment History (v3) ─────────────────────────────────────────
  // getPaymentCount() returns (uint256)
  {
    name: "getPaymentCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getMyPaymentCount() returns (uint256)
  {
    name: "getMyPaymentCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getMyPaymentIndices(uint256, uint256) returns (uint256[])
  {
    name: "getMyPaymentIndices",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_offset", type: "uint256" },
      { name: "_limit", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  // getPaymentRecord(uint256) returns (address, address, uint256)
  {
    name: "getPaymentRecord",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_index", type: "uint256" }],
    outputs: [
      { name: "from_", type: "address" },
      { name: "to_", type: "address" },
      { name: "timestamp_", type: "uint256" },
    ],
  },
] as const;

export const OBSCURA_TOKEN_ADDRESS = import.meta.env.VITE_OBSCURA_TOKEN_ADDRESS as `0x${string}` | undefined;

export const OBSCURA_TOKEN_ABI = [
  // mint(address, InEuint64) â€” owner only
  {
    name: "mint",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_to", type: "address" },
      {
        name: "_amount",
        type: "tuple",
        components: [...InEuint64Components],
      },
    ],
    outputs: [],
  },
  // claimDailyTokens() â€” public, 100 $OBS per 24h
  {
    name: "claimDailyTokens",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // nextClaimIn() returns seconds until next allowed claim (0 = can claim now)
  {
    name: "nextClaimIn",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // lastClaim(address) returns (uint256)
  {
    name: "lastClaim",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // DAILY_CLAIM_AMOUNT returns (uint64)
  {
    name: "DAILY_CLAIM_AMOUNT",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint64" }],
  },
  // CLAIM_COOLDOWN returns (uint256)
  {
    name: "CLAIM_COOLDOWN",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // name() returns (string)
  {
    name: "name",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  // symbol() returns (string)
  {
    name: "symbol",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
  },
  // owner() returns (address)
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // balanceOf() returns (euint64 â†’ uint256 bigint) â€” caller reads their own encrypted balance handle
  {
    name: "balanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // totalMinted() returns (uint256)
  {
    name: "totalMinted",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // totalClaims() returns (uint256)
  {
    name: "totalClaims",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // Mint event
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "to", type: "address" }],
    name: "Mint",
    type: "event",
  },
  // DailyClaim event
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "claimant", type: "address" }],
    name: "DailyClaim",
    type: "event",
  },
  // ConfidentialTransfer event
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "from", type: "address" },
      { indexed: true, name: "to", type: "address" },
    ],
    name: "ConfidentialTransfer",
    type: "event",
  },
  // ─── Operator Model (v3) ──────────────────────────────────────────
  // confidentialTransfer(address, InEuint64) — direct P2P transfer
  {
    name: "confidentialTransfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_to", type: "address" },
      { name: "_amount", type: "tuple", components: [...InEuint64Components] },
    ],
    outputs: [],
  },
  // setOperator(address, uint256) — approve operator with expiry
  {
    name: "setOperator",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_operator", type: "address" },
      { name: "_expiry", type: "uint256" },
    ],
    outputs: [],
  },
  // isOperator(address, address) returns (bool)
  {
    name: "isOperator",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_operator", type: "address" },
      { name: "_holder", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  // getOperatorExpiry(address, address) returns (uint256)
  {
    name: "getOperatorExpiry",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_operator", type: "address" },
      { name: "_holder", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  // confidentialTransferFrom(address, address, InEuint64)
  {
    name: "confidentialTransferFrom",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_from", type: "address" },
      { name: "_to", type: "address" },
      { name: "_amount", type: "tuple", components: [...InEuint64Components] },
    ],
    outputs: [],
  },
  // OperatorSet event
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "holder", type: "address" },
      { indexed: true, name: "operator", type: "address" },
      { indexed: false, name: "expiry", type: "uint256" },
    ],
    name: "OperatorSet",
    type: "event",
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// ObscuraEscrow ABI
// ═══════════════════════════════════════════════════════════════════════

const InEaddressComponents = [
  { name: "ctHash", type: "uint256" },
  { name: "securityZone", type: "uint8" },
  { name: "utype", type: "uint8" },
  { name: "signature", type: "bytes" },
] as const;

export const OBSCURA_ESCROW_ABI = [
  // createEscrow(InEaddress, InEuint64, address, bytes) returns (uint256)
  {
    name: "createEscrow",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_encOwner", type: "tuple", components: [...InEaddressComponents] },
      { name: "_encAmount", type: "tuple", components: [...InEuint64Components] },
      { name: "_resolver", type: "address" },
      { name: "_resolverData", type: "bytes" },
    ],
    outputs: [{ name: "escrowId", type: "uint256" }],
  },
  // fundEscrow(uint256, InEuint64)
  {
    name: "fundEscrow",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_escrowId", type: "uint256" },
      { name: "_encPayment", type: "tuple", components: [...InEuint64Components] },
    ],
    outputs: [],
  },
  // redeemEscrow(uint256)
  {
    name: "redeemEscrow",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [],
  },
  // cancelEscrow(uint256)
  {
    name: "cancelEscrow",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [],
  },
  // exists(uint256) returns (bool)
  {
    name: "exists",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  // getEscrowAmount(uint256) returns (euint64 → uint256)
  {
    name: "getEscrowAmount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getEscrowPaidAmount(uint256) returns (euint64 → uint256)
  {
    name: "getEscrowPaidAmount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getEscrowRedeemed(uint256) returns (ebool → uint256)
  {
    name: "getEscrowRedeemed",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getEscrowCreator(uint256) returns (address)
  {
    name: "getEscrowCreator",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  // getConditionResolver(uint256) returns (address)
  {
    name: "getConditionResolver",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  // getEscrowCount() returns (uint256)
  {
    name: "getEscrowCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getRedeemAmount(uint256) returns (euint64 → uint256)
  {
    name: "getRedeemAmount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // nextEscrowId() returns (uint256)
  {
    name: "nextEscrowId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // tokenContract() returns (address)
  {
    name: "tokenContract",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
  // Events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "escrowId", type: "uint256" },
      { indexed: true, name: "creator", type: "address" },
    ],
    name: "EscrowCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "escrowId", type: "uint256" },
      { indexed: true, name: "payer", type: "address" },
    ],
    name: "EscrowFunded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "escrowId", type: "uint256" }],
    name: "EscrowRedeemed",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "escrowId", type: "uint256" }],
    name: "EscrowCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "escrowId", type: "uint256" },
      { indexed: true, name: "resolver", type: "address" },
    ],
    name: "ConditionSet",
    type: "event",
  },
] as const;

// ═══════════════════════════════════════════════════════════════════════
// ObscuraConditionResolver ABI
// ═══════════════════════════════════════════════════════════════════════

export const OBSCURA_CONDITION_RESOLVER_ABI = [
  // approve(uint256) — approver releases escrow
  {
    name: "approve",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [],
  },
  // getCondition(uint256) returns (uint8, uint256, address, bool)
  {
    name: "getCondition",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [
      { name: "cType", type: "uint8" },
      { name: "deadline", type: "uint256" },
      { name: "approver", type: "address" },
      { name: "approved", type: "bool" },
    ],
  },
  // isConditionMet(uint256) returns (bool)
  {
    name: "isConditionMet",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  // escrowContract() returns (address)
  {
    name: "escrowContract",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;
