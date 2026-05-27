import { useCallback, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { CREDIT_CANONICAL_OCUSDC_ADDRESS, CONFIDENTIAL_TOKEN_ABI } from "@/config/credit";

/**
 * useIsOperator — checks whether a spender is already an authorized operator
 * on the ocUSDC contract for the connected wallet.
 * Avoids unnecessary setOperator txs if already approved.
 */
export function useIsOperator(tokenAddress: `0x${string}` | undefined = CREDIT_CANONICAL_OCUSDC_ADDRESS) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [cache, setCache] = useState<Record<string, boolean>>({});

  const checkOperator = useCallback(
    async (spender: `0x${string}`): Promise<boolean> => {
      if (!publicClient || !address || !tokenAddress) return false;

      const key = `${tokenAddress}_${address}_${spender}`;
      if (cache[key] !== undefined) return cache[key];

      try {
        const result = await publicClient.readContract({
          address: tokenAddress,
          abi: CONFIDENTIAL_TOKEN_ABI,
          functionName: "isOperator",
          args: [address, spender],
        });
        const isOp = result as boolean;
        setCache((prev) => ({ ...prev, [key]: isOp }));
        return isOp;
      } catch {
        return false;
      }
    },
    [publicClient, address, cache, tokenAddress]
  );

  const invalidate = useCallback(
    (spender: `0x${string}`) => {
      if (!address) return;
      setCache((prev) => {
        const next = { ...prev };
        if (tokenAddress) delete next[`${tokenAddress}_${address}_${spender}`];
        return next;
      });
    },
    [address, tokenAddress]
  );

  return { checkOperator, invalidate };
}
