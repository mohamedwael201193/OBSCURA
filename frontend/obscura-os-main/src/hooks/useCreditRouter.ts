/**
 * Wave 4 v3.16 — wallet-native production hooks.
 *
 * 1. useCreditRouter — collapses supplyCollateral + borrow into ONE wallet
 *    transaction via ObscuraCreditRouter. User signs once, Router multicalls
 *    market.supplyCollateralFor + market.borrowFor on the user's behalf.
 *    Same for repay+withdraw and the stealth-borrow variant.
 *
 * 2. useVaultQueue — withdraw-queue surface for ObscuraCreditVault v3.16.
 *    Free path: requestWithdraw → 24h delay → claimWithdraw.
 *    Fee path:  instantWithdraw (charges INSTANT_FEE_BPS = 0.2%).
 *
 * 3. useOperatorGrant — one-time setOperator(router, expiry) on the
 *    confidential collateral / loan asset. UI calls this from a modal
 *    before the first setupAndBorrow.
 *
 * Privacy contract honored throughout:
 *   - encrypted state mutations always go through writeContractAsync
 *   - FHEStepStatus.READY only set after waitForTransactionReceipt
 *   - `fhe` included in every useCallback dep array
 *   - never auto-decrypt on mount
 */
import { useCallback } from "react";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import {
  CREDIT_MARKET_ABI,
  CREDIT_ROUTER_ABI,
  CREDIT_ROUTER_ADDRESS,
  CREDIT_VAULT_ABI,
  CONFIDENTIAL_TOKEN_ABI,
} from "@/config/credit";
import { encryptAmount, initFHEClient } from "@/lib/fhe";
import { estimateCappedFees } from "@/lib/gas";
import { withRateLimitRetry } from "@/lib/rateLimit";
import { useFHEStatus } from "./useFHEStatus";
import { FHEStepStatus } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────
// 1. useCreditRouter
//    setupAndBorrow(market, collateralPlain, borrowPlain)
//    repayAndWithdraw(market, repayPlain, withdrawCollPlain)
//    setupAndBorrowStealth(market, collateralPlain, borrowPlain, stealthAddr,
//                         ephemeralPubKey, viewTag, metadata)
//
// Prerequisites (user must do once, surfaced via useOperatorGrant):
//   - collateralAsset.setOperator(router, expiry)
//   - loanAsset.setOperator(router, expiry)   // for repay path
// ─────────────────────────────────────────────────────────────────────────
export function useCreditRouter() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const fhe = useFHEStatus();

  const setupAndBorrow = useCallback(
    async (market: `0x${string}`, collateralPlain: bigint, borrowPlain: bigint) => {
      if (!publicClient || !walletClient || !address || !CREDIT_ROUTER_ADDRESS)
        throw new Error("router not ready");

      fhe.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);
      // Three encrypted inputs: collateral push to router, collateral push to
      // market, borrow output amount. All proofs are bound to the user (signer
      // of encryptInputs), so the Router can forward them as calldata.
      const [encCollPush, encCollMarket, encBorrow] = await Promise.all([
        encryptAmount(collateralPlain),
        encryptAmount(collateralPlain),
        encryptAmount(borrowPlain),
      ]);

      fhe.setStep(FHEStepStatus.SENDING);
      const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
      const hash = await writeContractAsync({
        address: CREDIT_ROUTER_ADDRESS,
        abi: CREDIT_ROUTER_ABI,
        functionName: "setupAndBorrow",
        args: [
          market,
          0n, // shieldAmt: caller already holds confidential balance
          collateralPlain,
          encCollPush[0],
          encCollMarket[0],
          borrowPlain,
          encBorrow[0],
        ],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 2_400_000n,
      });
      const r = await publicClient.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error("setupAndBorrow reverted");
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, address, writeContractAsync, fhe]
  );

  const repayAndWithdraw = useCallback(
    async (market: `0x${string}`, repayPlain: bigint, withdrawCollPlain: bigint) => {
      if (!publicClient || !walletClient || !address || !CREDIT_ROUTER_ADDRESS)
        throw new Error("router not ready");

      fhe.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);
      const [encRepayPush, encRepayMarket, encWithdraw] = await Promise.all([
        encryptAmount(repayPlain),
        encryptAmount(repayPlain),
        encryptAmount(withdrawCollPlain),
      ]);

      fhe.setStep(FHEStepStatus.SENDING);
      const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
      const hash = await writeContractAsync({
        address: CREDIT_ROUTER_ADDRESS,
        abi: CREDIT_ROUTER_ABI,
        functionName: "repayAndWithdraw",
        args: [
          market,
          repayPlain,
          encRepayPush[0],
          encRepayMarket[0],
          withdrawCollPlain,
          encWithdraw[0],
        ],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 2_400_000n,
      });
      const r = await publicClient.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error("repayAndWithdraw reverted");
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, address, writeContractAsync, fhe]
  );

  const setupAndBorrowStealth = useCallback(
    async (
      market: `0x${string}`,
      collateralPlain: bigint,
      borrowPlain: bigint,
      stealthAddress: `0x${string}`,
      ephemeralPubKey: `0x${string}`,
      viewTag: number,
      metadata: `0x${string}` = "0x"
    ) => {
      if (!publicClient || !walletClient || !address || !CREDIT_ROUTER_ADDRESS)
        throw new Error("router not ready");

      fhe.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);
      const [encCollPush, encCollMarket, encBorrow] = await Promise.all([
        encryptAmount(collateralPlain),
        encryptAmount(collateralPlain),
        encryptAmount(borrowPlain),
      ]);

      fhe.setStep(FHEStepStatus.SENDING);
      const fees = await withRateLimitRetry(() => estimateCappedFees(publicClient));
      const hash = await writeContractAsync({
        address: CREDIT_ROUTER_ADDRESS,
        abi: CREDIT_ROUTER_ABI,
        functionName: "setupAndBorrowStealth",
        args: [
          market,
          0n,
          collateralPlain,
          encCollPush[0],
          encCollMarket[0],
          borrowPlain,
          encBorrow[0],
          stealthAddress,
          ephemeralPubKey,
          viewTag,
          metadata,
        ],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 2_700_000n,
      });
      const r = await publicClient.waitForTransactionReceipt({ hash });
      if (r.status !== "success") throw new Error("setupAndBorrowStealth reverted");
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, address, writeContractAsync, fhe]
  );

  return { setupAndBorrow, repayAndWithdraw, setupAndBorrowStealth, fhe };
}

// ─────────────────────────────────────────────────────────────────────────
// 2. useVaultQueue — v3.16 withdraw-queue surface.
// ─────────────────────────────────────────────────────────────────────────
export function useVaultQueue(vault?: `0x${string}`) {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const fhe = useFHEStatus();

  const requestWithdraw = useCallback(
    async (sharesPlain: bigint) => {
      if (!publicClient || !vault || !address) throw new Error("vault not ready");
      fhe.setStep(FHEStepStatus.SENDING);
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: vault, abi: CREDIT_VAULT_ABI, functionName: "requestWithdraw",
        args: [sharesPlain], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 250_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, vault, address, writeContractAsync, fhe]
  );

  const cancelWithdraw = useCallback(async () => {
    if (!publicClient || !vault || !address) throw new Error("vault not ready");
    fhe.setStep(FHEStepStatus.SENDING);
    const fees = await estimateCappedFees(publicClient);
    const hash = await writeContractAsync({
      address: vault, abi: CREDIT_VAULT_ABI, functionName: "cancelWithdraw",
      args: [], account: address, chain: arbitrumSepolia,
      maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      gas: 200_000n,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    fhe.setStep(FHEStepStatus.READY);
    return hash;
  }, [publicClient, vault, address, writeContractAsync, fhe]);

  const claimWithdraw = useCallback(async () => {
    if (!publicClient || !vault || !address) throw new Error("vault not ready");
    fhe.setStep(FHEStepStatus.SENDING);
    const fees = await estimateCappedFees(publicClient);
    const hash = await writeContractAsync({
      address: vault, abi: CREDIT_VAULT_ABI, functionName: "claimWithdraw",
      args: [], account: address, chain: arbitrumSepolia,
      maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      gas: 900_000n,
    });
    await publicClient.waitForTransactionReceipt({ hash });
    fhe.setStep(FHEStepStatus.READY);
    return hash;
  }, [publicClient, vault, address, writeContractAsync, fhe]);

  const instantWithdraw = useCallback(
    async (sharesPlain: bigint) => {
      if (!publicClient || !vault || !address) throw new Error("vault not ready");
      fhe.setStep(FHEStepStatus.SENDING);
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: vault, abi: CREDIT_VAULT_ABI, functionName: "instantWithdraw",
        args: [sharesPlain], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 1_400_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, vault, address, writeContractAsync, fhe]
  );

  const getPending = useCallback(async (): Promise<{ amt: bigint; claimableAt: bigint }> => {
    if (!publicClient || !vault || !address) return { amt: 0n, claimableAt: 0n };
    const out = (await publicClient.readContract({
      address: vault, abi: CREDIT_VAULT_ABI, functionName: "getPendingWithdraw", args: [address],
    })) as [bigint, bigint];
    return { amt: out[0], claimableAt: out[1] };
  }, [publicClient, vault, address]);

  return { requestWithdraw, cancelWithdraw, claimWithdraw, instantWithdraw, getPending, fhe };
}

// ─────────────────────────────────────────────────────────────────────────
// 3. useOperatorGrant — one-time setOperator on confidential assets so the
//    Router can pull on the user's behalf during setupAndBorrow / repay.
// ─────────────────────────────────────────────────────────────────────────
export function useOperatorGrant() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  // 7 days default — matches Wave 2 pay-stream operator pattern.
  const DEFAULT_EXPIRY_SECONDS = 7n * 24n * 60n * 60n;

  const grant = useCallback(
    async (asset: `0x${string}`, operator: `0x${string}` = CREDIT_ROUTER_ADDRESS as any, expirySeconds: bigint = DEFAULT_EXPIRY_SECONDS) => {
      if (!publicClient || !address || !operator) throw new Error("grant not ready");
      const expiry = BigInt(Math.floor(Date.now() / 1000)) + expirySeconds;
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: asset, abi: CONFIDENTIAL_TOKEN_ABI, functionName: "setOperator",
        args: [operator, expiry], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 150_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [publicClient, address, writeContractAsync]
  );

  const isGranted = useCallback(
    async (asset: `0x${string}`, operator: `0x${string}` = CREDIT_ROUTER_ADDRESS as any): Promise<boolean> => {
      if (!publicClient || !address || !operator) return false;
      try {
        const ok = (await publicClient.readContract({
          address: asset, abi: CONFIDENTIAL_TOKEN_ABI, functionName: "isOperator",
          args: [address, operator],
        })) as boolean;
        return !!ok;
      } catch { return false; }
    },
    [publicClient, address]
  );

  return { grant, isGranted };
}

// Re-export CREDIT_MARKET_ABI so callers don't need a separate import for
// read-only follow-up calls (e.g. maxBorrowable preflight from the router UI).
export { CREDIT_MARKET_ABI };
