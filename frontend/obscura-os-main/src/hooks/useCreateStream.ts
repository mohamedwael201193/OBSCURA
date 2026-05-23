import { useCallback } from "react";
import { usePayStreamV2 } from "@/hooks/usePayStreamV2";

/**
 * useCreateStream — thin wrapper around usePayStreamV2.createStream.
 * Kept for backward-compat with CreateStreamForm (which passes recipientHint).
 * V1 stream (OBSCURA_PAY_STREAM_ADDRESS) was broken (selector mismatch) and
 * has been replaced by ObscuraPayStreamV2.
 */
export function useCreateStream() {
  const { createStream, isPending, error } = usePayStreamV2();
  const txHashRef = { current: null as string | null };

  const create = useCallback(
    async (params: {
      recipientHint: `0x${string}`;
      periodSeconds: number;
      startTime: number;
      endTime: number;
    }) => {
      const result = await createStream({
        recipientAddress: params.recipientHint,
        periodSeconds: params.periodSeconds,
        startTime: params.startTime,
        endTime: params.endTime,
      });
      txHashRef.current = result.hash;
      return result.hash;
    },
    [createStream]
  );

  return { create, isPending, txHash: txHashRef.current, error };
}
