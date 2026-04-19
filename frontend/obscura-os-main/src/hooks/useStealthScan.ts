import { useCallback, useEffect, useState } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { decodeEventLog, decodeAbiParameters } from "viem";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/wave2";
import { scanAnnouncement, loadStoredKeys } from "@/lib/stealth";

export interface ScannedPayment {
  blockNumber: bigint;
  txHash: `0x${string}`;
  stealthAddress: `0x${string}`;
  ephemeralPubKey: `0x${string}`;
  viewTag: `0x${string}`;
  streamId: bigint;
  escrowId: bigint;
}

const SCAN_LOOKBACK_BLOCKS = 50_000n; // ~14 days on Arb Sepolia

/**
 * useStealthScan — pulls Announcement logs from the stealth registry,
 * filters by viewTag using the connected wallet's stored viewing key,
 * and returns the cycles that belong to this user.
 */
export function useStealthScan() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [matches, setMatches] = useState<ScannedPayment[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const scan = useCallback(async () => {
    if (!publicClient || !address || !OBSCURA_STEALTH_REGISTRY_ADDRESS) return;
    const keys = loadStoredKeys(address);
    if (!keys) {
      setError("Generate a stealth meta-address first");
      return;
    }
    setIsScanning(true);
    setError(null);
    try {
      const head = await publicClient.getBlockNumber();
      const from = head > SCAN_LOOKBACK_BLOCKS ? head - SCAN_LOOKBACK_BLOCKS : 0n;

      const logs = await publicClient.getLogs({
        address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
        event: {
          type: "event",
          name: "Announcement",
          inputs: [
            { indexed: true, name: "schemeId", type: "uint256" },
            { indexed: true, name: "stealthAddress", type: "address" },
            { indexed: true, name: "caller", type: "address" },
            { indexed: false, name: "ephemeralPubKey", type: "bytes" },
            { indexed: false, name: "viewTag", type: "bytes1" },
            { indexed: false, name: "metadata", type: "bytes" },
          ],
        },
        fromBlock: from,
        toBlock: head,
      });

      const found: ScannedPayment[] = [];
      for (const log of logs) {
        try {
          const decoded = decodeEventLog({
            abi: OBSCURA_STEALTH_REGISTRY_ABI,
            data: log.data,
            topics: log.topics,
          });
          if (decoded.eventName !== "Announcement") continue;
          const args = decoded.args as any;
          const ephemeral = args.ephemeralPubKey as `0x${string}`;
          const viewTag = args.viewTag as `0x${string}`;
          const stealthAddr = args.stealthAddress as `0x${string}`;

          const derived = scanAnnouncement(
            ephemeral,
            viewTag,
            keys.viewingPrivateKey,
            keys.meta.spendingPubKey
          );
          if (!derived || derived.toLowerCase() !== stealthAddr.toLowerCase()) continue;

          let streamId = 0n;
          let escrowId = 0n;
          try {
            const [sId, eId] = decodeAbiParameters(
              [
                { name: "streamId", type: "uint256" },
                { name: "escrowId", type: "uint256" },
              ],
              args.metadata as `0x${string}`
            );
            streamId = sId as bigint;
            escrowId = eId as bigint;
          } catch {
            /* metadata may be empty */
          }

          found.push({
            blockNumber: log.blockNumber!,
            txHash: log.transactionHash!,
            stealthAddress: stealthAddr,
            ephemeralPubKey: ephemeral,
            viewTag,
            streamId,
            escrowId,
          });
        } catch {
          /* skip malformed logs */
        }
      }
      setMatches(found.reverse());
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsScanning(false);
    }
  }, [publicClient, address]);

  useEffect(() => {
    void scan();
  }, [scan]);

  return { matches, isScanning, error, scan };
}
