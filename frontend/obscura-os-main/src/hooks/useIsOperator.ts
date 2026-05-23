import { useCallback, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { CREDIT_OCUSDC_ADDRESS, CONFIDENTIAL_TOKEN_ABI } from "@/config/credit";

/**
 * useIsOperator — checks whether a spender is already an authorized operator
 * on the ocUSDC contract for the connected wallet.
 * Avoids unnecessary setOperator txs if already approved.
 */
export function useIsOperator() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [cache, setCache] = useState<Record<string, boolean>>({});

  const checkOperator = useCallback(
    async (spender: `0x${string}`): Promise<boolean> => {
      if (!publicClient || !address || !CREDIT_OCUSDC_ADDRESS) return false;

      const key = `${address}_${spender}`;
      if (cache[key] !== undefined) return cache[key];

      try {
        const result = await publicClient.readContract({
          address: CREDIT_OCUSDC_ADDRESS,
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
    [publicClient, address, cache]
  );

  const invalidate = useCallback(
    (spender: `0x${string}`) => {
      if (!address) return;
      setCache((prev) => {
        const next = { ...prev };
        delete next[`${address}_${spender}`];
        return next;
      });
    },
    [address]
  );

  return { checkOperator, invalidate };
}
