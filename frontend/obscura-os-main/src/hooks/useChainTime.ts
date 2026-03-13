import { useBlock } from 'wagmi';

/**
 * Returns the latest block timestamp (bigint, seconds) from the chain.
 * Falls back to Date.now() / 1000 if the block hasn't loaded yet.
 *
 * Using block.timestamp instead of Date.now() avoids issues where the
 * user's system clock disagrees with the blockchain clock (e.g. DST,
 * timezone misconfiguration), which would cause the UI to show
 * "Voting ended" while the contract still says the period is live.
 */
export function useChainTime(): bigint {
  const { data: block } = useBlock({
    query: {
      refetchInterval: 12_000, // refresh every ~12 seconds
      staleTime: 6_000,
    },
  });
  return block?.timestamp ?? BigInt(Math.floor(Date.now() / 1000));
}
