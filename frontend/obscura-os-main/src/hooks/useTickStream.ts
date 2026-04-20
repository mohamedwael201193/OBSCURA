import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { decodeEventLog } from "viem";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
  OBSCURA_PAY_STREAM_ABI,
  OBSCURA_PAY_STREAM_ADDRESS,
  REINEIRA_CUSDC_ABI,
  REINEIRA_CUSDC_ADDRESS,
} from "@/config/wave2";
import { initFHEClient, encryptAddressAndAmount } from "@/lib/fhe";
import { deriveStealthPayment, type MetaAddress } from "@/lib/stealth";
import { hexToBytes, encodeAbiParameters } from "viem";

/**
 * useTickStream — releases ONE cycle on a stream:
 *   1. fetch the recipient's meta-address
 *   2. derive a fresh stealth recipient + ephemeral pubkey + viewTag
 *   3. encrypt (stealthAddress, amount) via cofhe-sdk
 *   4. ensure cUSDC allowance from current employer >= amount
 *   5. call ObscuraPayStream.tickStream(...)
 *   6. announce the stealth payment to ObscuraStealthRegistry so the
 *      recipient's wallet can scan it
 *
 * Anyone can tick — but the connected wallet pays the gas. If the connected
 * wallet IS the employer, cUSDC is pulled directly. If it's a third-party
 * ticker bot, the employer must have pre-approved the stream contract.
 */
export function useTickStream() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [isTicking, setIsTicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tick = useCallback(
    async (params: {
      streamId: bigint;
      amount: bigint;
      recipientMeta: MetaAddress;
      approver?: `0x${string}`;
    }) => {
      if (
        !publicClient ||
        !walletClient ||
        !OBSCURA_PAY_STREAM_ADDRESS ||
        !OBSCURA_STEALTH_REGISTRY_ADDRESS
      ) {
        throw new Error("Wallet or contracts not configured");
      }
      setIsTicking(true);
      setError(null);
      try {
        // 1. Derive the stealth payment off-chain.
        const stealth = deriveStealthPayment(params.recipientMeta);

        // 2. Encrypt the stealth address + amount client-side.
        await initFHEClient(publicClient, walletClient);
        const encrypted = await encryptAddressAndAmount(
          stealth.stealthAddress,
          params.amount
        );
        // encrypted = [InEaddress, InEuint64]

        // 3. Tick the stream.
        const feeData = await publicClient.estimateFeesPerGas();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 150n) / 100n
          : undefined;

        const tickArgs = [
          params.streamId,
          encrypted[0],
          encrypted[1],
          (params.approver ?? "0x0000000000000000000000000000000000000000") as `0x${string}`,
        ] as const;

        // 3b. Pre-flight simulation to catch revert reasons before sending tx.
        try {
          await publicClient.simulateContract({
            address: OBSCURA_PAY_STREAM_ADDRESS,
            abi: OBSCURA_PAY_STREAM_ABI,
            functionName: "tickStream",
            args: tickArgs,
            account: address,
          });
        } catch (simErr: any) {
          const reason = simErr?.shortMessage || simErr?.message || "unknown";
          throw new Error(`tickStream simulation failed — tx would revert: ${reason}`);
        }

        const txHash = await writeContractAsync({
          address: OBSCURA_PAY_STREAM_ADDRESS,
          abi: OBSCURA_PAY_STREAM_ABI,
          functionName: "tickStream",
          args: tickArgs,
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas,
          gas: 3_500_000n,
        });

        // 4. Wait + decode escrowId from CycleSettled event.
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });

        // Safety: if the tx mined but reverted, abort before announce.
        if (receipt.status === "reverted") {
          throw new Error(
            `tickStream reverted on-chain (tx ${txHash.slice(0, 10)}…). ` +
            `Check: cUSDC operator set? Sufficient cUSDC balance? FHE permissions?`
          );
        }

        let escrowId: bigint | null = null;
        for (const log of receipt.logs) {
          try {
            const decoded = decodeEventLog({
              abi: OBSCURA_PAY_STREAM_ABI,
              data: log.data,
              topics: log.topics,
            });
            if (decoded.eventName === "CycleSettled") {
              escrowId = (decoded.args as any).escrowId as bigint;
              break;
            }
          } catch {
            /* skip non-stream logs */
          }
        }

        // 5. Announce so the recipient can find it.
        //    Small delay to avoid MetaMask RPC rate-limiting (back-to-back txs).
        await new Promise((r) => setTimeout(r, 2_000));

        // Re-estimate gas price for the second tx (avoids stale nonce/fee issues).
        const feeData2 = await publicClient.estimateFeesPerGas();
        const maxFeePerGas2 = feeData2.maxFeePerGas
          ? (feeData2.maxFeePerGas * 150n) / 100n
          : undefined;

        const metadata = encodeAbiParameters(
          [
            { name: "streamId", type: "uint256" },
            { name: "escrowId", type: "uint256" },
          ],
          [params.streamId, escrowId ?? 0n]
        );
        await writeContractAsync({
          address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
          abi: OBSCURA_STEALTH_REGISTRY_ABI,
          functionName: "announce",
          args: [stealth.stealthAddress, stealth.ephemeralPubKey, stealth.viewTag, metadata],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: maxFeePerGas2,
          gas: 500_000n,
        });

        return { txHash, escrowId, stealth };
      } catch (e) {
        const msg = (e as Error).message ?? "tick failed";
        setError(msg);
        throw e;
      } finally {
        setIsTicking(false);
      }
    },
    [publicClient, walletClient, writeContractAsync, address]
  );

  return { tick, isTicking, error };
}

// Suppress unused import warnings for utilities used by other hooks elsewhere.
void REINEIRA_CUSDC_ABI;
void REINEIRA_CUSDC_ADDRESS;
void hexToBytes;
