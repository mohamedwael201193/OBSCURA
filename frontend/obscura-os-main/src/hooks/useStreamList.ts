import { useCallback, useEffect, useState } from "react";
import { usePublicClient, useReadContract } from "wagmi";
import {
  OBSCURA_PAY_STREAM_ABI,
  OBSCURA_PAY_STREAM_ADDRESS,
} from "@/config/wave2";

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

  const { data: ids, refetch: refetchIds } = useReadContract({
    address: OBSCURA_PAY_STREAM_ADDRESS,
    abi: OBSCURA_PAY_STREAM_ABI,
    functionName: filter.employer ? "streamsByEmployer" : "streamsByRecipient",
    args: [(filter.employer ?? filter.recipient) as `0x${string}`],
    query: {
      enabled: !!(filter.employer ?? filter.recipient) && !!OBSCURA_PAY_STREAM_ADDRESS,
      refetchInterval: 8_000,
    },
  });

  const refresh = useCallback(async () => {
    if (!publicClient || !ids || !OBSCURA_PAY_STREAM_ADDRESS) return;
    setIsLoading(true);
    try {
      const list = ids as bigint[];
      const results = await Promise.all(
        list.map(async (id) => {
          const s = (await publicClient.readContract({
            address: OBSCURA_PAY_STREAM_ADDRESS,
            abi: OBSCURA_PAY_STREAM_ABI,
            functionName: "getStream",
            args: [id],
          })) as readonly [
            `0x${string}`,
            `0x${string}`,
            bigint,
            bigint,
            bigint,
            bigint,
            bigint,
            boolean,
          ];
          const pending = (await publicClient.readContract({
            address: OBSCURA_PAY_STREAM_ADDRESS,
            abi: OBSCURA_PAY_STREAM_ABI,
            functionName: "pendingCycles",
            args: [id],
          })) as bigint;
          return {
            id,
            employer: s[0],
            recipientHint: s[1],
            periodSeconds: s[2],
            startTime: s[3],
            endTime: s[4],
            lastTickTime: s[5],
            cyclesPaid: s[6],
            paused: s[7],
            pendingCycles: pending,
          } satisfies StreamSummary;
        })
      );
      setStreams(results);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, ids]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Force refetch stream IDs + details immediately */
  const hardRefresh = useCallback(async () => {
    await refetchIds();
    await refresh();
  }, [refetchIds, refresh]);

  return { streams, isLoading, refresh, hardRefresh };
}
