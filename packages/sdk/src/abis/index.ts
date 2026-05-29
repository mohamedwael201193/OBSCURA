/** Minimal ABI fragments for SDK v1 transaction builders and reads */

export const IN_EUINT64_COMPONENTS = [
  { name: "ctHash", type: "uint256" },
  { name: "securityZone", type: "uint8" },
  { name: "utype", type: "uint8" },
  { name: "signature", type: "bytes" },
] as const;

export const OC_USDC_PAY_ABI = [
  {
    name: "confidentialBalanceOf",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "shield",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "amount", type: "uint256" },
      { name: "encryptedAmount", type: "tuple", components: [...IN_EUINT64_COMPONENTS] },
    ],
    outputs: [],
  },
  {
    name: "unshield",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "encryptedAmount", type: "tuple", components: [...IN_EUINT64_COMPONENTS] },
    ],
    outputs: [],
  },
  {
    name: "confidentialTransfer",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "to", type: "address" },
      { name: "encryptedAmount", type: "tuple", components: [...IN_EUINT64_COMPONENTS] },
    ],
    outputs: [],
  },
] as const;

export const CREDIT_MARKET_ABI = [
  {
    name: "supplyCollateral",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "encryptedAmount", type: "tuple", components: [...IN_EUINT64_COMPONENTS] },
    ],
    outputs: [],
  },
  {
    name: "borrow",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "encryptedAmount", type: "tuple", components: [...IN_EUINT64_COMPONENTS] },
    ],
    outputs: [],
  },
  {
    name: "repay",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "encryptedAmount", type: "tuple", components: [...IN_EUINT64_COMPONENTS] },
    ],
    outputs: [],
  },
] as const;

export const OBSCURA_VOTE_ABI = [
  {
    name: "proposalCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    name: "getProposal",
    type: "function",
    stateMutability: "view",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "creator", type: "address" },
      { name: "title", type: "string" },
      { name: "description", type: "string" },
      { name: "options", type: "string[]" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
      { name: "finalized", type: "bool" },
      { name: "winningOption", type: "uint256" },
    ],
  },
  {
    name: "castVote",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "encryptedOption", type: "tuple", components: [...IN_EUINT64_COMPONENTS] },
    ],
    outputs: [],
  },
  {
    name: "delegate",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{ name: "delegatee", type: "address" }],
    outputs: [],
  },
] as const;
