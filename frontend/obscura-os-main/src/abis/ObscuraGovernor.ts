/**
 * ObscuraGovernor — addresses + UI helpers.
 * ABI is synced from Hardhat artifacts via `npm run sync:vote-abis` in contracts-hardhat.
 */
import ObscuraGovernorAbi from "@/abis/vote/ObscuraGovernor.json";

export const OBSCURA_GOVERNOR_ABI = ObscuraGovernorAbi;

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
