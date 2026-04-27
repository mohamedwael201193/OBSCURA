/**
 * useSweepStealth — Auto-sweep cUSDC from a stealth address to the user's
 * main wallet WITHOUT needing to import a private key into MetaMask.
 *
 * How it works (the Umbra approach, adapted for CoFHE):
 *   1. Derive the stealth private key in the browser using stored viewing +
 *      spending keys.
 *   2. Check if the stealth address has enough ETH for gas.
 *   3. If not: send a small ETH top-up from the main wallet (one MetaMask popup).
 *   4. Create a viem local WalletClient from the stealth private key + HTTP RPC.
 *      This signs transactions in-browser — NO MetaMask import required.
 *   5. Initialize the CoFHE client with the stealth walletClient so encryption
 *      is authorized by the stealth address (the ciphertext owner).
 *   6. Encrypt the amount and call cUSDC.confidentialTransfer(mainWallet, amt)
 *      — cUSDC moves to the user's main wallet.
 *   7. Reset the CoFHE client back to the main wallet.
 */
import { useCallback, useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useSendTransaction } from "wagmi";
import { createWalletClient, http, parseEther, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { REINEIRA_CUSDC_ADDRESS, REINEIRA_CUSDC_ABI } from "@/config/wave2";
import { stealthPrivateKey, loadStoredKeys } from "@/lib/stealth";
import { initFHEClient, encryptAmount, resetFHEAccount } from "@/lib/fhe";
import type { ScannedPayment } from "./useStealthScan";

const ARB_SEPOLIA_RPC = "https://sepolia-rollup.arbitrum.io/rpc";

// Minimum ETH for gas (Arb Sepolia fees are tiny — 0.002 ETH is plenty)
const GAS_ETH_MINIMUM = parseEther("0.001");
const GAS_ETH_TOPUP = parseEther("0.002");

/**
 * Estimate EIP-1559 fees and apply a 1.5× safety buffer.
 * Clamps maxPriorityFeePerGas ≤ maxFeePerGas (required by EIP-1559).
 * On Arbitrum Sepolia base fees can be ~0.024 gwei — any fixed fallback
 * risks either being below the base fee or above the cap, so we always
 * derive priority from the same estimation call.
 */
async function estimateCappedFees(publicClient: { estimateFeesPerGas: () => Promise<{ maxFeePerGas: bigint | null; maxPriorityFeePerGas: bigint | null }> }) {
  try {
    const feeData = await publicClient.estimateFeesPerGas();
    const maxFeePerGas = feeData.maxFeePerGas
      ? (feeData.maxFeePerGas * 150n) / 100n
      : 300_000_000n; // 0.3 gwei fallback
    const rawPriority = feeData.maxPriorityFeePerGas
      ? (feeData.maxPriorityFeePerGas * 150n) / 100n
      : undefined;
    // Clamp: tip must never exceed the fee cap
    const maxPriorityFeePerGas =
      rawPriority === undefined || rawPriority > maxFeePerGas ? maxFeePerGas : rawPriority;
    return { maxFeePerGas, maxPriorityFeePerGas };
  } catch {
    // RPC offline / rate-limited — safe Arbitrum Sepolia values
    return { maxFeePerGas: 300_000_000n, maxPriorityFeePerGas: 300_000_000n };
  }
}

/** InEuint64-accepting overload of confidentialTransfer */
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

export type SweepStep =
  | "idle"
  | "deriving_key"
  | "checking_gas"
  | "funding_gas"
  | "waiting_fund"
  | "encrypting"
  | "sweeping"
  | "done"
  | "error";

export interface SweepState {
  step: SweepStep;
  txHash?: string;
  error?: string;
}

const STEP_LABELS: Record<SweepStep, string> = {
  idle: "",
  deriving_key: "Deriving stealth key…",
  checking_gas: "Checking stealth address ETH balance…",
  funding_gas: "Fund stealth address with 0.002 ETH for gas — sign in MetaMask",
  waiting_fund: "Waiting for gas top-up to confirm…",
  encrypting: "Encrypting amount (CoFHE) — sign permit in MetaMask",
  sweeping: "Sweeping cUSDC to your wallet — signing internally…",
  done: "Swept! cUSDC is now in your main wallet.",
  error: "",
};

export function useSweepStealth() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { sendTransactionAsync } = useSendTransaction();
  const [state, setState] = useState<SweepState>({ step: "idle" });

  const stepLabel = STEP_LABELS[state.step];

  const sweep = useCallback(
    async (payment: ScannedPayment, amountOverride?: bigint) => {
      if (!address || !publicClient || !walletClient || !REINEIRA_CUSDC_ADDRESS) {
        setState({ step: "error", error: "Wallet not connected" });
        return;
      }

      // Determine amount: from metadata or override
      const amount = amountOverride ?? payment.amount;
      if (!amount || amount === 0n) {
        setState({ step: "error", error: "Amount unknown — enter the cycle amount manually." });
        return;
      }

      try {
        // ── Step 1: Derive the stealth private key ──────────────────────────
        setState({ step: "deriving_key" });
        const keys = loadStoredKeys(address);
        if (!keys) {
          setState({ step: "error", error: "No stealth keys found. Register a meta-address first." });
          return;
        }

        const stealthKey = stealthPrivateKey(
          payment.ephemeralPubKey,
          keys.viewingPrivateKey,
          keys.spendingPrivateKey
        ) as `0x${string}`;

        const stealthAccount = privateKeyToAccount(stealthKey);

        // Sanity check: derived address must match announced stealth address
        if (stealthAccount.address.toLowerCase() !== payment.stealthAddress.toLowerCase()) {
          setState({
            step: "error",
            error: `Derived address ${stealthAccount.address.slice(0, 10)}… doesn't match stealth address ${payment.stealthAddress.slice(0, 10)}…. Wrong keys?`,
          });
          return;
        }

        // ── Step 2: Check ETH balance for gas ──────────────────────────────
        setState({ step: "checking_gas" });
        const ethBalance = await publicClient.getBalance({ address: payment.stealthAddress });

        if (ethBalance < GAS_ETH_MINIMUM) {
          // ── Step 3: Fund stealth address with ETH from main wallet ────────
          // Estimate fees explicitly — letting MetaMask estimate itself can
          // produce a maxFeePerGas below the current block base fee (error).
          setState({ step: "funding_gas" });
          const fundFees = await estimateCappedFees(publicClient);
          const fundHash = await sendTransactionAsync({
            to: payment.stealthAddress,
            value: GAS_ETH_TOPUP,
            chain: arbitrumSepolia,
            maxFeePerGas: fundFees.maxFeePerGas,
            maxPriorityFeePerGas: fundFees.maxPriorityFeePerGas,
          });

          setState({ step: "waiting_fund" });
          await publicClient.waitForTransactionReceipt({ hash: fundHash });
        }

        // ── Step 4: Create a local walletClient from the stealth private key
        // This is the Umbra approach — sign in-browser, no MetaMask import.
        const stealthWalletClient = createWalletClient({
          account: stealthAccount,
          chain: arbitrumSepolia,
          transport: http(ARB_SEPOLIA_RPC),
        });

        // ── Step 5: Initialize CoFHE with the stealth wallet ───────────────
        setState({ step: "encrypting" });
        // Must use the stealth wallet for FHE because cUSDC is owned by stealth address
        await initFHEClient(publicClient, stealthWalletClient);
        const encrypted = await encryptAmount(amount);
        const inEuint64 = encrypted[0];

        // ── Step 6: Call confidentialTransfer from the stealth wallet ───────
        setState({ step: "sweeping" });
        const sweepFees = await estimateCappedFees(publicClient);

        const txHash = await stealthWalletClient.writeContract({
          address: REINEIRA_CUSDC_ADDRESS,
          abi: CUSDC_TRANSFER_ABI,
          functionName: "confidentialTransfer",
          args: [address, inEuint64],
          gas: 1_500_000n,
          maxFeePerGas: sweepFees.maxFeePerGas,
          maxPriorityFeePerGas: sweepFees.maxPriorityFeePerGas,
        });

        await publicClient.waitForTransactionReceipt({ hash: txHash });

        setState({ step: "done", txHash });
      } catch (e) {
        const msg = (e as Error).message || "Sweep failed";
        setState({ step: "error", error: msg.length > 200 ? msg.slice(0, 200) + "…" : msg });
      } finally {
        // ── Step 7: Reset CoFHE back to main wallet ─────────────────────────
        // The next action in the app will re-init FHE with the main wallet.
        resetFHEAccount();
      }
    },
    [address, publicClient, walletClient, sendTransactionAsync]
  );

  const reset = useCallback(() => setState({ step: "idle" }), []);

  return { sweep, state, stepLabel, reset };
}

export { STEP_LABELS };
export type { SweepStep as SweepStepType };
export const formatSweepAmount = (amt: bigint) => formatUnits(amt, 6);
