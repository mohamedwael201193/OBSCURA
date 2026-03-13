export const OBSCURA_PAY_ADDRESS = import.meta.env.VITE_OBSCURA_PAY_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_ESCROW_ADDRESS = import.meta.env.VITE_OBSCURA_ESCROW_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_CONDITION_RESOLVER_ADDRESS = import.meta.env.VITE_OBSCURA_CONDITION_RESOLVER_ADDRESS as `0x${string}` | undefined;
export const OBSCURA_VOTE_ADDRESS = (import.meta.env.VITE_OBSCURA_VOTE_ADDRESS ?? "0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730") as `0x${string}`;

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
  // payEmployee(address, InEuint64) — open to any wallet
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
  // getMyBalance() returns (euint64 → uint256 bigint)
  {
    name: "getMyBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // grantAuditAccess(address) — owner only
  {
    name: "grantAuditAccess",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_auditor", type: "address" }],
    outputs: [],
  },
  // getAggregateTotal() returns (euint64 → uint256 bigint) — auditor/owner only
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
  // grantRole(address, uint8) — owner only
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
  // revokeRole(address) � owner only
  {
    name: "revokeRole",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [],
  },
  // --- Payment History (v3) -----------------------------------------
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
  // mint(address, InEuint64) — owner only
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
  // claimDailyTokens() — public, 100 $OBS per 24h
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
  // balanceOf() returns (euint64 → uint256 bigint) — caller reads their own encrypted balance handle
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
  // --- Operator Model (v3) ------------------------------------------
  // confidentialTransfer(address, InEuint64) � direct P2P transfer
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
  // setOperator(address, uint256) � approve operator with expiry
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

// -----------------------------------------------------------------------
// ObscuraEscrow ABI
// -----------------------------------------------------------------------

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
  // getEscrowAmount(uint256) returns (euint64 ? uint256)
  {
    name: "getEscrowAmount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getEscrowPaidAmount(uint256) returns (euint64 ? uint256)
  {
    name: "getEscrowPaidAmount",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_escrowId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getEscrowRedeemed(uint256) returns (ebool ? uint256)
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
  // getRedeemAmount(uint256) returns (euint64 ? uint256)
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

// -----------------------------------------------------------------------
// ObscuraConditionResolver ABI
// -----------------------------------------------------------------------

export const OBSCURA_CONDITION_RESOLVER_ABI = [
  // approve(uint256) � approver releases escrow
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

// -----------------------------------------------------------------------
// ObscuraVote ABI � Wave 2 (v2: multi-option, categories, quorum, cancel/extend, verify-my-vote)
// -----------------------------------------------------------------------

export const OBSCURA_VOTE_ABI = [
  // constructor(address)
  { inputs: [{ name: "_obsToken", type: "address" }], stateMutability: "nonpayable", type: "constructor" },
  // events
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "proposalId", type: "uint256" },
      { indexed: false, name: "title", type: "string" },
      { indexed: false, name: "numOptions", type: "uint8" },
      { indexed: false, name: "deadline", type: "uint256" },
      { indexed: false, name: "category", type: "uint8" },
    ],
    name: "ProposalCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "proposalId", type: "uint256" },
      { indexed: true, name: "voter", type: "address" },
    ],
    name: "VoteCast",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "proposalId", type: "uint256" },
      { indexed: true, name: "voter", type: "address" },
    ],
    name: "VoteChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "proposalId", type: "uint256" }],
    name: "VoteFinalized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "proposalId", type: "uint256" }],
    name: "ProposalCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "proposalId", type: "uint256" },
      { indexed: false, name: "newDeadline", type: "uint256" },
    ],
    name: "DeadlineExtended",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "delegator", type: "address" },
      { indexed: true, name: "delegatee", type: "address" },
    ],
    name: "DelegateSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "delegator", type: "address" },
      { indexed: true, name: "formerDelegatee", type: "address" },
    ],
    name: "DelegateRemoved",
    type: "event",
  },
  // createProposal(string, string, string[], uint256, uint256, uint8) returns (uint256)
  {
    name: "createProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_title", type: "string" },
      { name: "_description", type: "string" },
      { name: "_options", type: "string[]" },
      { name: "_deadline", type: "uint256" },
      { name: "_quorum", type: "uint256" },
      { name: "_category", type: "uint8" },
    ],
    outputs: [{ name: "proposalId", type: "uint256" }],
  },
  // castVote(uint256, InEuint64)
  {
    name: "castVote",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_proposalId", type: "uint256" },
      { name: "_encVote", type: "tuple", components: [...InEuint64Components] },
    ],
    outputs: [],
  },
  // cancelProposal(uint256)
  {
    name: "cancelProposal",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [],
  },
  // extendDeadline(uint256, uint256)
  {
    name: "extendDeadline",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_proposalId", type: "uint256" },
      { name: "_newDeadline", type: "uint256" },
    ],
    outputs: [],
  },
  // finalizeVote(uint256)
  {
    name: "finalizeVote",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [],
  },
  // getProposal(uint256) returns (string, string, uint8, uint256, uint256, uint8, uint256, bool, bool, bool, address)
  {
    name: "getProposal",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "numOptions", type: "uint8" },
      { name: "deadline", type: "uint256" },
      { name: "quorum", type: "uint256" },
      { name: "category", type: "uint8" },
      { name: "totalVoters", type: "uint256" },
      { name: "isFinalized", type: "bool" },
      { name: "isCancelled", type: "bool" },
      { name: "exists", type: "bool" },
      { name: "creator", type: "address" },
    ],
  },
  // getProposalOptions(uint256) returns (string[])
  {
    name: "getProposalOptions",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "string[]" }],
  },
  // getTally(uint256, uint8) returns (uint256)
  {
    name: "getTally",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_proposalId", type: "uint256" },
      { name: "_optionIndex", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getProposalCount() returns (uint256)
  {
    name: "getProposalCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getMyVote(uint256) returns (uint256) � verify my vote
  {
    name: "getMyVote",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // hasVoted(uint256, address) returns (bool)
  {
    name: "hasVoted",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  // voterParticipation(address) returns (uint256)
  {
    name: "voterParticipation",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // MAX_OPTIONS() returns (uint8)
  {
    name: "MAX_OPTIONS",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
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
  // grantRole(address, uint8)
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
  // revokeRole(address)
  {
    name: "revokeRole",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [],
  },
  // nextProposalId() returns (uint256)
  {
    name: "nextProposalId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  // delegate(address)
  {
    name: "delegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_to", type: "address" }],
    outputs: [],
  },
  // undelegate()
  {
    name: "undelegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },
  // delegateTo(address) returns (address)
  {
    name: "delegateTo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },
  // delegationWeight(address) returns (uint256)
  {
    name: "delegationWeight",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  // getVoteWeight(address) returns (uint256)
  {
    name: "getVoteWeight",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_voter", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

// ─── ObscuraTreasury ─────────────────────────────────────────────────────────
export const OBSCURA_TREASURY_ADDRESS = (
  import.meta.env.VITE_OBSCURA_TREASURY_ADDRESS ?? "0x89252ee3f920978EEfDB650760fe56BA1Ede8c08"
) as `0x${string}`;

export const OBSCURA_TREASURY_ABI = [
  { inputs: [{ name: "_voteContract", type: "address" }], stateMutability: "nonpayable", type: "constructor" },
  // events
  { anonymous: false, inputs: [{ indexed: true, name: "from", type: "address" }, { indexed: false, name: "amount", type: "uint256" }], name: "FundsReceived", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "proposalId", type: "uint256" }, { indexed: true, name: "recipient", type: "address" }], name: "SpendAttached", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "proposalId", type: "uint256" }, { indexed: false, name: "timelockEnds", type: "uint256" }], name: "FinalizationRecorded", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "proposalId", type: "uint256" }, { indexed: true, name: "recipient", type: "address" }, { indexed: false, name: "amountWei", type: "uint256" }], name: "SpendExecuted", type: "event" },
  // write functions
  { name: "deposit", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  {
    name: "attachSpend",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_proposalId", type: "uint256" },
      { name: "_recipient", type: "address" },
      { name: "_amountGwei", type: "uint256" },
      { name: "_encAmountGwei", type: "tuple", components: [...InEuint64Components] },
    ],
    outputs: [],
  },
  { name: "recordFinalization", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_proposalId", type: "uint256" }], outputs: [] },
  {
    name: "executeSpend",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [],
  },
  // view functions
  {
    name: "getSpendRequest",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_proposalId", type: "uint256" }],
    outputs: [
      { name: "recipient", type: "address" },
      { name: "executed", type: "bool" },
      { name: "exists", type: "bool" },
      { name: "timelockEnds", type: "uint256" },
      { name: "amountGwei", type: "uint256" },
    ],
  },
  { name: "treasuryBalance", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "timelockDuration", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "setTimelockDuration", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_seconds", type: "uint256" }], outputs: [] },
  { name: "setVoteContract", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_newVoteContract", type: "address" }], outputs: [] },
  { anonymous: false, inputs: [{ indexed: false, name: "oldDuration", type: "uint256" }, { indexed: false, name: "newDuration", type: "uint256" }], name: "TimelockDurationUpdated", type: "event" },
  { name: "voteContract", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "owner", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "roles", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "uint8" }] },
] as const;

// ─── ObscuraRewards ──────────────────────────────────────────────────────────
export const OBSCURA_REWARDS_ADDRESS = (
  import.meta.env.VITE_OBSCURA_REWARDS_ADDRESS ?? "0x435ea117404553A6868fbe728A7A284FCEd15BC2"
) as `0x${string}`;

export const OBSCURA_REWARDS_ABI = [
  { inputs: [{ name: "_voteContract", type: "address" }], stateMutability: "nonpayable", type: "constructor" },
  // events
  { anonymous: false, inputs: [{ indexed: true, name: "proposalId", type: "uint256" }, { indexed: true, name: "voter", type: "address" }, { indexed: false, name: "rewardGwei", type: "uint64" }], name: "RewardAccrued", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "voter", type: "address" }], name: "WithdrawalRequested", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "voter", type: "address" }, { indexed: false, name: "amountWei", type: "uint256" }], name: "RewardWithdrawn", type: "event" },
  { anonymous: false, inputs: [{ indexed: true, name: "from", type: "address" }, { indexed: false, name: "amountWei", type: "uint256" }], name: "RewardsFunded", type: "event" },
  // write
  { name: "fundRewards", type: "function", stateMutability: "payable", inputs: [], outputs: [] },
  { name: "accrueReward", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_proposalId", type: "uint256" }], outputs: [] },
  { name: "requestWithdrawal", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "withdraw", type: "function", stateMutability: "nonpayable", inputs: [], outputs: [] },
  { name: "setVoteContract", type: "function", stateMutability: "nonpayable", inputs: [{ name: "_newVoteContract", type: "address" }], outputs: [] },
  // view
  { name: "rewardAccrued", type: "function", stateMutability: "view", inputs: [{ name: "", type: "uint256" }, { name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "withdrawalRequested", type: "function", stateMutability: "view", inputs: [{ name: "", type: "address" }], outputs: [{ name: "", type: "bool" }] },
  { name: "pendingRewardWei", type: "function", stateMutability: "view", inputs: [{ name: "_voter", type: "address" }], outputs: [{ name: "", type: "uint256" }] },
  { name: "rewardPoolBalance", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { name: "REWARD_PER_VOTE_GWEI", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "uint64" }] },
  { name: "voteContract", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
  { name: "owner", type: "function", stateMutability: "view", inputs: [], outputs: [{ name: "", type: "address" }] },
] as const;

// -----------------------------------------------------------------------
// ObscuraElection — Wave 4 (FHE candidate elections)
// -----------------------------------------------------------------------

export const OBSCURA_ELECTION_ADDRESS = (
  import.meta.env.VITE_OBSCURA_ELECTION_ADDRESS ?? "0x0000000000000000000000000000000000000000"
) as `0x${string}`;

export const OBSCURA_ELECTION_ABI = [
  // constructor
  { inputs: [{ name: "_obsToken", type: "address" }], stateMutability: "nonpayable", type: "constructor" },

  // ── Events ──
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "electionId", type: "uint256" },
      { indexed: false, name: "title", type: "string" },
      { indexed: false, name: "registrationDeadline", type: "uint256" },
      { indexed: false, name: "votingDeadline", type: "uint256" },
      { indexed: false, name: "electionType", type: "uint8" },
      { indexed: false, name: "seats", type: "uint8" },
    ],
    name: "ElectionCreated",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "electionId", type: "uint256" },
      { indexed: false, name: "candidateIndex", type: "uint8" },
      { indexed: true, name: "candidateAddr", type: "address" },
      { indexed: false, name: "name", type: "string" },
    ],
    name: "CandidateRegistered",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "electionId", type: "uint256" },
      { indexed: false, name: "candidateIndex", type: "uint8" },
    ],
    name: "CandidateApproved",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "electionId", type: "uint256" },
      { indexed: true, name: "voter", type: "address" },
    ],
    name: "BallotCast",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "electionId", type: "uint256" },
      { indexed: true, name: "voter", type: "address" },
    ],
    name: "BallotChanged",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "electionId", type: "uint256" }],
    name: "ElectionFinalized",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [{ indexed: true, name: "electionId", type: "uint256" }],
    name: "ElectionCancelled",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "delegator", type: "address" },
      { indexed: true, name: "delegatee", type: "address" },
    ],
    name: "ElectionDelegateSet",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: "delegator", type: "address" },
      { indexed: true, name: "formerDelegatee", type: "address" },
    ],
    name: "ElectionDelegateRemoved",
    type: "event",
  },

  // ── Write functions ──

  // createElection(string,string,uint256,uint256,uint256,uint8,uint8,bool) returns (uint256)
  {
    name: "createElection",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_title", type: "string" },
      { name: "_description", type: "string" },
      { name: "_regDeadline", type: "uint256" },
      { name: "_voteDeadline", type: "uint256" },
      { name: "_quorum", type: "uint256" },
      { name: "_seats", type: "uint8" },
      { name: "_electionType", type: "uint8" },
      { name: "_openRegistration", type: "bool" },
    ],
    outputs: [{ name: "electionId", type: "uint256" }],
  },

  // registerCandidate(uint256,string,string)
  {
    name: "registerCandidate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_electionId", type: "uint256" },
      { name: "_name", type: "string" },
      { name: "_manifesto", type: "string" },
    ],
    outputs: [],
  },

  // addCandidate(uint256,address,string,string)
  {
    name: "addCandidate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_electionId", type: "uint256" },
      { name: "_candidateAddr", type: "address" },
      { name: "_name", type: "string" },
      { name: "_manifesto", type: "string" },
    ],
    outputs: [],
  },

  // approveCandidate(uint256,uint8)
  {
    name: "approveCandidate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_electionId", type: "uint256" },
      { name: "_candidateIdx", type: "uint8" },
    ],
    outputs: [],
  },

  // castBallot(uint256, InEuint64)
  {
    name: "castBallot",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_electionId", type: "uint256" },
      { name: "_encBallot", type: "tuple", components: [...InEuint64Components] },
    ],
    outputs: [],
  },

  // finalizeElection(uint256)
  {
    name: "finalizeElection",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_electionId", type: "uint256" }],
    outputs: [],
  },

  // cancelElection(uint256)
  {
    name: "cancelElection",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_electionId", type: "uint256" }],
    outputs: [],
  },

  // delegate(address)
  {
    name: "delegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_to", type: "address" }],
    outputs: [],
  },

  // undelegate()
  {
    name: "undelegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [],
    outputs: [],
  },

  // ── View functions ──

  // getElection(uint256) returns (title, description, regDeadline, voteDeadline, quorum,
  //   numCandidates, totalRegistered, seats, electionType, totalVoters,
  //   isFinalized, isCancelled, openRegistration, exists, creator)
  {
    name: "getElection",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_electionId", type: "uint256" }],
    outputs: [
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "registrationDeadline", type: "uint256" },
      { name: "votingDeadline", type: "uint256" },
      { name: "quorum", type: "uint256" },
      { name: "numCandidates", type: "uint8" },
      { name: "totalRegistered", type: "uint8" },
      { name: "seats", type: "uint8" },
      { name: "electionType", type: "uint8" },
      { name: "totalVoters", type: "uint256" },
      { name: "isFinalized", type: "bool" },
      { name: "isCancelled", type: "bool" },
      { name: "openRegistration", type: "bool" },
      { name: "exists", type: "bool" },
      { name: "creator", type: "address" },
    ],
  },

  // getCandidate(uint256,uint8) returns (name,manifesto,candidateAddr,approved,exists)
  {
    name: "getCandidate",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_electionId", type: "uint256" },
      { name: "_candidateIdx", type: "uint8" },
    ],
    outputs: [
      { name: "name", type: "string" },
      { name: "manifesto", type: "string" },
      { name: "candidateAddr", type: "address" },
      { name: "approved", type: "bool" },
      { name: "exists", type: "bool" },
    ],
  },

  // getTallyHandle(uint256,uint8) returns (uint256)
  {
    name: "getTallyHandle",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "_electionId", type: "uint256" },
      { name: "_candidateIdx", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },

  // getMyBallot(uint256) returns (uint256)
  {
    name: "getMyBallot",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_electionId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },

  // getElectionCount() returns (uint256)
  {
    name: "getElectionCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // getElectionStatus(uint256) returns (uint8)
  {
    name: "getElectionStatus",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "_electionId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },

  // hasVoted(uint256,address) returns (bool)
  {
    name: "hasVoted",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },

  // isRegistered(uint256,address) returns (bool)
  {
    name: "isRegistered",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },

  // candidateIndexOf(uint256,address) returns (uint8)
  {
    name: "candidateIndexOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "", type: "uint256" },
      { name: "", type: "address" },
    ],
    outputs: [{ name: "", type: "uint8" }],
  },

  // delegateTo(address) returns (address)
  {
    name: "delegateTo",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "address" }],
  },

  // delegationWeight(address) returns (uint256)
  {
    name: "delegationWeight",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },

  // nextElectionId() returns (uint256)
  {
    name: "nextElectionId",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },

  // MAX_CANDIDATES() returns (uint8)
  {
    name: "MAX_CANDIDATES",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint8" }],
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
] as const;

