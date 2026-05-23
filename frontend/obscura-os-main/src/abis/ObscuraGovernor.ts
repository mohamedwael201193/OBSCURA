/**
 * Minimal ABI for ObscuraGovernor (OZ Governor wrapper over Vote V5).
 * Covers read + write surface required by the Governance UI.
 *
 * Voter weight is sourced from ObscuraVote.voterParticipation(account) via
 * the override in ObscuraGovernor._getVotes — the ballot itself stays
 * encrypted in the Vote contract; Governor only sees a public participation
 * count, never the user's actual selections.
 */
export const OBSCURA_GOVERNOR_ABI = [
  // ── Events ──────────────────────────────────────────────────────────────
  {
    anonymous: false,
    type: "event",
    name: "ProposalCreated",
    inputs: [
      { indexed: false, name: "proposalId", type: "uint256" },
      { indexed: false, name: "proposer", type: "address" },
      { indexed: false, name: "targets", type: "address[]" },
      { indexed: false, name: "values", type: "uint256[]" },
      { indexed: false, name: "signatures", type: "string[]" },
      { indexed: false, name: "calldatas", type: "bytes[]" },
      { indexed: false, name: "voteStart", type: "uint256" },
      { indexed: false, name: "voteEnd", type: "uint256" },
      { indexed: false, name: "description", type: "string" },
    ],
  },
  {
    anonymous: false,
    type: "event",
    name: "VoteCast",
    inputs: [
      { indexed: true, name: "voter", type: "address" },
      { indexed: false, name: "proposalId", type: "uint256" },
      { indexed: false, name: "support", type: "uint8" },
      { indexed: false, name: "weight", type: "uint256" },
      { indexed: false, name: "reason", type: "string" },
    ],
  },
  { anonymous: false, type: "event", name: "ProposalQueued", inputs: [{ indexed: false, name: "proposalId", type: "uint256" }, { indexed: false, name: "etaSeconds", type: "uint256" }] },
  { anonymous: false, type: "event", name: "ProposalExecuted", inputs: [{ indexed: false, name: "proposalId", type: "uint256" }] },
  { anonymous: false, type: "event", name: "ProposalCanceled", inputs: [{ indexed: false, name: "proposalId", type: "uint256" }] },

  // ── Reads ───────────────────────────────────────────────────────────────
  { type: "function", stateMutability: "pure", name: "CLOCK_MODE", inputs: [], outputs: [{ name: "", type: "string" }] },
  { type: "function", stateMutability: "view", name: "clock", inputs: [], outputs: [{ name: "", type: "uint48" }] },
  { type: "function", stateMutability: "view", name: "votingDelay", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", stateMutability: "view", name: "votingPeriod", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", stateMutability: "view", name: "proposalThreshold", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", stateMutability: "view", name: "quorumVotes", inputs: [], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", stateMutability: "view", name: "quorum", inputs: [{ name: "", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", stateMutability: "view", name: "timelock", inputs: [], outputs: [{ name: "", type: "address" }] },
  {
    type: "function",
    stateMutability: "view",
    name: "state",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [{ name: "", type: "uint8" }],
  },
  { type: "function", stateMutability: "view", name: "proposalSnapshot", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", stateMutability: "view", name: "proposalDeadline", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [{ name: "", type: "uint256" }] },
  { type: "function", stateMutability: "view", name: "proposalProposer", inputs: [{ name: "proposalId", type: "uint256" }], outputs: [{ name: "", type: "address" }] },
  {
    type: "function",
    stateMutability: "view",
    name: "proposalVotes",
    inputs: [{ name: "proposalId", type: "uint256" }],
    outputs: [
      { name: "againstVotes", type: "uint256" },
      { name: "forVotes", type: "uint256" },
      { name: "abstainVotes", type: "uint256" },
    ],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "hasVoted",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "account", type: "address" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    stateMutability: "view",
    name: "getVotes",
    inputs: [
      { name: "account", type: "address" },
      { name: "timepoint", type: "uint256" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "pure",
    name: "hashProposal",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },

  // ── Writes ──────────────────────────────────────────────────────────────
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "propose",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "description", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "castVote",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "castVoteWithReason",
    inputs: [
      { name: "proposalId", type: "uint256" },
      { name: "support", type: "uint8" },
      { name: "reason", type: "string" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "queue",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "payable",
    name: "execute",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "cancel",
    inputs: [
      { name: "targets", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "calldatas", type: "bytes[]" },
      { name: "descriptionHash", type: "bytes32" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** OZ IGovernor.ProposalState enum */
export const PROPOSAL_STATE_LABELS = [
  "Pending",
  "Active",
  "Canceled",
  "Defeated",
  "Succeeded",
  "Queued",
  "Expired",
  "Executed",
] as const;

export type ProposalStateLabel = (typeof PROPOSAL_STATE_LABELS)[number];

export const OBSCURA_GOVERNOR_ADDRESS = (import.meta.env.VITE_OBSCURA_GOVERNOR_ADDRESS ??
  "0xE4807C9F90a0da8F5B5bafa4361B15ff855b7186") as `0x${string}`;

export const OBSCURA_TIMELOCK_ADDRESS = (import.meta.env.VITE_OBSCURA_TIMELOCK_ADDRESS ??
  "0x07b7961627f433a1d9001F82Ac4af9F19b9a9E05") as `0x${string}`;

export const OBSCURA_TREASURY_STREAMER_ADDRESS = (import.meta.env
  .VITE_OBSCURA_TREASURY_STREAMER_ADDRESS ??
  "0x4af75Ae3B46C34B70d6E85FEcDb71E99EC490FeD") as `0x${string}`;
