import { useCallback, useEffect, useState } from "react";
import { usePublicClient, useReadContract } from "wagmi";
import {
  OBSCURA_PAY_STREAM_V3_ABI,
  OBSCURA_PAY_STREAM_V3_ADDRESS,
} from "@/config/payV3";

export interface StreamSummary {
  id: bigint;
  employer: `0x${string}`;
  recipientHint: `0x${string}`;
  periodSeconds: bigint;
  startTime: bigint;
  endTime: bigint;
  lastTickTime: bigint;
  cyclesPaid: bigint;
  paused: boolean;
  pendingCycles: bigint;
}

export function useStreamList(filter: { employer?: `0x${string}`; recipient?: `0x${string}` }) {
  const publicClient = usePublicClient();
  const [streams, setStreams] = useState<StreamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // V3 employer lookup (active contract)
  const { data: idsV3, refetch: refetchV3Ids } = useReadContract({
    address: OBSCURA_PAY_STREAM_V3_ADDRESS,
    abi: OBSCURA_PAY_STREAM_V3_ABI,
    functionName: "streamsByEmployer",
    args: [(filter.employer ?? filter.recipient) as `0x${string}`],
    query: {
      enabled:
        !!(filter.employer ?? filter.recipient) &&
        !!OBSCURA_PAY_STREAM_V3_ADDRESS &&
        !!filter.employer,
      refetchInterval: 8_000,
    },
  });

  const refresh = useCallback(async () => {
    if (!filter.employer) {
      setStreams([]);
      return;
    }
    if (!publicClient) return;
    setIsLoading(true);
    try {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const results: StreamSummary[] = [];

      if (idsV3 && OBSCURA_PAY_STREAM_V3_ADDRESS) {
        const list = idsV3 as bigint[];
        const rows = await Promise.all(
          list.map(async (id) => {
            const s = (await publicClient.readContract({
              address: OBSCURA_PAY_STREAM_V3_ADDRESS!,
              abi: OBSCURA_PAY_STREAM_V3_ABI,
              functionName: "getStream",
              args: [id],
            })) as readonly [
              `0x${string}`, // employer
              bigint,         // periodSeconds
              bigint,         // startTime
              bigint,         // endTime
              bigint,         // lastTickTime
              bigint,         // cyclesPaid
              number,         // jitterSeconds
              boolean,        // paused
            ];
            const period = s[1];
            const startTime = s[2];
            const lastTick = s[4];
            const baseline = lastTick > 0n ? lastTick : startTime;
            const pending = period > 0n && now > baseline ? (now - baseline) / period : 0n;
            const storedHint = localStorage.getItem(`v3_stream_recipient_${id.toString()}`);
            return {
              id,
              employer: s[0],
              recipientHint: (storedHint ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
              periodSeconds: period,
              startTime: s[2],
              endTime: s[3],
              lastTickTime: lastTick,
              cyclesPaid: s[5],
              paused: s[7],
              pendingCycles: pending > 0n ? pending : 0n,
            } satisfies StreamSummary;
          })
        );
        results.push(...rows);
      }

      // Sort: pending cycles first, then by id descending (newest first)
      results.sort((a, b) => {
        const aPend = a.pendingCycles > 0n ? 1 : 0;
        const bPend = b.pendingCycles > 0n ? 1 : 0;
        if (aPend !== bPend) return bPend - aPend;
        return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
      });

      setStreams(results);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, idsV3, filter.employer]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Force refetch stream IDs + details immediately */
  const hardRefresh = useCallback(async () => {
    await refetchV3Ids();
    await refresh();
  }, [refetchV3Ids, refresh]);

  return { streams, isLoading, refresh, hardRefresh };
}
