// ─── ERC-4337 v0.7 Constants ──────────────────────────────────────────────────
export const ENTRY_POINT_V07 = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;
export const RELAY_URL = import.meta.env.VITE_RELAY_URL ?? "http://localhost:3701";

// ─── Contract addresses ───────────────────────────────────────────────────────
export const SMART_ACCOUNT_FACTORY_ADDRESS = (
  import.meta.env.VITE_SMART_ACCOUNT_FACTORY_ADDRESS ?? ""
) as `0x${string}`;

export const PAYMASTER_ADDRESS = (
  import.meta.env.VITE_PAYMASTER_ADDRESS ?? ""
) as `0x${string}`;

// ─── Smart Account Factory ABI (EIP-1167 clone factory) ───────────────────────
export const SMART_ACCOUNT_FACTORY_ABI = [
  {
    type: "event",
    name: "AccountCreated",
    inputs: [
      { name: "account",   type: "address", indexed: true },
      { name: "owner",     type: "address", indexed: true },
      { name: "passkeyX", type: "uint256", indexed: false },
      { name: "passkeyY", type: "uint256", indexed: false },
      { name: "salt",     type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "IMPLEMENTATION",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "createAccount",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_owner",    type: "address" },
      { name: "_passkeyX", type: "uint256" },
      { name: "_passkeyY", type: "uint256" },
      { name: "_salt",     type: "uint256" },
    ],
    outputs: [{ name: "account", type: "address" }],
  },
  {
    type: "function",
    name: "getAccountAddress",
    stateMutability: "view",
    inputs: [
      { name: "_owner",    type: "address" },
      { name: "_passkeyX", type: "uint256" },
      { name: "_passkeyY", type: "uint256" },
      { name: "_salt",     type: "uint256" },
    ],
    outputs: [{ name: "", type: "address" }],
  },
] as const;

// ─── Smart Account ABI (relevant subset for frontend calls) ───────────────────
export const SMART_ACCOUNT_ABI = [
  {
    type: "function",
    name: "owner",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "address" }],
  },
  {
    type: "function",
    name: "passkeyX",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "execute",
    stateMutability: "nonpayable",
    inputs: [
      { name: "target", type: "address" },
      { name: "value",  type: "uint256" },
      { name: "data",   type: "bytes" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "executeBatch",
    stateMutability: "nonpayable",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values",  type: "uint256[]" },
      { name: "datas",   type: "bytes[]" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "initialize",
    stateMutability: "nonpayable",
    inputs: [
      { name: "_owner",    type: "address" },
      { name: "_passkeyX", type: "uint256" },
      { name: "_passkeyY", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "getNonce",
    stateMutability: "view",
    inputs: [],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "isValidSignature",
    stateMutability: "view",
    inputs: [
      { name: "hash", type: "bytes32" },
      { name: "sig",  type: "bytes" },
    ],
    outputs: [{ type: "bytes4" }],
  },
] as const;

// ─── EntryPoint v0.7 ABI (minimal subset for nonce query) ─────────────────────
export const ENTRY_POINT_ABI = [
  {
    type: "function",
    name: "getNonce",
    stateMutability: "view",
    inputs: [
      { name: "sender", type: "address" },
      { name: "key",    type: "uint192" },
    ],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "depositTo",
    stateMutability: "payable",
    inputs: [{ name: "account", type: "address" }],
    outputs: [],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
] as const;

// ─── Paymaster ABI (minimal subset) ───────────────────────────────────────────
export const PAYMASTER_ABI = [
  {
    type: "function",
    name: "userOpsRemaining",
    stateMutability: "view",
    inputs: [{ name: "user", type: "address" }],
    outputs: [{ type: "uint256" }],
  },
  {
    type: "function",
    name: "whitelistedTargets",
    stateMutability: "view",
    inputs: [{ name: "target", type: "address" }],
    outputs: [{ type: "bool" }],
  },
] as const;
