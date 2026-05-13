/**
 * Wave 4 Credit — React/wagmi hooks.
 *
 * Single-file aggregator: every credit feature exposes one hook. Patterns
 * mirror useConfidentialEscrow / useInsuranceSubscription verbatim.
 *
 * Contract calls go through writeContractAsync with capped EIP-1559 fees
 * (estimateCappedFees) and per-call gas caps from CREDIT_GAS_CAPS so
 * dashboards can pre-warn on out-of-gas before the user signs.
 */
import { useCallback, useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract, useWalletClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import {
  CREDIT_AUCTION_ABI,
  CREDIT_AUCTION_ADDRESS,
  CREDIT_FACTORY_ABI,
  CREDIT_FACTORY_ADDRESS,
  CREDIT_GAS_CAPS,
  CREDIT_GOVERNANCE_PROXY_ABI,
  CREDIT_GOVERNANCE_PROXY_ADDRESS,
  CREDIT_INSURANCE_HOOK_ABI,
  CREDIT_INSURANCE_HOOK_ADDRESS,
  CREDIT_IRM_ABI,
  CREDIT_IRM_ADDRESS,
  CREDIT_MARKETS,
  CREDIT_MARKET_ABI,
  CREDIT_ORACLE_ABI,
  CREDIT_ORACLE_ADDRESS,
  CREDIT_SCORE_ABI,
  CREDIT_SCORE_ADDRESS,
  CREDIT_STREAM_HOOK_ABI,
  CREDIT_STREAM_HOOK_ADDRESS,
  CREDIT_VAULTS,
  CREDIT_VAULT_ABI,
  type CreditMarketMeta,
  type CreditVaultMeta,
} from "@/config/credit";
import { OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS, REINEIRA_CUSDC_ABI, REINEIRA_CUSDC_ADDRESS } from "@/config/pay";
import { encryptAddressAndAmount, encryptAmount, initFHEClient } from "@/lib/fhe";
import { estimateCappedFees } from "@/lib/gas";
import { useFHEStatus } from "./useFHEStatus";
import { FHEStepStatus } from "@/lib/constants";

// ─────────────────────────────────────────────────────────────────────────
// 1. useCreditMarkets — list of available markets + their public scalars.
// ─────────────────────────────────────────────────────────────────────────
export function useCreditMarkets() {
  const publicClient = usePublicClient();

  const [snapshots, setSnapshots] = useState<
    Array<CreditMarketMeta & {
      totalSupplyAssets?: bigint;
      totalBorrowAssets?: bigint;
      utilizationBps?: bigint;
      borrowersCount?: bigint;
    }>
  >(CREDIT_MARKETS);

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    const next = await Promise.all(
      CREDIT_MARKETS.map(async (m) => {
        if (!m.address) return m;
        try {
          const [tsa, tba, util, bl] = await Promise.all([
            publicClient.readContract({ address: m.address, abi: CREDIT_MARKET_ABI, functionName: "totalSupplyAssets" }) as Promise<bigint>,
            publicClient.readContract({ address: m.address, abi: CREDIT_MARKET_ABI, functionName: "totalBorrowAssets" }) as Promise<bigint>,
            publicClient.readContract({ address: m.address, abi: CREDIT_MARKET_ABI, functionName: "utilizationBps" }) as Promise<bigint>,
            publicClient.readContract({ address: m.address, abi: CREDIT_MARKET_ABI, functionName: "borrowersLength" }) as Promise<bigint>,
          ]);
          return { ...m, totalSupplyAssets: tsa, totalBorrowAssets: tba, utilizationBps: util, borrowersCount: bl };
        } catch {
          return m;
        }
      })
    );
    setSnapshots(next);
  }, [publicClient]);

  return { markets: snapshots, refresh };
}

// ─────────────────────────────────────────────────────────────────────────
// 2. useCreditVaults — list of curated vaults + public deposit scalar.
// ─────────────────────────────────────────────────────────────────────────
export function useCreditVaults() {
  const publicClient = usePublicClient();
  const [snapshots, setSnapshots] = useState<
    Array<CreditVaultMeta & { publicTotalDeposited?: bigint; feeBps?: number }>
  >(CREDIT_VAULTS);

  const refresh = useCallback(async () => {
    if (!publicClient) return;
    const next = await Promise.all(
      CREDIT_VAULTS.map(async (v) => {
        if (!v.address) return v;
        try {
          const [td, fb] = await Promise.all([
            publicClient.readContract({ address: v.address, abi: CREDIT_VAULT_ABI, functionName: "publicTotalDeposited" }) as Promise<bigint>,
            publicClient.readContract({ address: v.address, abi: CREDIT_VAULT_ABI, functionName: "feeBps" }) as Promise<bigint | number>,
          ]);
          return { ...v, publicTotalDeposited: td, feeBps: Number(fb) };
        } catch {
          return v;
        }
      })
    );
    setSnapshots(next);
  }, [publicClient]);

  return { vaults: snapshots, refresh };
}

// ─────────────────────────────────────────────────────────────────────────
// 3. useEnsureOperator — common pre-flight: cUSDC.setOperator(target, until).
// ─────────────────────────────────────────────────────────────────────────
export function useEnsureOperator(target?: `0x${string}`) {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();

  const ensure = useCallback(
    async (untilSeconds = Math.floor(Date.now() / 1000) + 30 * 24 * 3600) => {
      if (!REINEIRA_CUSDC_ADDRESS || !target || !address || !publicClient) return false;
      try {
        const isOp = await publicClient.readContract({
          address: REINEIRA_CUSDC_ADDRESS,
          abi: REINEIRA_CUSDC_ABI,
          functionName: "isOperator",
          args: [address, target],
        });
        if (isOp) return true;
      } catch { /* falls through to set */ }

      const fees = await estimateCappedFees(publicClient);
      const tx = await writeContractAsync({
        address: REINEIRA_CUSDC_ADDRESS,
        abi: REINEIRA_CUSDC_ABI,
        functionName: "setOperator",
        args: [target, BigInt(untilSeconds)],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas,
        maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 200_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash: tx });
      return true;
    },
    [address, target, publicClient, writeContractAsync]
  );

  return { ensure };
}

// ─────────────────────────────────────────────────────────────────────────
// 4. useCreditMarket — supply / withdraw / supplyCollateral / withdrawCollateral / repay.
//
// CoFHE constraint: InEuint64 proofs cannot be forwarded through intermediary
// contracts. All INCOMING transfers use a two-step pattern:
//   1. cToken.confidentialTransfer(contract, encAmt)  ← user calls directly
//   2. contract.function(amtPlain [, encAmt2])         ← contract records
// All OUTGOING transfers (market IS holder) use no client InEuint64 —
// the market does FHE.asEuint64 + allowTransient + confidentialTransfer internally.
// ─────────────────────────────────────────────────────────────────────────
export function useCreditMarket(market?: `0x${string}`) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const fhe = useFHEStatus();

  // ── Two-step supply: cUSDC.confidentialTransfer(market) → market.supply(amt) ──
  const supply = useCallback(
    async (amount: bigint) => {
      if (!publicClient || !walletClient || !market || !address || !REINEIRA_CUSDC_ADDRESS) throw new Error("not ready");
      fhe.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);
      const enc = await encryptAmount(amount);
      fhe.setStep(FHEStepStatus.COMPUTING);

      // Step 1 — direct cUSDC transfer to market (user is immediate CoFHE caller)
      const fees = await estimateCappedFees(publicClient);
      const txTransfer = await writeContractAsync({
        address: REINEIRA_CUSDC_ADDRESS, abi: REINEIRA_CUSDC_ABI,
        functionName: "confidentialTransfer", args: [market, enc[0]],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 600_000n,
      });
      const r = await publicClient.waitForTransactionReceipt({ hash: txTransfer });
      if (r.status !== "success") throw new Error("cUSDC transfer to market failed");
      await new Promise(res => setTimeout(res, 8000)); // CoFHE settle

      // Step 2 — record supply shares (no FHE forwarding)
      const fees2 = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: market, abi: CREDIT_MARKET_ABI, functionName: "supply",
        args: [amount], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees2.maxFeePerGas, maxPriorityFeePerGas: fees2.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.supply,
      });
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, market, address, writeContractAsync, fhe]
  );

  // ── Withdraw: market IS holder, uses FHE.asEuint64 internally ──
  const withdraw = useCallback(
    async (amount: bigint) => {
      if (!publicClient || !market || !address) throw new Error("not ready");
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: market, abi: CREDIT_MARKET_ABI, functionName: "withdraw",
        args: [amount], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.withdraw,
      });
      return hash;
    },
    [publicClient, market, address, writeContractAsync]
  );

  // ── Two-step supplyCollateral: cToken.confidentialTransfer → market.supplyCollateral ──
  const supplyCollateral = useCallback(
    async (amount: bigint, collateralTokenAddress: `0x${string}`) => {
      if (!publicClient || !walletClient || !market || !address) throw new Error("not ready");
      fhe.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);

      // Step 1 — transfer collateral directly to market
      const enc1 = await encryptAmount(amount);
      fhe.setStep(FHEStepStatus.COMPUTING);
      const fees = await estimateCappedFees(publicClient);
      const txTransfer = await writeContractAsync({
        address: collateralTokenAddress, abi: REINEIRA_CUSDC_ABI,
        functionName: "confidentialTransfer", args: [market, enc1[0]],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 600_000n,
      });
      const r = await publicClient.waitForTransactionReceipt({ hash: txTransfer });
      if (r.status !== "success") throw new Error("collateral transfer failed");
      await new Promise(res => setTimeout(res, 8000));

      // Step 2 — supply with ONE encAmt for FHE collateral accounting
      const enc2 = await encryptAmount(amount);
      const fees2 = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: market, abi: CREDIT_MARKET_ABI, functionName: "supplyCollateral",
        args: [amount, enc2[0]], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees2.maxFeePerGas, maxPriorityFeePerGas: fees2.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.supplyCollateral,
      });
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, market, address, writeContractAsync, fhe]
  );

  // ── withdrawCollateral: market IS holder, FHE LLTV check via encAmt from user ──
  const withdrawCollateral = useCallback(
    async (amount: bigint) => {
      if (!publicClient || !walletClient || !market || !address) throw new Error("not ready");
      fhe.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);
      const inputs = await encryptAmount(amount);
      fhe.setStep(FHEStepStatus.COMPUTING);
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: market, abi: CREDIT_MARKET_ABI, functionName: "withdrawCollateral",
        args: [amount, inputs[0]], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.withdrawCollateral,
      });
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, market, address, writeContractAsync, fhe]
  );

  // ── borrow: market IS holder, FHE check via encAmt + encDest from user ──
  const borrow = useCallback(
    async (amount: bigint, destination: `0x${string}`) => {
      if (!publicClient || !walletClient || !market || !address) throw new Error("not ready");
      fhe.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);
      const inputs = await encryptAddressAndAmount(destination, amount);
      fhe.setStep(FHEStepStatus.COMPUTING);
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: market, abi: CREDIT_MARKET_ABI, functionName: "borrow",
        args: [amount, inputs[1], inputs[0]],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.borrow,
      });
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, market, address, writeContractAsync, fhe]
  );

  // ── Two-step repay: cUSDC.confidentialTransfer(market) → market.repay(amt, encAmt) ──
  const repay = useCallback(
    async (amount: bigint) => {
      if (!publicClient || !walletClient || !market || !address || !REINEIRA_CUSDC_ADDRESS) throw new Error("not ready");
      fhe.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);

      // Step 1 — direct cUSDC transfer to market
      const enc1 = await encryptAmount(amount);
      fhe.setStep(FHEStepStatus.COMPUTING);
      const fees = await estimateCappedFees(publicClient);
      const txTransfer = await writeContractAsync({
        address: REINEIRA_CUSDC_ADDRESS, abi: REINEIRA_CUSDC_ABI,
        functionName: "confidentialTransfer", args: [market, enc1[0]],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 600_000n,
      });
      const r = await publicClient.waitForTransactionReceipt({ hash: txTransfer });
      if (r.status !== "success") throw new Error("cUSDC transfer failed");
      await new Promise(res => setTimeout(res, 8000));

      // Step 2 — repay with ONE encAmt for FHE borrow accounting
      const enc2 = await encryptAmount(amount);
      const fees2 = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: market, abi: CREDIT_MARKET_ABI, functionName: "repay",
        args: [amount, enc2[0]], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees2.maxFeePerGas, maxPriorityFeePerGas: fees2.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.repay,
      });
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, market, address, writeContractAsync, fhe]
  );

  const accrue = useCallback(async () => {
    if (!publicClient || !market || !address) throw new Error("not ready");
    const fees = await estimateCappedFees(publicClient);
    return writeContractAsync({
      address: market, abi: CREDIT_MARKET_ABI, functionName: "accrueInterest",
      args: [], account: address, chain: arbitrumSepolia,
      maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
      gas: 350_000n,
    });
  }, [publicClient, market, address, writeContractAsync]);

  return { supply, withdraw, supplyCollateral, withdrawCollateral, borrow, repay, accrue };
}

// ─────────────────────────────────────────────────────────────────────────
// 5. useCreditVault — deposit / withdraw / curator reallocation.
//
// Deposit: two-step (cUSDC.confidentialTransfer → vault.deposit).
// Withdraw: one-step (vault.withdraw uses internal FHE.asEuint64).
// Reallocate: one-step (vault does all FHE internally, no client InEuint64).
// ─────────────────────────────────────────────────────────────────────────
export function useCreditVault(vault?: `0x${string}`) {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const fhe = useFHEStatus();

  // ── Two-step deposit: cUSDC.confidentialTransfer(vault) → vault.deposit(amt) ──
  const deposit = useCallback(
    async (amount: bigint) => {
      if (!publicClient || !walletClient || !vault || !address || !REINEIRA_CUSDC_ADDRESS) throw new Error("not ready");
      fhe.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);
      const enc = await encryptAmount(amount);
      fhe.setStep(FHEStepStatus.COMPUTING);

      // Step 1 — direct cUSDC transfer to vault (user is immediate CoFHE caller)
      const fees = await estimateCappedFees(publicClient);
      const txTransfer = await writeContractAsync({
        address: REINEIRA_CUSDC_ADDRESS, abi: REINEIRA_CUSDC_ABI,
        functionName: "confidentialTransfer", args: [vault, enc[0]],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 600_000n,
      });
      const r = await publicClient.waitForTransactionReceipt({ hash: txTransfer });
      if (r.status !== "success") throw new Error("cUSDC transfer to vault failed");
      await new Promise(res => setTimeout(res, 8000)); // CoFHE settle

      // Step 2 — record shares in vault (no FHE forwarding)
      const fees2 = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: vault, abi: CREDIT_VAULT_ABI, functionName: "deposit",
        args: [amount], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees2.maxFeePerGas, maxPriorityFeePerGas: fees2.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.vaultDeposit,
      });
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, vault, address, writeContractAsync, fhe]
  );

  // ── Withdraw: vault IS holder, uses FHE.asEuint64 internally ──
  const withdraw = useCallback(
    async (amount: bigint) => {
      if (!publicClient || !vault || !address) throw new Error("not ready");
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: vault, abi: CREDIT_VAULT_ABI, functionName: "withdraw",
        args: [amount], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.vaultWithdraw,
      });
      return hash;
    },
    [publicClient, vault, address, writeContractAsync]
  );

  // ── Reallocate supply: vault does FHE.asEuint64 + confidentialTransfer internally ──
  const reallocateSupply = useCallback(
    async (market: `0x${string}`, amount: bigint) => {
      if (!publicClient || !vault || !address) throw new Error("not ready");
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: vault, abi: CREDIT_VAULT_ABI, functionName: "reallocateSupply",
        args: [market, amount], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.vaultReallocate,
      });
      return hash;
    },
    [publicClient, vault, address, writeContractAsync]
  );

  const reallocateWithdraw = useCallback(
    async (market: `0x${string}`, amount: bigint) => {
      if (!publicClient || !vault || !address) throw new Error("not ready");
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: vault, abi: CREDIT_VAULT_ABI, functionName: "reallocateWithdraw",
        args: [market, amount], account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.vaultReallocate,
      });
      return hash;
    },
    [publicClient, vault, address, writeContractAsync]
  );

  return { deposit, withdraw, reallocateSupply, reallocateWithdraw };
}

// ─────────────────────────────────────────────────────────────────────────
// 6. useCreditAuctions — list + bid + settle.
// ─────────────────────────────────────────────────────────────────────────
export interface AuctionView {
  id: bigint;
  market: `0x${string}`;
  borrower: `0x${string}`;
  endsAt: bigint;
  bestBid: bigint;
  bestBidder: `0x${string}`;
  settled: boolean;
  bids: number;
}

export function useCreditAuctions() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const fhe = useFHEStatus();
  const [list, setList] = useState<AuctionView[]>([]);

  const refresh = useCallback(async () => {
    if (!publicClient || !CREDIT_AUCTION_ADDRESS) return;
    const len = (await publicClient.readContract({
      address: CREDIT_AUCTION_ADDRESS, abi: CREDIT_AUCTION_ABI,
      functionName: "auctionsLength",
    })) as bigint;
    const all: AuctionView[] = [];
    for (let i = 0n; i < len; i++) {
      try {
        const r = (await publicClient.readContract({
          address: CREDIT_AUCTION_ADDRESS, abi: CREDIT_AUCTION_ABI,
          functionName: "getAuction", args: [i],
        })) as any[];
        all.push({
          id: i, market: r[0], borrower: r[1], endsAt: r[2],
          bestBid: r[3], bestBidder: r[4], settled: r[5], bids: Number(r[6]),
        });
      } catch { /* skip */ }
    }
    setList(all);
  }, [publicClient]);

  const submitBid = useCallback(
    async (auctionId: bigint, bidAmount: bigint) => {
      if (!publicClient || !walletClient || !CREDIT_AUCTION_ADDRESS || !address) throw new Error("not ready");
      fhe.setStep(FHEStepStatus.ENCRYPTING);
      await initFHEClient(publicClient, walletClient);
      const inputs = await encryptAmount(bidAmount);
      fhe.setStep(FHEStepStatus.COMPUTING);
      const fees = await estimateCappedFees(publicClient);
      const hash = await writeContractAsync({
        address: CREDIT_AUCTION_ADDRESS, abi: CREDIT_AUCTION_ABI,
        functionName: "submitBid", args: [auctionId, bidAmount, inputs[0]],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.bid,
      });
      fhe.setStep(FHEStepStatus.READY);
      return hash;
    },
    [publicClient, walletClient, address, writeContractAsync, fhe]
  );

  const settle = useCallback(
    async (auctionId: bigint) => {
      if (!publicClient || !CREDIT_AUCTION_ADDRESS || !address) throw new Error("not ready");
      const fees = await estimateCappedFees(publicClient);
      return writeContractAsync({
        address: CREDIT_AUCTION_ADDRESS, abi: CREDIT_AUCTION_ABI,
        functionName: "settle", args: [auctionId],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.settle,
      });
    },
    [publicClient, address, writeContractAsync]
  );

  return { auctions: list, refresh, submitBid, settle };
}

// ─────────────────────────────────────────────────────────────────────────
// 7. useCreditScore — encrypted reputation score.
// ─────────────────────────────────────────────────────────────────────────
export function useCreditScore() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const update = useCallback(
    async (user?: `0x${string}`) => {
      const target = user ?? address;
      if (!publicClient || !CREDIT_SCORE_ADDRESS || !target) throw new Error("not ready");
      const fees = await estimateCappedFees(publicClient);
      return writeContractAsync({
        address: CREDIT_SCORE_ADDRESS, abi: CREDIT_SCORE_ABI,
        functionName: "updateScore", args: [target],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.scoreUpdate,
      });
    },
    [publicClient, address, writeContractAsync]
  );

  const attest = useCallback(
    async (market: `0x${string}`) => {
      if (!publicClient || !CREDIT_SCORE_ADDRESS || !address) throw new Error("not ready");
      const fees = await estimateCappedFees(publicClient);
      return writeContractAsync({
        address: CREDIT_SCORE_ADDRESS, abi: CREDIT_SCORE_ABI,
        functionName: "attestForMarket", args: [market],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.scoreAttest,
      });
    },
    [publicClient, address, writeContractAsync]
  );

  return { update, attest };
}

// ─────────────────────────────────────────────────────────────────────────
// 8. useCreditStreamHook — auto-repay-from-stream.
// ─────────────────────────────────────────────────────────────────────────
export function useCreditStreamHook() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const op = useEnsureOperator(CREDIT_STREAM_HOOK_ADDRESS);

  const enable = useCallback(
    async (market: `0x${string}`, perCycle: bigint, periodSeconds: bigint) => {
      if (!publicClient || !CREDIT_STREAM_HOOK_ADDRESS || !address) throw new Error("not ready");
      await op.ensure();
      const fees = await estimateCappedFees(publicClient);
      return writeContractAsync({
        address: CREDIT_STREAM_HOOK_ADDRESS, abi: CREDIT_STREAM_HOOK_ABI,
        functionName: "enable", args: [market, perCycle, periodSeconds],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.hookEnable,
      });
    },
    [publicClient, address, writeContractAsync, op]
  );

  const disable = useCallback(
    async (hookId: bigint) => {
      if (!publicClient || !CREDIT_STREAM_HOOK_ADDRESS || !address) throw new Error("not ready");
      const fees = await estimateCappedFees(publicClient);
      return writeContractAsync({
        address: CREDIT_STREAM_HOOK_ADDRESS, abi: CREDIT_STREAM_HOOK_ABI,
        functionName: "disable", args: [hookId],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 200_000n,
      });
    },
    [publicClient, address, writeContractAsync]
  );

  return { enable, disable };
}

// ─────────────────────────────────────────────────────────────────────────
// 9. useCreditInsuranceHook — top-up subscription.
// ─────────────────────────────────────────────────────────────────────────
export function useCreditInsuranceHook() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const op = useEnsureOperator(CREDIT_INSURANCE_HOOK_ADDRESS);

  const subscribe = useCallback(
    async (market: `0x${string}`, perCycle: bigint, periodSeconds: bigint) => {
      if (!publicClient || !CREDIT_INSURANCE_HOOK_ADDRESS || !address) throw new Error("not ready");
      await op.ensure();
      const fees = await estimateCappedFees(publicClient);
      return writeContractAsync({
        address: CREDIT_INSURANCE_HOOK_ADDRESS, abi: CREDIT_INSURANCE_HOOK_ABI,
        functionName: "subscribe", args: [market, perCycle, periodSeconds],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.insuranceSubscribe,
      });
    },
    [publicClient, address, writeContractAsync, op]
  );

  const cancel = useCallback(
    async (subId: bigint) => {
      if (!publicClient || !CREDIT_INSURANCE_HOOK_ADDRESS || !address) throw new Error("not ready");
      const fees = await estimateCappedFees(publicClient);
      return writeContractAsync({
        address: CREDIT_INSURANCE_HOOK_ADDRESS, abi: CREDIT_INSURANCE_HOOK_ABI,
        functionName: "cancel", args: [subId],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: 200_000n,
      });
    },
    [publicClient, address, writeContractAsync]
  );

  return { subscribe, cancel };
}

// ─────────────────────────────────────────────────────────────────────────
// 10. useCreditPosition — read encrypted position handles for a user.
// ─────────────────────────────────────────────────────────────────────────
export function useCreditPosition(market?: `0x${string}`, user?: `0x${string}`) {
  const { address } = useAccount();
  const target = user ?? address;
  return useReadContract({
    address: market,
    abi: CREDIT_MARKET_ABI as any,
    functionName: "getPosition",
    args: target ? [target] : undefined,
    query: { enabled: !!market && !!target },
  });
}

// ─────────────────────────────────────────────────────────────────────────
// 11. useApprovedSets — read governance-approved values.
// ─────────────────────────────────────────────────────────────────────────
const COMMON_LLTVS = [6250n, 7700n, 8600n, 9150n];
const COMMON_BONUS = [500n, 750n];
const COMMON_THRES = [8000n, 8500n, 9000n];

export function useApprovedSets() {
  const publicClient = usePublicClient();
  const [data, setData] = useState<{
    lltv: Array<{ v: bigint; ok: boolean }>;
    bonus: Array<{ v: bigint; ok: boolean }>;
    thres: Array<{ v: bigint; ok: boolean }>;
  }>({ lltv: [], bonus: [], thres: [] });

  const refresh = useCallback(async () => {
    if (!publicClient || !CREDIT_FACTORY_ADDRESS) return;
    const lltv = await Promise.all(
      COMMON_LLTVS.map(async (v) => ({
        v,
        ok: (await publicClient.readContract({
          address: CREDIT_FACTORY_ADDRESS, abi: CREDIT_FACTORY_ABI,
          functionName: "isApprovedLLTV", args: [v],
        })) as boolean,
      }))
    );
    const bonus = await Promise.all(
      COMMON_BONUS.map(async (v) => ({
        v,
        ok: (await publicClient.readContract({
          address: CREDIT_FACTORY_ADDRESS, abi: CREDIT_FACTORY_ABI,
          functionName: "isApprovedLiqBonus", args: [v],
        })) as boolean,
      }))
    );
    const thres = await Promise.all(
      COMMON_THRES.map(async (v) => ({
        v,
        ok: (await publicClient.readContract({
          address: CREDIT_FACTORY_ADDRESS, abi: CREDIT_FACTORY_ABI,
          functionName: "isApprovedLiqThreshold", args: [v],
        })) as boolean,
      }))
    );
    setData({ lltv, bonus, thres });
  }, [publicClient]);

  return { ...data, refresh };
}

// ─────────────────────────────────────────────────────────────────────────
// 12. useGovernanceProxy — write helpers for treasury-only governance ops.
// ─────────────────────────────────────────────────────────────────────────
export function useGovernanceProxy() {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();

  const approveLLTV = useCallback(
    async (v: bigint, ok: boolean) => {
      if (!publicClient || !CREDIT_GOVERNANCE_PROXY_ADDRESS || !address) throw new Error("not ready");
      const fees = await estimateCappedFees(publicClient);
      return writeContractAsync({
        address: CREDIT_GOVERNANCE_PROXY_ADDRESS, abi: CREDIT_GOVERNANCE_PROXY_ABI,
        functionName: "approveLLTV", args: [v, ok],
        account: address, chain: arbitrumSepolia,
        maxFeePerGas: fees.maxFeePerGas, maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
        gas: CREDIT_GAS_CAPS.approveLLTV,
      });
    },
    [publicClient, address, writeContractAsync]
  );

  return { approveLLTV };
}

// ─────────────────────────────────────────────────────────────────────────
// 13. useIRMSnapshot — read plaintext mirror parameters.
// ─────────────────────────────────────────────────────────────────────────
export function useIRMSnapshot() {
  const publicClient = usePublicClient();
  const [data, setData] = useState<{
    base?: bigint; slope1?: bigint; slope2?: bigint; kink?: bigint; reserve?: bigint;
  }>({});

  const refresh = useCallback(async () => {
    if (!publicClient || !CREDIT_IRM_ADDRESS) return;
    const [b, s1, s2, k, r] = await Promise.all([
      publicClient.readContract({ address: CREDIT_IRM_ADDRESS, abi: CREDIT_IRM_ABI, functionName: "baseBpsP" }) as Promise<bigint>,
      publicClient.readContract({ address: CREDIT_IRM_ADDRESS, abi: CREDIT_IRM_ABI, functionName: "slope1BpsP" }) as Promise<bigint>,
      publicClient.readContract({ address: CREDIT_IRM_ADDRESS, abi: CREDIT_IRM_ABI, functionName: "slope2BpsP" }) as Promise<bigint>,
      publicClient.readContract({ address: CREDIT_IRM_ADDRESS, abi: CREDIT_IRM_ABI, functionName: "kinkBpsP" }) as Promise<bigint>,
      publicClient.readContract({ address: CREDIT_IRM_ADDRESS, abi: CREDIT_IRM_ABI, functionName: "reserveBpsP" }) as Promise<bigint>,
    ]);
    setData({ base: b, slope1: s1, slope2: s2, kink: k, reserve: r });
  }, [publicClient]);

  return { ...data, refresh };
}

// ─────────────────────────────────────────────────────────────────────────
// 14. useHealthFactor — derived plain estimate using public scalars.
// ─────────────────────────────────────────────────────────────────────────
export function useHealthFactor(market?: CreditMarketMeta, collateralUsd = 0, debtUsd = 0) {
  return useMemo(() => {
    if (!market || debtUsd === 0) return Infinity;
    const liqThres = market.liqThresholdBps / 10000;
    return (collateralUsd * liqThres) / debtUsd;
  }, [market, collateralUsd, debtUsd]);
}

// ─────────────────────────────────────────────────────────────────────────
// 15. useUtilizationApr — utility for showing utilization → APR curves.
// ─────────────────────────────────────────────────────────────────────────
export function useUtilizationApr(utilizationBps?: bigint) {
  const irm = useIRMSnapshot();
  const apr = useMemo(() => {
    if (utilizationBps === undefined || irm.base === undefined) return null;
    const u = Number(utilizationBps);
    const base = Number(irm.base);
    const s1 = Number(irm.slope1 ?? 0n);
    const s2 = Number(irm.slope2 ?? 0n);
    const kink = Number(irm.kink ?? 8000n);
    if (u <= kink) {
      return base + (s1 * u) / 10000;
    }
    return base + s1 + (s2 * (u - kink)) / 10000;
  }, [utilizationBps, irm.base, irm.slope1, irm.slope2, irm.kink]);
  return { aprBps: apr, irm };
}
