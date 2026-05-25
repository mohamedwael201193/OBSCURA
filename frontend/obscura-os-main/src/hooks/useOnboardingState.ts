/**
 * useOnboardingState — detects where in the setup flow a wallet is.
 *
 * Returns a progressive `stage` based on what the user has completed:
 *   new        → wallet connected, nothing set up
 *   has-eth    → has enough ETH for gas
 *   has-usdc   → has plain USDC but not yet shielded
 *   shielded   → has private ocUSDC but no stealth address registered
 *   registered → has private ocUSDC + stealth address registered
 *   active     → has previous on-chain activity (receipts or streams)
 *
 * Used by PayHarmonyHome to show different dashboard UIs and CTAs.
 * All checks are read-only — no auto-decryption, no MetaMask popups.
 */
import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useReadContract } from "wagmi";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { getTrackedUnits } from "@/lib/trackedBalance";
import { useReceipts } from "@/hooks/useReceipts";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/pay";

export type OnboardingStage =
  | "not-connected"
  | "new"
  | "has-eth"
  | "has-usdc"
  | "shielded"
  | "registered"
  | "active";

export interface OnboardingState {
  stage: OnboardingStage;
  /** ETH balance in ETH (may be 0 while loading) */
  ethBalance: number;
  ethChecked: boolean;
  /** Plain USDC balance as string (e.g. "6.00") */
  usdcFormatted: string;
  hasUsdc: boolean;
  /** Private ocUSDC tracked units > 0 */
  hasPrivateUsdc: boolean;
  privateUsdcNum: number;
  /** Stealth meta-address registered on-chain */
  isStealthRegistered: boolean;
  stealthLoading: boolean;
  /** Has any on-chain receipts in local history */
  hasActivity: boolean;
}

const ETH_GAS_THRESHOLD = 0.0001;
const USDC_THRESHOLD = 0.01;
const CUSDC_THRESHOLD = 0.01;

export function useOnboardingState(): OnboardingState {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const usdcFormatted = useUSDCBalance() ?? "0";
  const { receipts } = useReceipts();

  // ── ETH balance ──────────────────────────────────────────────────────────
  const [ethBalance, setEthBalance] = useState(0);
  const [ethChecked, setEthChecked] = useState(false);

  useEffect(() => {
    if (!address || !publicClient) {
      setEthBalance(0);
      setEthChecked(false);
      return;
    }
    setEthChecked(false);
    publicClient
      .getBalance({ address })
      .then((bal) => {
        setEthBalance(Number(bal) / 1e18);
        setEthChecked(true);
      })
      .catch(() => {
        setEthBalance(0);
        setEthChecked(true);
      });
  }, [address, publicClient]);

  // ── Private ocUSDC ───────────────────────────────────────────────────────
  const cusdcUnits = address ? getTrackedUnits(address) : 0n;
  const privateUsdcNum = Number(cusdcUnits) / 1_000_000;

  // ── USDC balance ─────────────────────────────────────────────────────────
  const usdcNum = parseFloat(usdcFormatted) || 0;

  // ── Stealth registry ─────────────────────────────────────────────────────
  const { data: stealthData, isLoading: stealthLoading } = useReadContract({
    address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
    abi: OBSCURA_STEALTH_REGISTRY_ABI,
    functionName: "getMetaAddress",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!OBSCURA_STEALTH_REGISTRY_ADDRESS },
  });

  const isStealthRegistered = stealthData
    ? (stealthData as readonly [`0x${string}`, `0x${string}`, bigint])[2] > 0n
    : false;

  // ── Receipts activity ────────────────────────────────────────────────────
  const hasActivity = receipts.length > 0;

  // ── Derived stage ────────────────────────────────────────────────────────
  const stage = useMemo((): OnboardingStage => {
    if (!isConnected || !address) return "not-connected";
    if (hasActivity && isStealthRegistered && privateUsdcNum >= CUSDC_THRESHOLD) return "active";
    if (isStealthRegistered) return "registered";
    if (privateUsdcNum >= CUSDC_THRESHOLD) return "shielded";
    if (usdcNum >= USDC_THRESHOLD) return "has-usdc";
    if (ethChecked && ethBalance >= ETH_GAS_THRESHOLD) return "has-eth";
    return "new";
  }, [isConnected, address, hasActivity, isStealthRegistered, privateUsdcNum, usdcNum, ethChecked, ethBalance]);

  return {
    stage,
    ethBalance,
    ethChecked,
    usdcFormatted,
    hasUsdc: usdcNum >= USDC_THRESHOLD,
    hasPrivateUsdc: privateUsdcNum >= CUSDC_THRESHOLD,
    privateUsdcNum,
    isStealthRegistered,
    stealthLoading,
    hasActivity,
  };
}
