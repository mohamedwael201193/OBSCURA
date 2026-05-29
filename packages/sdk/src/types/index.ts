import type { Address } from "viem";

export type ReputationTier = "new" | "active" | "steady" | "reliable";
export type ReputationSourceApp = "all" | "pay" | "credit" | "vote";

export interface ReputationSignalSummary {
  label: string;
  count: number;
  cappedWeight: number;
  latestAt: string | null;
}

export interface ReputationSummary {
  wallet: Address;
  sourceApp: ReputationSourceApp;
  totalCappedWeight: number;
  tier: ReputationTier;
  signals: Record<string, ReputationSignalSummary>;
  sources?: Record<string, number>;
  updatedAt: string | null;
}

export interface NotificationPrefs {
  wallet: Address;
  push_enabled: boolean;
  email_enabled: boolean;
  email?: string;
  events: string[];
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export type ActivityEventType =
  | "all"
  | "sent"
  | "received"
  | "stream"
  | "invoice"
  | "escrow"
  | "stealth"
  | "credit"
  | "vote";

export interface ActivityItem {
  id: number;
  chain_id: number;
  block_number: string;
  tx_hash: string;
  log_index: number;
  contract_address: string;
  event_name: string;
  wallet: string;
  participants: string[];
  args: Record<string, unknown>;
  created_at: string;
}

export interface ActivityListOptions {
  filter?: ActivityEventType;
  page?: number;
  pageSize?: number;
}

export interface ActivityListResult {
  items: ActivityItem[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/** FHE encrypted uint64 input tuple for contract calls */
export interface InEuint64 {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
}

export interface ContractCall {
  address: Address;
  abi: readonly unknown[];
  functionName: string;
  args: readonly unknown[];
  chainId: number;
}

export interface ProposalState {
  id: bigint;
  creator: Address;
  title: string;
  description: string;
  options: string[];
  startTime: bigint;
  endTime: bigint;
  finalized: boolean;
  winningOption: bigint;
}

export interface ObscuraSDKConfig {
  chainId?: number;
  rpcUrl?: string;
  apiUrl?: string;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  addresses?: Partial<import("../config/defaults.js").ObscuraAddresses>;
  publicClient?: import("viem").PublicClient;
  walletClient?: import("viem").WalletClient;
  fhe?: import("../fhe/types.js").FheProvider;
}
