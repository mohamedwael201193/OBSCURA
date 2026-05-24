import { useCallback, useEffect, useState } from "react";
import { usePublicClient, useReadContract } from "wagmi";
import {
  OBSCURA_PAY_STREAM_V2_ABI,
  OBSCURA_PAY_STREAM_V2_ADDRESS,
} from "@/config/payV2";
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
  /** V2 streams are broken on-chain (InEuint64 forwarding bug). V3 is active. */
  version: "v2" | "v3";
}

export function useStreamList(filter: { employer?: `0x${string}`; recipient?: `0x${string}` }) {
  const publicClient = usePublicClient();
  const [streams, setStreams] = useState<StreamSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // V2 employer lookup (legacy — kept for displaying archived V2 streams)
  const { data: idsV2, refetch: refetchV2Ids } = useReadContract({
    address: OBSCURA_PAY_STREAM_V2_ADDRESS,
    abi: OBSCURA_PAY_STREAM_V2_ABI,
    functionName: "streamsByEmployer",
    args: [(filter.employer ?? filter.recipient) as `0x${string}`],
    query: {
      enabled:
        !!(filter.employer ?? filter.recipient) &&
        !!OBSCURA_PAY_STREAM_V2_ADDRESS &&
        !!filter.employer,
      refetchInterval: 30_000, // V2 is read-only / legacy, refresh less frequently
    },
  });

  // V3 employer lookup (active)
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

      // ── V2 streams (legacy, read-only display) ────────────────────────
      const v2Results: StreamSummary[] = [];
      if (idsV2 && OBSCURA_PAY_STREAM_V2_ADDRESS) {
        const list = idsV2 as bigint[];
        const rows = await Promise.all(
          list.map(async (id) => {
            const s = (await publicClient.readContract({
              address: OBSCURA_PAY_STREAM_V2_ADDRESS!,
              abi: OBSCURA_PAY_STREAM_V2_ABI,
              functionName: "getStream",
              args: [id],
            })) as readonly [
              `0x${string}`, // employer
              bigint,         // periodSeconds
              bigint,         // startTime
              bigint,         // endTime
              bigint,         // lastTickTime
              number,         // jitterSeconds (V2 pos 5)
              bigint,         // cyclesPaid    (V2 pos 6)
              boolean,        // paused
            ];
            const pending = (await publicClient.readContract({
              address: OBSCURA_PAY_STREAM_V2_ADDRESS!,
              abi: OBSCURA_PAY_STREAM_V2_ABI,
              functionName: "pendingCycles",
              args: [id],
            })) as bigint;
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
              version: "v2" as const,
            } satisfies StreamSummary;
          })
        );
        v2Results.push(...rows);
      }

      // ── V3 streams (active) ───────────────────────────────────────────
      const v3Results: StreamSummary[] = [];
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
              bigint,         // cyclesPaid    (V3 pos 5 — differs from V2)
              number,         // jitterSeconds (V3 pos 6)
              boolean,        // paused
            ];
            const period = s[1];
            const lastTick = s[4];
            const pending = period > 0n ? (now - lastTick) / period : 0n;
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
              version: "v3" as const,
            } satisfies StreamSummary;
          })
        );
        v3Results.push(...rows);
      }

      // V3 first (active), then V2 (legacy) for display ordering
      setStreams([...v3Results, ...v2Results]);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, idsV2, idsV3, filter.employer]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Force refetch stream IDs + details immediately */
  const hardRefresh = useCallback(async () => {
    await Promise.all([refetchV2Ids(), refetchV3Ids()]);
    await refresh();
  }, [refetchV2Ids, refetchV3Ids, refresh]);

  return { streams, isLoading, refresh, hardRefresh };
}
