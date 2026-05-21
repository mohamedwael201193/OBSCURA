/**
 * multicall — thin viem multicall3 wrapper for batched public reads.
 *
 * Arbitrum Sepolia has Multicall3 deployed at the canonical address
 * 0xcA11bde05977b3631167028862bE2a173976CA11 — wagmi's PublicClient
 * already exposes `.multicall()` against it. This module is a thin
 * convenience helper that swallows individual call failures so a single
 * bad market does not poison an entire batch.
 */
import type { PublicClient } from "viem";

export interface MulticallEntry<T = unknown> {
  address: `0x${string}`;
  abi: any;
  functionName: string;
  args?: readonly unknown[];
  /** Optional fallback when this individual call reverts. */
  fallback?: T;
}

export async function batchRead<T = unknown>(
  client: PublicClient,
  calls: ReadonlyArray<MulticallEntry<T>>
): Promise<Array<T | null>> {
  if (calls.length === 0) return [];
  try {
    const res = await client.multicall({
      allowFailure: true,
      contracts: calls.map((c) => ({
        address: c.address,
        abi: c.abi,
        functionName: c.functionName,
        args: c.args,
      })),
    });
    return res.map((r, i) => {
      if (r.status === "success") return r.result as T;
      return calls[i].fallback ?? null;
    });
  } catch {
    // Multicall not available — fall back to parallel individual calls
    return Promise.all(
      calls.map(async (c) => {
        try {
          return (await client.readContract({
            address: c.address,
            abi: c.abi,
            functionName: c.functionName,
            args: c.args,
          })) as T;
        } catch {
          return c.fallback ?? null;
        }
      })
    );
  }
}
