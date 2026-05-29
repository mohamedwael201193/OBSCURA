import type { Address } from "viem";
import type { FheProvider } from "../fhe/types.js";
import type { InEuint64 } from "../types/index.js";
import { FheRequiredError } from "../fhe/types.js";

export async function resolveInEuint64(
  value: bigint,
  contractAddress: Address,
  fhe: FheProvider | undefined,
  preEncrypted?: InEuint64,
): Promise<InEuint64> {
  if (preEncrypted) return preEncrypted;
  if (!fhe) throw new FheRequiredError("encrypted amount");
  return fhe.encryptUint64(value, { contractAddress });
}

/** Serialize InEuint64 for viem contract args (bigint ctHash) */
export function toContractInEuint64(input: InEuint64): {
  ctHash: bigint;
  securityZone: number;
  utype: number;
  signature: `0x${string}`;
} {
  return {
    ctHash: input.ctHash,
    securityZone: input.securityZone,
    utype: input.utype,
    signature: input.signature,
  };
}

export function normalizeWallet(wallet: string): Address | null {
  if (!/^0x[0-9a-fA-F]{40}$/.test(wallet)) return null;
  return wallet.toLowerCase() as Address;
}

export function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}
