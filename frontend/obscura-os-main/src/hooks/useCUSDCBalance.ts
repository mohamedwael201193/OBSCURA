import { useCallback, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { parseUnits } from "viem";
import {
  REINEIRA_CUSDC_ABI,
  REINEIRA_CUSDC_ADDRESS,
  OBSCURA_PAY_STREAM_ADDRESS,
  USDC_ARB_SEPOLIA,
  ERC20_APPROVE_ABI,
} from "@/config/wave2";
import { initFHEClient, encryptAmount, decryptBalance } from "@/lib/fhe";

const USDC_DECIMALS = 6;

export function useCUSDCBalance() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [decrypted, setDecrypted] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: handle, refetch } = useReadContract({
    address: REINEIRA_CUSDC_ADDRESS,
    abi: REINEIRA_CUSDC_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!REINEIRA_CUSDC_ADDRESS },
  });

  const reveal = useCallback(async () => {
    if (!publicClient || !walletClient || !address || handle === undefined) return;
    setBusy(true);
    setError(null);
    try {
      await initFHEClient(publicClient, walletClient);
      const plain = await decryptBalance(handle as bigint);
      setDecrypted(plain);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }, [publicClient, walletClient, address, handle]);

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
      return hash;
    },
    [publicClient, address, writeContractAsync, refetch]
  );

  return {
    handle: handle as bigint | undefined,
    decrypted,
    reveal,
    wrap,
    approveStream,
    refetch,
    busy,
    error,
  };
}

