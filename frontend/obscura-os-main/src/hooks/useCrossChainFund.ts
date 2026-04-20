import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { sepolia } from "viem/chains";
import { pad, parseUnits } from "viem";
import {
  CCTP_TOKEN_MESSENGER_SEPOLIA,
  CCTP_TOKEN_MESSENGER_ABI,
  USDC_SEPOLIA,
  ARBITRUM_SEPOLIA_DOMAIN,
  ERC20_APPROVE_ABI,
} from "@/config/wave2";

const USDC_DECIMALS = 6;

/**
 * useCrossChainFund — bridge USDC from Ethereum Sepolia to the user's address
 * on Arbitrum Sepolia using CCTP V1 depositForBurn.
 *
 * Flow:
 *   1. Switch wallet to Sepolia (11155111).
 *   2. Approve TokenMessenger to pull USDC.
 *   3. Call depositForBurn(amount, destinationDomain, mintRecipient, burnToken).
 *   4. USDC is minted on Arb Sepolia after Circle attestation (~minutes).
 *      User can then wrap USDC → cUSDC via the existing wrap flow.
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
    async (params: { amountUSDC: string }) => {
      if (!walletClient || !address) {
        throw new Error("Wallet not connected");
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
        const mintRecipient = pad(address, { size: 32 });

        const burnHash = await writeContractAsync({
          address: CCTP_TOKEN_MESSENGER_SEPOLIA,
          abi: CCTP_TOKEN_MESSENGER_ABI,
          functionName: "depositForBurn",
          args: [
            amount,
            ARBITRUM_SEPOLIA_DOMAIN,
            mintRecipient,
            USDC_SEPOLIA,
          ],
          account: address,
          chain: sepolia,
          gas: 300_000n,
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
