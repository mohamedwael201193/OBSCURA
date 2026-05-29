import type { Address, Hex, PublicClient, WalletClient } from "viem";
import {
  ARBITRUM_SEPOLIA_CHAIN_ID,
  DEFAULT_API_URL,
  DEFAULT_RPC_URL,
  DEFAULT_SUPABASE_URL,
  mergeAddresses,
  type ObscuraAddresses,
} from "./config/defaults.js";
import { HttpClient } from "./core/http.js";
import {
  createDefaultPublicClient,
  encodeCall,
  sendContractCall,
} from "./core/chain.js";
import type { FheProvider } from "./fhe/types.js";
import { ActivityModule } from "./modules/activity.js";
import { CreditModule } from "./modules/credit.js";
import { NotificationsModule } from "./modules/notifications.js";
import { PayModule } from "./modules/pay.js";
import { ReputationModule } from "./modules/reputation.js";
import { VoteModule } from "./modules/vote.js";
import type { ContractCall, ObscuraSDKConfig } from "./types/index.js";

export class ObscuraSDK {
  readonly chainId: number;
  readonly addresses: ObscuraAddresses;
  readonly publicClient: PublicClient;
  readonly fhe?: FheProvider;

  readonly pay: PayModule;
  readonly credit: CreditModule;
  readonly vote: VoteModule;
  readonly reputation: ReputationModule;
  readonly activity: ActivityModule;
  readonly notifications: NotificationsModule;

  private readonly walletClient?: WalletClient;

  private constructor(config: ObscuraSDKConfig) {
    this.chainId = config.chainId ?? ARBITRUM_SEPOLIA_CHAIN_ID;
    this.addresses = mergeAddresses(config.addresses);
    this.fhe = config.fhe;
    this.walletClient = config.walletClient;

    const rpcUrl = config.rpcUrl ?? DEFAULT_RPC_URL;
    this.publicClient = config.publicClient ?? createDefaultPublicClient(rpcUrl, this.chainId);

    const apiUrl = config.apiUrl ?? DEFAULT_API_URL;
    const http = new HttpClient(apiUrl);

    const moduleDeps = {
      chainId: this.chainId,
      addresses: this.addresses,
      publicClient: this.publicClient,
      fhe: this.fhe,
    };

    this.pay = new PayModule(moduleDeps);
    this.credit = new CreditModule({
      chainId: this.chainId,
      addresses: this.addresses,
      fhe: this.fhe,
    });
    this.vote = new VoteModule(moduleDeps);
    this.reputation = new ReputationModule(http);
    this.notifications = new NotificationsModule(http);
    this.activity = new ActivityModule(
      config.supabaseUrl ?? DEFAULT_SUPABASE_URL,
      config.supabaseAnonKey,
    );
  }

  static create(config: ObscuraSDKConfig = {}): ObscuraSDK {
    return new ObscuraSDK(config);
  }

  encodeCall(call: ContractCall): Hex {
    return encodeCall(call);
  }

  async sendCall(call: ContractCall, account: Address): Promise<Hex> {
    if (!this.walletClient) {
      throw new Error("walletClient required for sendCall. Pass walletClient in ObscuraSDK.create().");
    }
    return sendContractCall(call, this.walletClient, account);
  }
}
