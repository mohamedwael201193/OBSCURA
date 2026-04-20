import { useState, useEffect } from "react";
import { usePublicClient } from "wagmi";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/wave2";

export type StealthStatus = "unknown" | "checking" | "registered" | "not-registered";

/**
 * Checks whether a given address has registered a stealth meta-address
 * on ObscuraStealthRegistry. Updates live as the address changes.
 */
export function useRecipientStealthCheck(address: string | undefined) {
  const publicClient = usePublicClient();
  const [status, setStatus] = useState<StealthStatus>("unknown");

  useEffect(() => {
    if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address) || !publicClient || !OBSCURA_STEALTH_REGISTRY_ADDRESS) {
      setStatus("unknown");
      return;
    }

    let cancelled = false;
    setStatus("checking");

    publicClient
      .readContract({
        address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
        abi: OBSCURA_STEALTH_REGISTRY_ABI,
        functionName: "getMetaAddress",
        args: [address as `0x${string}`],
      })
      .then((result) => {
        if (cancelled) return;
        const [, , ts] = result as readonly [`0x${string}`, `0x${string}`, bigint];
        setStatus(ts > 0n ? "registered" : "not-registered");
      })
      .catch(() => {
        if (!cancelled) setStatus("unknown");
      });

    return () => { cancelled = true; };
  }, [address, publicClient]);

  return status;
}
