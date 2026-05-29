import type { Address } from "viem";
import type { InEuint64 } from "../types/index.js";

export interface FheEncryptOptions {
  contractAddress: Address;
  onStep?: (step: string) => void;
}

/** Injectable FHE adapter — host supplies @cofhe/sdk or custom implementation */
export interface FheProvider {
  encryptUint64(value: bigint, options: FheEncryptOptions): Promise<InEuint64>;
  decryptCtHash?(ctHash: bigint, contractAddress: Address): Promise<bigint>;
}

export class FheRequiredError extends Error {
  constructor(operation: string) {
    super(
      `FHE provider required for ${operation}. Pass fhe in ObscuraSDK.create() or supply a pre-encrypted InEuint64.`,
    );
    this.name = "FheRequiredError";
  }
}
