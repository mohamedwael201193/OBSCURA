import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { encodeAbiParameters } from "viem";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
  REINEIRA_CUSDC_ABI,
  REINEIRA_CUSDC_ADDRESS,
} from "@/config/wave2";
import { initFHEClient, encryptAmount } from "@/lib/fhe";
import { deriveStealthPayment, type MetaAddress } from "@/lib/stealth";

/**
 * useTickStream — releases ONE cycle on a stream:
 *
 * Flow (direct-transfer mode — bypasses broken PayStream contract):
 *   1. derive a fresh stealth recipient + ephemeral pubkey + viewTag
 *   2. encrypt the cycle amount via cofhe-sdk
 *   3. call cUSDC.confidentialTransfer(stealthAddr, InEuint64) — money moves
 *      directly from the employer to the stealth address
 *   4. announce the stealth payment to ObscuraStealthRegistry so the
 *      recipient's wallet can scan it
 *
 * Background: The deployed ObscuraPayStream compiles euint64 as bytes32
 * (our @fhenixprotocol/cofhe-contracts), but Reineira cUSDC uses uint256.
 * This selector mismatch causes every tickStream call to revert. Rather
 * than redeploy, we bypass the contract and call cUSDC directly.
 */
export function useTickStream() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [isTicking, setIsTicking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** ABI for the InEuint64-accepting overload of confidentialTransfer */
  const CUSDC_TRANSFER_ABI = [
    {
      type: "function" as const,
      name: "confidentialTransfer" as const,
      stateMutability: "nonpayable" as const,
      inputs: [
        { name: "to", type: "address" as const },
        {
          name: "amount",
          type: "tuple" as const,
          components: [
            { name: "ctHash", type: "uint256" as const },
            { name: "securityZone", type: "uint8" as const },
            { name: "utype", type: "uint8" as const },
            { name: "signature", type: "bytes" as const },
          ],
        },
      ],
      outputs: [{ name: "", type: "bool" as const }],
    },
  ] as const;

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
        !REINEIRA_CUSDC_ADDRESS ||
        !OBSCURA_STEALTH_REGISTRY_ADDRESS
      ) {
        throw new Error("Wallet or contracts not configured");
      }
      setIsTicking(true);
      setError(null);
      try {
        // 1. Derive the stealth payment off-chain.
        const stealth = deriveStealthPayment(params.recipientMeta);

        // 2. Encrypt ONLY the amount (no address needed — no escrow).
        await initFHEClient(publicClient, walletClient);
        const encrypted = await encryptAmount(params.amount);
        // encrypted = [InEuint64]  (array with one element)
        const inEuint64 = encrypted[0];

        // 3. Direct cUSDC transfer: employer → stealth address.
        //    Uses the InEuint64-accepting overload (selector 0xa794ee95).
        const feeData = await publicClient.estimateFeesPerGas();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 150n) / 100n
          : undefined;

        const txHash = await writeContractAsync({
          address: REINEIRA_CUSDC_ADDRESS,
          abi: CUSDC_TRANSFER_ABI,
          functionName: "confidentialTransfer",
          args: [stealth.stealthAddress as `0x${string}`, inEuint64],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas,
          gas: 1_500_000n,
        });

        // 4. Wait for the transfer receipt.
        const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash });
        if (receipt.status === "reverted") {
          throw new Error(
            `cUSDC confidentialTransfer reverted on-chain (tx ${txHash.slice(0, 10)}…). ` +
            `Check: sufficient cUSDC balance?`
          );
        }

        // 5. Announce so the recipient can find it.
        //    Small delay to avoid MetaMask RPC rate-limiting (back-to-back txs).
        await new Promise((r) => setTimeout(r, 2_000));

        const feeData2 = await publicClient.estimateFeesPerGas();
        const maxFeePerGas2 = feeData2.maxFeePerGas
          ? (feeData2.maxFeePerGas * 150n) / 100n
          : undefined;

        const metadata = encodeAbiParameters(
          [
            { name: "streamId", type: "uint256" },
            { name: "escrowId", type: "uint256" },
          ],
          [params.streamId, 0n]
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

        return { txHash, escrowId: null, stealth };
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

// Suppress unused import warnings for re-exports used by other modules.
void REINEIRA_CUSDC_ABI;
