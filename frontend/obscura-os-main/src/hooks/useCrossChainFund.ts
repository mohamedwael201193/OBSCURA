import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { sepolia, arbitrumSepolia } from "viem/chains";
import { pad, parseUnits } from "viem";
import {
  CCTP_TOKEN_MESSENGER_SEPOLIA,
  CCTP_TOKEN_MESSENGER_ABI,
  USDC_SEPOLIA,
  ARBITRUM_SEPOLIA_DOMAIN,
  ERC20_APPROVE_ABI,
} from "@/config/wave2";

const USDC_DECIMALS = 6;

export type BridgeStep =
  | "idle"
  | "switching-to-sepolia"
  | "approve-pending"      // waiting for wallet signature
  | "approve-confirming"   // tx sent, waiting for receipt
  | "burn-pending"         // waiting for wallet signature
  | "burn-confirming"      // tx sent, waiting for receipt
  | "switching-back"       // switching wallet back to Arb Sepolia
  | "done";                // complete — USDC in transit

export function useCrossChainFund() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const [isPending, setIsPending] = useState(false);
  const [step, setStep] = useState<BridgeStep>("idle");
  const [burnTxHash, setBurnTxHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fund = useCallback(
    async (params: { amountUSDC: string }) => {
      if (!walletClient || !address) {
        throw new Error("Wallet not connected");
      }
      setIsPending(true);
      setError(null);
      setBurnTxHash(null);
      try {
        // 1. Switch to Sepolia
        setStep("switching-to-sepolia");
        await switchChainAsync({ chainId: sepolia.id });

        const amount = parseUnits(params.amountUSDC, USDC_DECIMALS);

        // 2. Approve USDC
        setStep("approve-pending");
        const approveHash = await writeContractAsync({
          address: USDC_SEPOLIA,
          abi: ERC20_APPROVE_ABI,
          functionName: "approve",
          args: [CCTP_TOKEN_MESSENGER_SEPOLIA, amount],
          account: address,
          chain: sepolia,
        });
        setStep("approve-confirming");
        await publicClient!.waitForTransactionReceipt({ hash: approveHash });

        // 3. Burn USDC via CCTP
        setStep("burn-pending");
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
        setStep("burn-confirming");
        setBurnTxHash(burnHash);
        await publicClient!.waitForTransactionReceipt({ hash: burnHash });

        // 4. Switch back to Arb Sepolia
        setStep("switching-back");
        try {
          await switchChainAsync({ chainId: arbitrumSepolia.id });
        } catch {
          // non-critical — user can switch manually
        }

        setStep("done");
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

  const reset = useCallback(() => {
    setStep("idle");
    setBurnTxHash(null);
    setError(null);
  }, []);

  return { fund, isPending, step, burnTxHash, error, reset };
}
