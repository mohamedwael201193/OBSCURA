import { useCallback, useEffect, useState } from "react";
import { usePublicClient, useReadContract } from "wagmi";
import {
  OBSCURA_PAY_STREAM_V2_ABI,
  OBSCURA_PAY_STREAM_V2_ADDRESS,
} from "@/config/payV2";

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

  // V2: only employer lookup is supported (recipient hint is encrypted; recipients discover via Stealth Inbox)
  const { data: ids, refetch: refetchIds } = useReadContract({
    address: OBSCURA_PAY_STREAM_V2_ADDRESS,
    abi: OBSCURA_PAY_STREAM_V2_ABI,
    functionName: "streamsByEmployer",
    args: [(filter.employer ?? filter.recipient) as `0x${string}`],
    query: {
      enabled: !!(filter.employer ?? filter.recipient) && !!OBSCURA_PAY_STREAM_V2_ADDRESS && !!filter.employer,
      refetchInterval: 8_000,
    },
  });

  const refresh = useCallback(async () => {
    // Recipient mode not supported on V2 — recipients discover payments via Stealth Inbox
    if (!filter.employer) {
      setStreams([]);
      return;
    }
    if (!publicClient || !ids || !OBSCURA_PAY_STREAM_V2_ADDRESS) return;
    setIsLoading(true);
    try {
      const list = ids as bigint[];
      const results = await Promise.all(
        list.map(async (id) => {
          const s = (await publicClient.readContract({
            address: OBSCURA_PAY_STREAM_V2_ADDRESS!,
            abi: OBSCURA_PAY_STREAM_V2_ABI,
            functionName: "getStream",
            args: [id],
          })) as readonly [
            `0x${string}`, // 0: employer
            bigint,         // 1: periodSeconds
            bigint,         // 2: startTime
            bigint,         // 3: endTime
            bigint,         // 4: lastTickTime
            number,         // 5: jitterSeconds (uint32)
            bigint,         // 6: cyclesPaid
            boolean,        // 7: paused
          ];
          const pending = (await publicClient.readContract({
            address: OBSCURA_PAY_STREAM_V2_ADDRESS!,
            abi: OBSCURA_PAY_STREAM_V2_ABI,
            functionName: "pendingCycles",
            args: [id],
          })) as bigint;
          // recipientHint was stored in localStorage by CreateStreamFormV2 at creation time
          const storedHint = localStorage.getItem(`v2_stream_recipient_${id.toString()}`);
          return {
            id,
            employer: s[0],
            recipientHint: (storedHint ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
            periodSeconds: s[1],
            startTime: s[2],
            endTime: s[3],
            lastTickTime: s[4],
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
  }, [publicClient, ids, filter.employer]);

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
