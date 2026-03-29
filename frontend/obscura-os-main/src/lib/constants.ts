export const CHAIN_ID = 421614;
export const CHAIN_NAME = "Arbitrum Sepolia";
export const EXPLORER_URL = "https://sepolia.arbiscan.io";
export const RPC_URL = "https://sepolia-rollup.arbitrum.io/rpc";

export const OBSCURA_PAY_ADDRESS = import.meta.env.VITE_OBSCURA_PAY_ADDRESS as `0x${string}` | undefined;

export enum Role {
  NONE = 0,
  ADMIN = 1,
  EMPLOYEE = 2,
  AUDITOR = 3,
}

export enum FHEStepStatus {
  IDLE = "idle",
  ENCRYPTING = "encrypting",
  COMPUTING = "computing",
  READY = "ready",
  ERROR = "error",
}
