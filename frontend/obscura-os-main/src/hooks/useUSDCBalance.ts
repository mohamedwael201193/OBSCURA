import { useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits, type Address } from "viem";
import { USDC_ARB_SEPOLIA } from "@/config/pay";

const ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

/** Returns plain USDC balance (6 decimals) as a formatted string, or null while loading. */
export function useUSDCBalance(account?: Address | null) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [balance, setBalance] = useState<string | null>(null);
  const targetAddress = account === undefined ? address : account;

  useEffect(() => {
    if (!targetAddress || !publicClient || !USDC_ARB_SEPOLIA) {
      setBalance(null);
      return;
    }
    let cancelled = false;
    publicClient
      .readContract({ address: USDC_ARB_SEPOLIA, abi: ABI, functionName: "balanceOf", args: [targetAddress] })
      .then((raw) => { if (!cancelled) setBalance(formatUnits(raw as bigint, 6)); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [targetAddress, publicClient]);

  return balance;
}
