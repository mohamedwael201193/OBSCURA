export { ObscuraSDK } from "./client.js";

export type { ObscuraSDKConfig } from "./types/index.js";
export type {
  ActivityEventType,
  ActivityItem,
  ActivityListOptions,
  ActivityListResult,
  ContractCall,
  InEuint64,
  NotificationPrefs,
  ProposalState,
  PushSubscriptionJSON,
  ReputationSignalSummary,
  ReputationSourceApp,
  ReputationSummary,
  ReputationTier,
} from "./types/index.js";

export type { FheProvider, FheEncryptOptions } from "./fhe/types.js";
export { FheRequiredError } from "./fhe/types.js";

export type { ObscuraAddresses } from "./config/defaults.js";
export {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  DEFAULT_ADDRESSES,
  DEFAULT_API_URL,
  DEFAULT_RPC_URL,
  DEFAULT_SUPABASE_URL,
} from "./config/defaults.js";

export { ACTIVITY_EVENT_FILTERS } from "./config/activity-filters.js";
export type { ActivityEventFilterMap } from "./config/activity-filters.js";

export { HttpError } from "./core/http.js";
export { encodeCall, createDefaultPublicClient } from "./core/chain.js";
export { normalizeWallet, toContractInEuint64 } from "./core/utils.js";

export { PayModule } from "./modules/pay.js";
export { CreditModule } from "./modules/credit.js";
export { VoteModule } from "./modules/vote.js";
export { ReputationModule } from "./modules/reputation.js";
export { ActivityModule } from "./modules/activity.js";
export { NotificationsModule } from "./modules/notifications.js";

export { OC_USDC_PAY_ABI, CREDIT_MARKET_ABI, OBSCURA_VOTE_ABI } from "./abis/index.js";
