/**
 * usePayStreamV3 — Wave 5 V3 stream hook.
 *
 * What changed from V2:
 *   - Uses ObscuraPayStreamV3 address/ABI (no Reineira dependency).
 *   - tickStream takes 6 parameters:
 *       (streamId, encCycleAmount, encStealthOwner, employerSalt, approver, approverSalt)
 *     The proofs are consumed INSIDE the stream contract; no forwarding.
 *   - Pre-flight: employer must have cUSDC.setOperator(streamV3Addr, expiry).
 *     `ensureOperatorForV3` handles this transparently before the first tick.
 *   - Payment lands in ObscuraConfidentialEscrow (not directly to stealth addr).
 *     Employee discovers via escrow events and redeems after releaseTime.
 *
 * getStream return order differs from V2:
 *   V2: employer, period, start, end, lastTick, jitter, cycles, paused
 *   V3: employer, period, start, end, lastTick, cycles, jitter, paused
 */
import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { keccak256, toHex, zeroAddress } from "viem";
import {
  OBSCURA_PAY_STREAM_V3_ABI,
  OBSCURA_PAY_STREAM_V3_ADDRESS,
  OBSCURA_PAY_OCUSDC_ABI,
  OBSCURA_PAY_OCUSDC_ADDRESS,
} from "@/config/payV3";
import { estimateCappedFees } from "@/lib/gas";
import { encryptAddress, encryptAmount, initFHEClient } from "@/lib/fhe";
import { getJSON, setJSON } from "@/lib/scopedStorage";

// ── Salt storage (mirrors usePayStreamV2 pattern) ──────────────────────────
const SALT_KEY_V3 = "obscura.stream.salts.v3";
type SaltMap = Record<string, string[]>; // streamId → [0x…, 0x…, …]

function makeSalt(
  streamId: bigint,
  account: `0x${string}`,
  idx: number
): `0x${string}` {
  const nonce = crypto.getRandomValues(new Uint32Array(4));
  const nonceHex = Array.from(nonce)
    .map((n) => n.toString(16).padStart(8, "0"))
    .join("");
  return keccak256(
    toHex(`${account.toLowerCase()}|${streamId.toString()}|v3|${idx}|${nonceHex}`)
  );
}

function loadSalts(account: `0x${string}`): SaltMap {
  return getJSON<SaltMap>(`${SALT_KEY_V3}:${account.toLowerCase()}`) ?? {};
}

function saveSalt(
  account: `0x${string}`,
  streamId: bigint,
  salt: `0x${string}`
) {
  const map = loadSalts(account);
  const key = streamId.toString();
  map[key] = [...(map[key] ?? []), salt];
  setJSON(`${SALT_KEY_V3}:${account.toLowerCase()}`, map);
}

// ── 30-day operator window ─────────────────────────────────────────────────
const OPERATOR_DURATION = 30n * 24n * 3600n;

export interface StreamRowV3 {
  streamId: bigint;
  employer: `0x${string}`;
  periodSeconds: bigint;
  startTime: bigint;
  endTime: bigint;
  lastTickTime: bigint;
  cyclesPaid: bigint;
  jitterSeconds: number;
  paused: boolean;
  /** Computed: how many periods have elapsed since lastTickTime */
  pendingCycles: bigint;
  version: "v3";
}

export function usePayStreamV3() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();

  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ── Operator pre-flight ──────────────────────────────────────────────────

  /**
   * Ensure the V3 stream contract is an authorized operator on the PAY ocUSDC.
   * No-op if already authorized. Sends setOperator tx otherwise.
   */
  const ensureOperatorForV3 = useCallback(async (): Promise<boolean> => {
    if (
      !publicClient ||
      !walletClient ||
      !address ||
      !OBSCURA_PAY_STREAM_V3_ADDRESS ||
      !OBSCURA_PAY_OCUSDC_ADDRESS
    ) {
      throw new Error("V3 stream or PAY ocUSDC address not configured");
    }

    const isOp = await publicClient.readContract({
      address: OBSCURA_PAY_OCUSDC_ADDRESS,
      abi: OBSCURA_PAY_OCUSDC_ABI,
      functionName: "isOperator",
      args: [address, OBSCURA_PAY_STREAM_V3_ADDRESS],
    });

    if (isOp) return false;

    const expiry = BigInt(Math.floor(Date.now() / 1000)) + OPERATOR_DURATION;
    const fees = await estimateCappedFees(publicClient);
    const hash = await walletClient.writeContract({
      address: OBSCURA_PAY_OCUSDC_ADDRESS,
      abi: OBSCURA_PAY_OCUSDC_ABI,
      functionName: "setOperator",
      args: [OBSCURA_PAY_STREAM_V3_ADDRESS, Number(expiry)],
      account: address,
      chain: arbitrumSepolia,
      ...fees,
    });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status === "reverted") throw new Error("setOperator reverted");
    return true;
  }, [publicClient, walletClient, address]);

  // ── createStream ─────────────────────────────────────────────────────────

  const createStream = useCallback(
    async (params: {
      recipientAddress: `0x${string}`;
      periodSeconds: number;
      startTime: number;
      endTime: number;
      jitterSeconds?: number;
    }): Promise<{ hash: `0x${string}`; streamId: bigint }> => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAY_STREAM_V3_ADDRESS
      ) {
        throw new Error("Wallet or V3 stream contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        await initFHEClient(publicClient, walletClient);
        const enc = await encryptAddress(params.recipientAddress);
        const fees = await estimateCappedFees(publicClient);

        const hash = await writeContractAsync({
          address: OBSCURA_PAY_STREAM_V3_ADDRESS,
          abi: OBSCURA_PAY_STREAM_V3_ABI,
          functionName: "createStream",
          args: [
            enc[0],
            BigInt(params.periodSeconds),
            BigInt(params.startTime),
            BigInt(params.endTime),
            params.jitterSeconds ?? 0,
          ],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 800_000n,
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") throw new Error("createStream reverted");

        const count = (await publicClient.readContract({
          address: OBSCURA_PAY_STREAM_V3_ADDRESS,
          abi: OBSCURA_PAY_STREAM_V3_ABI,
          functionName: "streamCount",
        })) as bigint;
        const streamId = count > 0n ? count - 1n : 0n;

        // Store recipient address locally (for display in StreamList).
        localStorage.setItem(
          `v3_stream_recipient_${streamId.toString()}`,
          params.recipientAddress
        );

        return { hash, streamId };
      } catch (err: any) {
        setError(err?.message ?? "createStream failed");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, address, writeContractAsync]
  );

  // ── tickStream ───────────────────────────────────────────────────────────

  /**
   * Release one payroll cycle:
   *   1. Ensure PAY ocUSDC operator is set for this stream contract.
   *   2. Encrypt cycle amount + recipient stealth address (signed for V3 stream).
   *   3. Call tickStream — contract moves funds employer→escrow, creates escrow record.
   *   4. Employee discovers escrow via events / stealth inbox and redeems.
   *
   * @param streamId     on-chain stream id
   * @param cycleAmount  raw uint64 amount in ocUSDC base units (6 dp)
   * @param stealthRecipientAddress  stealth address that can redeem the escrow
   * @param approver     optional approver address (address(0) = none)
   * @param approverSalt bytes32 salt for approver commit (ignored if approver is zero)
   */
  const tickStream = useCallback(
    async (params: {
      streamId: bigint;
      cycleAmount: bigint;
      stealthRecipientAddress: `0x${string}`;
      approver?: `0x${string}`;
      approverSalt?: `0x${string}`;
    }): Promise<{ hash: `0x${string}`; escrowId: bigint }> => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAY_STREAM_V3_ADDRESS
      ) {
        throw new Error("Wallet or V3 stream contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        // Step 1: ensure PAY ocUSDC operator approval.
        await ensureOperatorForV3();

        // Step 2: encrypt amount + recipient — both proofs consumed by stream contract.
        await initFHEClient(publicClient, walletClient);
        const encAmt = await encryptAmount(params.cycleAmount);
        const encRcp = await encryptAddress(params.stealthRecipientAddress);

        // Step 3: generate employer salt and store it (for cancel/approve later).
        const saltIdx = (loadSalts(address)[params.streamId.toString()] ?? []).length;
        const employerSalt = makeSalt(params.streamId, address, saltIdx);
        saveSalt(address, params.streamId, employerSalt);

        const approver = params.approver ?? (zeroAddress as `0x${string}`);
        const approverSalt = params.approverSalt ?? (`0x${"00".repeat(32)}` as `0x${string}`);

        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_PAY_STREAM_V3_ADDRESS,
          abi: OBSCURA_PAY_STREAM_V3_ABI,
          functionName: "tickStream",
          args: [
            params.streamId,
            encAmt[0],  // InEuint64
            encRcp[0],  // InEaddress
            employerSalt,
            approver,
            approverSalt,
          ],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 1_200_000n, // higher gas: creates escrow + resolver record
        });

        const receipt = await publicClient.waitForTransactionReceipt({ hash });
        if (receipt.status === "reverted") throw new Error("tickStream reverted");

        // Parse escrowId from CycleSettled event (second indexed arg).
        const settledLog = receipt.logs.find((l) =>
          l.topics[0] ===
          // keccak256("CycleSettled(uint256,uint256,uint64,uint64)")
          "0x" + keccak256(toHex("CycleSettled(uint256,uint256,uint64,uint64)")).slice(2)
        );
        const escrowId = settledLog?.topics[2]
          ? BigInt(settledLog.topics[2])
          : 0n;

        return { hash, escrowId };
      } catch (err: any) {
        setError(err?.message ?? "tickStream failed");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, address, writeContractAsync, ensureOperatorForV3]
  );

  // ── cancelStream ─────────────────────────────────────────────────────────

  const cancelStream = useCallback(
    async (streamId: bigint): Promise<`0x${string}`> => {
      if (!publicClient || !walletClient || !address || !OBSCURA_PAY_STREAM_V3_ADDRESS) {
        throw new Error("Wallet or V3 stream contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_PAY_STREAM_V3_ADDRESS,
          abi: OBSCURA_PAY_STREAM_V3_ABI,
          functionName: "cancelStream",
          args: [streamId],
          account: address,
          chain: arbitrumSepolia,
          ...fees,
          gas: 200_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err: any) {
        setError(err?.message ?? "cancelStream failed");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, address, writeContractAsync]
  );

  // ── setPaused ─────────────────────────────────────────────────────────────

  const setPaused = useCallback(
    async (streamId: bigint, paused: boolean): Promise<`0x${string}`> => {
      if (!publicClient || !walletClient || !address || !OBSCURA_PAY_STREAM_V3_ADDRESS) {
        throw new Error("Wallet or V3 stream contract not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: OBSCURA_PAY_STREAM_V3_ADDRESS,
          abi: OBSCURA_PAY_STREAM_V3_ABI,
          functionName: "setPaused",
          args: [streamId, paused],
          account: address,
          chain: arbitrumSepolia,
          ...fees,
          gas: 100_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (err: any) {
        setError(err?.message ?? "setPaused failed");
        throw err;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, address, writeContractAsync]
  );

  // ── getMyStreams ─────────────────────────────────────────────────────────

  const [streams, setStreams] = useState<StreamRowV3[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!publicClient || !address || !OBSCURA_PAY_STREAM_V3_ADDRESS) {
      setStreams([]);
      return;
    }
    setIsLoading(true);
    try {
      const ids = (await publicClient.readContract({
        address: OBSCURA_PAY_STREAM_V3_ADDRESS,
        abi: OBSCURA_PAY_STREAM_V3_ABI,
        functionName: "streamsByEmployer",
        args: [address],
      })) as bigint[];

      const now = BigInt(Math.floor(Date.now() / 1000));

      const rows = await Promise.all(
        ids.map(async (id) => {
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
            bigint,         // cyclesPaid   ← V3 order (not jitterSeconds)
            number,         // jitterSeconds ← V3 order (not cyclesPaid)
            boolean,        // paused
          ];

          const period = s[1];
          const lastTick = s[4];
          const pending = period > 0n ? (now - lastTick) / period : 0n;

          return {
            streamId: id,
            employer: s[0],
            periodSeconds: period,
            startTime: s[2],
            endTime: s[3],
            lastTickTime: lastTick,
            cyclesPaid: s[5],
            jitterSeconds: s[6],
            paused: s[7],
            pendingCycles: pending > 0n ? pending : 0n,
            version: "v3" as const,
          } satisfies StreamRowV3;
        })
      );

      setStreams(rows);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, address]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    streams,
    isLoading,
    isPending,
    error,
    createStream,
    tickStream,
    cancelStream,
    setPaused,
    ensureOperatorForV3,
    refresh,
  };
}
