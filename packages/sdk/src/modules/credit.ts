import type { Address } from "viem";
import { CREDIT_MARKET_ABI } from "../abis/index.js";
import { makeCall } from "../core/chain.js";
import { resolveInEuint64, toContractInEuint64 } from "../core/utils.js";
import type { ObscuraAddresses } from "../config/defaults.js";
import type { FheProvider } from "../fhe/types.js";
import type { ContractCall, InEuint64 } from "../types/index.js";

export interface CreditModuleDeps {
  chainId: number;
  addresses: ObscuraAddresses;
  fhe?: FheProvider;
}

export class CreditModule {
  constructor(private readonly deps: CreditModuleDeps) {}

  getMarketAddress(override?: Address): Address {
    return override ?? this.deps.addresses.CreditCanonicalPayOcUSDCMarket;
  }

  async buildSupplyCollateral(
    amount: bigint,
    encryptedAmount?: InEuint64,
    marketAddress?: Address,
  ): Promise<ContractCall> {
    const market = this.getMarketAddress(marketAddress);
    const enc = await resolveInEuint64(amount, market, this.deps.fhe, encryptedAmount);
    return makeCall(this.deps.chainId, market, CREDIT_MARKET_ABI, "supplyCollateral", [
      toContractInEuint64(enc),
    ]);
  }

  async buildBorrow(
    amount: bigint,
    encryptedAmount?: InEuint64,
    marketAddress?: Address,
  ): Promise<ContractCall> {
    const market = this.getMarketAddress(marketAddress);
    const enc = await resolveInEuint64(amount, market, this.deps.fhe, encryptedAmount);
    return makeCall(this.deps.chainId, market, CREDIT_MARKET_ABI, "borrow", [
      toContractInEuint64(enc),
    ]);
  }

  async buildRepay(
    amount: bigint,
    encryptedAmount?: InEuint64,
    marketAddress?: Address,
  ): Promise<ContractCall> {
    const market = this.getMarketAddress(marketAddress);
    const enc = await resolveInEuint64(amount, market, this.deps.fhe, encryptedAmount);
    return makeCall(this.deps.chainId, market, CREDIT_MARKET_ABI, "repay", [
      toContractInEuint64(enc),
    ]);
  }
}
