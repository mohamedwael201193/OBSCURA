export const OBSCURA_PAY_ADDRESS = import.meta.env.VITE_OBSCURA_PAY_ADDRESS as `0x${string}` | undefined;

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
  // revokeRole(address) â€” owner only
  {
    name: "revokeRole",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_user", type: "address" }],
    outputs: [],
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
] as const;
