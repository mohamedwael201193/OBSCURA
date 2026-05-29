import type { Address, PublicClient } from "viem";
import { OC_USDC_PAY_ABI } from "../abis/index.js";
import { makeCall } from "../core/chain.js";
import { resolveInEuint64, toContractInEuint64 } from "../core/utils.js";
import type { ObscuraAddresses } from "../config/defaults.js";
import type { FheProvider } from "../fhe/types.js";
import type { ContractCall, InEuint64 } from "../types/index.js";

export interface PayModuleDeps {
  chainId: number;
  addresses: ObscuraAddresses;
  publicClient: PublicClient;
  fhe?: FheProvider;
}

export class PayModule {
  constructor(private readonly deps: PayModuleDeps) {}

  get ocUsdcAddress(): Address {
    return this.deps.addresses.ocUSDC_Pay;
  }

  /** Returns encrypted balance ctHash (uint256) for account */
  async getShieldedBalance(account: Address): Promise<bigint> {
    return this.deps.publicClient.readContract({
      address: this.deps.addresses.ocUSDC_Pay,
      abi: OC_USDC_PAY_ABI,
      functionName: "confidentialBalanceOf",
      args: [account],
    }) as Promise<bigint>;
  }

  async buildShield(
    amount: bigint,
    encryptedAmount?: InEuint64,
  ): Promise<ContractCall> {
    const enc = await resolveInEuint64(
      amount,
      this.deps.addresses.ocUSDC_Pay,
      this.deps.fhe,
      encryptedAmount,
    );
    return makeCall(
      this.deps.chainId,
      this.deps.addresses.ocUSDC_Pay,
      OC_USDC_PAY_ABI,
      "shield",
      [amount, toContractInEuint64(enc)],
    );
  }

  async buildUnshield(
    to: Address,
    amount: bigint,
    encryptedAmount?: InEuint64,
  ): Promise<ContractCall> {
    const enc = await resolveInEuint64(
      amount,
      this.deps.addresses.ocUSDC_Pay,
      this.deps.fhe,
      encryptedAmount,
    );
    return makeCall(
      this.deps.chainId,
      this.deps.addresses.ocUSDC_Pay,
      OC_USDC_PAY_ABI,
      "unshield",
      [to, toContractInEuint64(enc)],
    );
  }

  async buildTransfer(
    to: Address,
    amount: bigint,
    encryptedAmount?: InEuint64,
  ): Promise<ContractCall> {
    const enc = await resolveInEuint64(
      amount,
      this.deps.addresses.ocUSDC_Pay,
      this.deps.fhe,
      encryptedAmount,
    );
    return makeCall(
      this.deps.chainId,
      this.deps.addresses.ocUSDC_Pay,
      OC_USDC_PAY_ABI,
      "confidentialTransfer",
      [to, toContractInEuint64(enc)],
    );
  }
}
