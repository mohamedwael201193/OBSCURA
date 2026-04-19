import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { sepolia } from "viem/chains";
import { encodeAbiParameters, pad, parseUnits } from "viem";
import {
  CCTP_TOKEN_MESSENGER_SEPOLIA,
  CCTP_TOKEN_MESSENGER_ABI,
  USDC_SEPOLIA,
  ARBITRUM_SEPOLIA_DOMAIN,
  ERC20_APPROVE_ABI,
  REINEIRA_CCTP_RECEIVER_ADDRESS,
} from "@/config/wave2";

const USDC_DECIMALS = 6;

/**
 * useCrossChainFund — send USDC from Ethereum Sepolia to fund an existing
 * Obscura escrow on Arbitrum Sepolia in one transaction using CCTP V2 hooks.
 *
 * Flow:
 *   1. Switch wallet to Sepolia (11155111).
 *   2. Approve TokenMessengerV2 to pull USDC.
 *   3. Call depositForBurnWithHook(...) with hookData = abi.encode(escrowId).
 *   4. Iris attestation + the ReineiraCCTPReceiver on Arb Sepolia auto-funds
 *      the escrow once the message is finalised. We just return the burn tx
 *      hash; the receiver handles the rest.
 */
export function useCrossChainFund() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const [isPending, setIsPending] = useState(false);
  const [step, setStep] = useState<string>("idle");
  const [error, setError] = useState<string | null>(null);

  const fund = useCallback(
    async (params: { escrowId: bigint; amountUSDC: string }) => {
      if (!walletClient || !address || !REINEIRA_CCTP_RECEIVER_ADDRESS) {
        throw new Error("Wallet or receiver not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        setStep("switching-chain");
        await switchChainAsync({ chainId: sepolia.id });

        const amount = parseUnits(params.amountUSDC, USDC_DECIMALS);

        setStep("approving-usdc");
        const approveHash = await writeContractAsync({
          address: USDC_SEPOLIA,
          abi: ERC20_APPROVE_ABI,
          functionName: "approve",
          args: [CCTP_TOKEN_MESSENGER_SEPOLIA, amount],
          account: address,
          chain: sepolia,
        });
        await publicClient!.waitForTransactionReceipt({ hash: approveHash });

        setStep("burning");
        const hookData = encodeAbiParameters(
          [{ name: "escrowId", type: "uint256" }],
          [params.escrowId]
        );
        const mintRecipient = pad(REINEIRA_CCTP_RECEIVER_ADDRESS, { size: 32 });

        const burnHash = await writeContractAsync({
          address: CCTP_TOKEN_MESSENGER_SEPOLIA,
          abi: CCTP_TOKEN_MESSENGER_ABI,
          functionName: "depositForBurnWithHook",
          args: [
            amount,
            ARBITRUM_SEPOLIA_DOMAIN,
            mintRecipient,
            USDC_SEPOLIA,
            "0x0000000000000000000000000000000000000000000000000000000000000000",
            0n,
            1000,
            hookData,
          ],
          account: address,
          chain: sepolia,
          gas: 400_000n,
        });

        setStep("submitted");
        return burnHash;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [walletClient, address, switchChainAsync, writeContractAsync, publicClient]
  );

  return { fund, isPending, step, error };
}
