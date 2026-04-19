import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { formatUnits, parseUnits } from "viem";
import {
  REINEIRA_CUSDC_ABI,
  REINEIRA_CUSDC_ADDRESS,
  OBSCURA_PAY_STREAM_ADDRESS,
  USDC_ARB_SEPOLIA,
  ERC20_APPROVE_ABI,
} from "@/config/wave2";
import { initFHEClient, encryptAmount, decryptBalance, getOrCreatePermit } from "@/lib/fhe";

const USDC_DECIMALS = 6;

const USDC_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function useCUSDCBalance() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [decrypted, setDecrypted] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [trackedCusdc, setTrackedCusdc] = useState<string | null>(null);

  const { data: handle, refetch } = useReadContract({
    address: REINEIRA_CUSDC_ADDRESS,
    abi: REINEIRA_CUSDC_ABI,
    functionName: "confidentialBalanceOf",
    args: address ? [address] : undefined,
    account: address,
    query: { enabled: false },
  });

  // Fetch handle + USDC balance on mount
  useEffect(() => {
    if (address && REINEIRA_CUSDC_ADDRESS) refetch();
    if (address && publicClient) {
      publicClient.readContract({
        address: USDC_ARB_SEPOLIA,
        abi: USDC_BALANCE_ABI,
        functionName: "balanceOf",
        args: [address],
      }).then((bal) => {
        setUsdcBalance(formatUnits(bal as bigint, USDC_DECIMALS));
      }).catch(() => {});
    }
    // Restore tracked cUSDC from localStorage
    if (address) {
      const saved = localStorage.getItem(`cusdc_tracked_${address}`);
      if (saved) setTrackedCusdc(saved);
    }
  }, [address, publicClient, refetch]);

  const reveal = useCallback(async () => {
    if (!publicClient || !walletClient || !address) {
      setError("Wallet not connected");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await initFHEClient(publicClient, walletClient);
      await getOrCreatePermit();

      const result = await refetch();
      const freshHandle = result.data;

      if (!freshHandle) {
        throw new Error("No cUSDC balance found. Wrap some USDC first.");
      }

      const plain = await decryptBalance(freshHandle as bigint);
      setDecrypted(plain);
    } catch (e) {
      const msg = (e as Error).message || "Decrypt failed";
      console.error("[cUSDC reveal]", e);

      // If 403 (ACL not granted by Reineira contract), fall back to tracked balance
      if (msg.includes("403") || msg.includes("sealOutput")) {
        if (trackedCusdc) {
          setError(
            `The Reineira cUSDC contract doesn't grant decrypt access (HTTP 403). ` +
            `Showing your last known balance: ~${trackedCusdc} cUSDC.`
          );
        } else {
          setError(
            `The Reineira cUSDC contract doesn't grant decrypt access (HTTP 403). ` +
            `Your encrypted handle exists — the balance is on-chain but can't be revealed from the browser. ` +
            `Wrap USDC below to track your balance.`
          );
        }
        return; // Don't re-throw — we handled it
      }

      setError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }, [publicClient, walletClient, address, refetch, trackedCusdc]);

  const approveStream = useCallback(
    async (maxAmount: bigint) => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !OBSCURA_PAY_STREAM_ADDRESS ||
        !REINEIRA_CUSDC_ADDRESS
      ) {
        throw new Error("Wallet or contracts not configured");
      }
      await initFHEClient(publicClient, walletClient);
      const enc = await encryptAmount(maxAmount);
      const ctHash = (enc[0] as { ctHash: bigint }).ctHash;

      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 130n) / 100n
        : undefined;

      const hash = await writeContractAsync({
        address: REINEIRA_CUSDC_ADDRESS,
        abi: REINEIRA_CUSDC_ABI,
        functionName: "approve",
        args: [OBSCURA_PAY_STREAM_ADDRESS, ctHash],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas,
        gas: 500_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [publicClient, walletClient, address, writeContractAsync]
  );

  const wrap = useCallback(
    async (amountUSDC: string) => {
      if (!publicClient || !address || !REINEIRA_CUSDC_ADDRESS) {
        throw new Error("Wallet not configured");
      }
      const amount = parseUnits(amountUSDC, USDC_DECIMALS);

      // Step 1: Check allowance — approve cUSDC contract to pull plain USDC if needed
      const currentAllowance = await publicClient.readContract({
        address: USDC_ARB_SEPOLIA,
        abi: [{
          type: "function",
          name: "allowance",
          stateMutability: "view",
          inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }],
          outputs: [{ name: "", type: "uint256" }],
        }] as const,
        functionName: "allowance",
        args: [address, REINEIRA_CUSDC_ADDRESS],
      }) as bigint;

      if (currentAllowance < amount) {
        const feeData = await publicClient.estimateFeesPerGas();
        const approveMaxFee = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 130n) / 100n
          : undefined;
        const approveTx = await writeContractAsync({
          address: USDC_ARB_SEPOLIA,
          abi: ERC20_APPROVE_ABI,
          functionName: "approve",
          args: [REINEIRA_CUSDC_ADDRESS, amount],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: approveMaxFee,
          gas: 100_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
        // Wait 2s to avoid RPC rate-limit between approve and wrap
        await new Promise((r) => setTimeout(r, 2000));
      }

      // Step 2: Wrap USDC → cUSDC (fresh gas estimate)
      const feeData2 = await publicClient.estimateFeesPerGas();
      const wrapMaxFee = feeData2.maxFeePerGas
        ? (feeData2.maxFeePerGas * 130n) / 100n
        : undefined;
      const hash = await writeContractAsync({
        address: REINEIRA_CUSDC_ADDRESS,
        abi: REINEIRA_CUSDC_ABI,
        functionName: "wrap",
        args: [address, amount],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: wrapMaxFee,
        gas: 600_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();

      // Track wrapped cUSDC balance locally (Reineira doesn't allow on-chain decrypt)
      const prev = parseFloat(trackedCusdc || "0");
      const newTotal = (prev + parseFloat(amountUSDC)).toFixed(6);
      setTrackedCusdc(newTotal);
      localStorage.setItem(`cusdc_tracked_${address}`, newTotal);

      // Refresh USDC balance
      publicClient.readContract({
        address: USDC_ARB_SEPOLIA,
        abi: USDC_BALANCE_ABI,
        functionName: "balanceOf",
        args: [address],
      }).then((bal) => {
        setUsdcBalance(formatUnits(bal as bigint, USDC_DECIMALS));
      }).catch(() => {});

      return hash;
    },
    [publicClient, address, writeContractAsync, refetch]
  );

  return {
    handle: handle as bigint | undefined,
    decrypted,
    usdcBalance,
    trackedCusdc,
    reveal,
    wrap,
    approveStream,
    refetch,
    busy,
    error,
  };
}

