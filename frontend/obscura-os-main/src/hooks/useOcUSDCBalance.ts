import { useCallback, useEffect, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useReadContract,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { createWalletClient, custom, formatUnits, parseUnits } from "viem";
import {
  USDC_ARB_SEPOLIA,
  ERC20_APPROVE_ABI,
} from "@/config/pay";
import {
  OBSCURA_PAY_STREAM_V2_ADDRESS,
} from "@/config/payV2";
import {
  CONFIDENTIAL_TOKEN_ABI,
} from "@/config/credit";
import { OBSCURA_PAY_OCUSDC_ADDRESS } from "@/config/payV3";

// ocUSDC balance hook — wraps/unwraps USDC ↔ ocUSDC.
// Uses the Wave 5 PAY ocUSDC wrapper (backed by Circle USDC).
const OCUSDC_ADDRESS = OBSCURA_PAY_OCUSDC_ADDRESS;
const OCUSDC_ABI = CONFIDENTIAL_TOKEN_ABI;
import { initFHEClient, encryptAmount, decryptBalance, getOrCreatePermit } from "@/lib/fhe";
import { withRateLimitRetry } from "@/lib/rateLimit";
import { estimateCappedFees } from "@/lib/gas";
import { addTrackedUnits, setTrackedUnits, getTrackedFormatted } from "@/lib/trackedBalance";
import { parseUSDC, USDC_DECIMALS } from "@/lib/usdc";

/** Fetch gas fees with retry � safe because no wallet popup is involved. */
async function estimateFeesWithRetry(publicClient: ReturnType<typeof usePublicClient>) {
  return withRateLimitRetry(() => publicClient!.estimateFeesPerGas());
}

const USDC_BALANCE_ABI = [
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "account", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function useOcUSDCBalance() {
  const { address, connector, chainId } = useAccount();
  const publicClient = usePublicClient({ chainId: arbitrumSepolia.id });
  const { data: walletClient } = useWalletClient({ account: address });
  const { writeContractAsync } = useWriteContract();
  const [decrypted, setDecrypted] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [usdcBalance, setUsdcBalance] = useState<string | null>(null);
  const [trackedCusdc, setTrackedCusdc] = useState<string | null>(null);

  const { data: handle, refetch } = useReadContract({
    address: OCUSDC_ADDRESS,
    abi: OCUSDC_ABI,
    functionName: "confidentialBalanceOf",
    args: address ? [address] : undefined,
    account: address,
    query: { enabled: false },
  });

  // Fetch handle + USDC balance on mount
  useEffect(() => {
    if (address && OCUSDC_ADDRESS) refetch();
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
    // Restore tracked cUSDC from localStorage (centralized in lib/trackedBalance).
    if (address) {
      const formatted = getTrackedFormatted(address);
      setTrackedCusdc(formatted === "0" ? null : formatted);
    }
  }, [address, publicClient, refetch]);

  const reveal = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const ensureArbSepolia = async (request?: (args: { method: string; params?: any[] }) => Promise<any>) => {
        if (!request) return;
        const activeChainId = await request({ method: "eth_chainId" }).catch(() => null);
        if (typeof activeChainId === "string" && activeChainId.toLowerCase() !== "0x66eee") {
          await request({ method: "wallet_switchEthereumChain", params: [{ chainId: "0x66eee" }] });
        }
      };

      let activeWalletClient = chainId === arbitrumSepolia.id ? walletClient : undefined;
      if ((!activeWalletClient || chainId !== arbitrumSepolia.id) && address && connector) {
        if (chainId !== arbitrumSepolia.id && connector.switchChain) {
          await connector.switchChain({ chainId: arbitrumSepolia.id });
        }
        const provider = await connector.getProvider();
        if (provider) {
          const request = (provider as any).request?.bind(provider);
          await ensureArbSepolia(request);
          activeWalletClient = createWalletClient({
            account: address,
            transport: custom(provider as any),
          });
        }
      }

      if (!publicClient || !activeWalletClient || !address) {
        throw new Error("Wallet not connected");
      }

      await ensureArbSepolia((activeWalletClient as any).request?.bind(activeWalletClient));

      await initFHEClient(publicClient, activeWalletClient);
      await getOrCreatePermit();

      const result = await refetch();
      const freshHandle = result.data;

      if (!freshHandle) {
        throw new Error("No ocUSDC balance found. Shield some USDC first.");
      }

      const plain = await decryptBalance(freshHandle as bigint);
      setDecrypted(plain);
      // Persist on-chain value to localStorage so other components
      // (e.g. PayHomeDashboard) can read it without triggering FHE.
      if (plain > 0n) {
        setTrackedUnits(address, plain);
        setTrackedCusdc(getTrackedFormatted(address));
      }
      return plain;
    } catch (e) {
      const msg = (e as Error).message || "Decrypt failed";
      console.error("[ocUSDC reveal]", e);
      setError(msg);
      throw e;
    } finally {
      setBusy(false);
    }
  }, [publicClient, walletClient, address, connector, chainId, refetch, trackedCusdc]);

  const approveStream = useCallback(
    async (durationDays: number) => {
      if (
        !publicClient ||
        !address ||
        !OBSCURA_PAY_STREAM_V2_ADDRESS ||
        !OCUSDC_ADDRESS
      ) {
        throw new Error("Wallet or contracts not configured");
      }

      // Pre-check: skip if already an operator
      try {
        const isOp = await publicClient.readContract({
          address: OCUSDC_ADDRESS,
          abi: OCUSDC_ABI,
          functionName: "isOperator",
          args: [address, OBSCURA_PAY_STREAM_V2_ADDRESS],
        });
        if (isOp as boolean) {
          return "already-approved";
        }
      } catch { /* proceed with approval */ }

      const untilTimestamp = BigInt(Math.floor(Date.now() / 1000) + durationDays * 86400);

      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 130n) / 100n
        : undefined;

      const hash = await writeContractAsync({
        address: OCUSDC_ADDRESS,
        abi: OCUSDC_ABI,
        functionName: "setOperator",
        args: [OBSCURA_PAY_STREAM_V2_ADDRESS, untilTimestamp],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas,
        gas: 100_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [publicClient, address, writeContractAsync]
  );

  const wrap = useCallback(
    async (amountUSDC: string) => {
      if (!publicClient || !address || !OCUSDC_ADDRESS) {
        throw new Error("Wallet not configured");
      }
      const amount = parseUnits(amountUSDC, USDC_DECIMALS);

      // Step 1: Check allowance — approve ocUSDC to pull plain USDC if needed
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
        args: [address, OCUSDC_ADDRESS],
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
          args: [OCUSDC_ADDRESS, amount],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: approveMaxFee,
          gas: 100_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash: approveTx });
        // Wait 5s to avoid RPC rate-limit between approve and wrap
        await new Promise((r) => setTimeout(r, 5000));
      }

      // Step 2: Fetch gas (with retry) then shield USDC → ocUSDC exactly ONCE
      // Do NOT wrap writeContractAsync in retry — each retry would open a new MetaMask popup
      const feeData2 = await estimateFeesWithRetry(publicClient);
      const wrapMaxFee = feeData2.maxFeePerGas
        ? (feeData2.maxFeePerGas * 130n) / 100n
        : undefined;
      const hash = await writeContractAsync({
        address: OCUSDC_ADDRESS,
        abi: OCUSDC_ABI,
        functionName: "shield",
        args: [amount],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: wrapMaxFee,
        gas: 600_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();

      // Track shielded ocUSDC balance locally.
      // Centralized writer (lib/trackedBalance) keeps the format consistent
      // across all writers (sweep, escrow redeem, wrap, unwrap).
      const updated = addTrackedUnits(address, amount);
      setTrackedCusdc(formatUnits(updated, USDC_DECIMALS));

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

  const unwrap = useCallback(
    async (amountCUSDC: string) => {
      if (!publicClient || !walletClient || !address || !OCUSDC_ADDRESS) {
        throw new Error("Wallet not configured");
      }
      const amount = parseUnits(amountCUSDC, USDC_DECIMALS);
      // amtPlain as uint64; USDC at 6 decimals fits well within uint64 range.
      const amtPlain = amount;

      // Pre-flight: validate against revealed balance if available.
      // Prevents "supply" revert when user tries to unshield more than they shielded.
      if (decrypted !== null && amtPlain > decrypted) {
        throw new Error(
          `Amount exceeds your ocUSDC balance (${formatUnits(decrypted, USDC_DECIMALS)} available). Reveal your balance first if unsure.`
        );
      }

      // Step 1: Encrypt amount client-side — unshield requires both plain + FHE proof.
      await initFHEClient(publicClient, walletClient);
      const encAmt = await encryptAmount(amtPlain);

      // Step 2: Fetch gas then unshield ONCE — never retry the wallet write.
      // Signature: unshield(uint64 amtPlain, InEuint64 encAmt, address to)
      const feeData = await estimateFeesWithRetry(publicClient);
      const maxFee = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 130n) / 100n
        : undefined;
      const hash = await writeContractAsync({
        address: OCUSDC_ADDRESS,
        abi: OCUSDC_ABI,
        functionName: "unshield",
        args: [amtPlain, encAmt[0], address],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: maxFee,
        gas: 600_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      await refetch();

      // Update tracked ocUSDC balance (centralized writer).
      const updated = addTrackedUnits(address, -amount);
      setTrackedCusdc(formatUnits(updated, USDC_DECIMALS));

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
    [publicClient, walletClient, address, writeContractAsync, refetch, trackedCusdc, decrypted]
  );

  return {
    handle: handle as bigint | undefined,
    decrypted,
    usdcBalance,
    trackedCusdc,
    reveal,
    wrap,
    unwrap,
    approveStream,
    refetch,
    busy,
    error,
  };
}

