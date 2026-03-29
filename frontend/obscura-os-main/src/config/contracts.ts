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
    inputs: [{ indexed: true, name: "employee", type: "address" }],
    name: "EmployeePaid",
    type: "event",
  },
  // payEmployee(address, InEuint64)
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
  // getMyBalance() returns (euint64 → bytes32)
  {
    name: "getMyBalance",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
  },
  // grantAuditAccess(address)
  {
    name: "grantAuditAccess",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "_auditor", type: "address" }],
    outputs: [],
  },
  // getAggregateTotal() returns (euint64 → bytes32)
  {
    name: "getAggregateTotal",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "bytes32" }],
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
] as const;
