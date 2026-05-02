/**
 * useTxProgress — shared transaction progress state manager.
 *
 * Manages an ordered array of TxStep objects that describe every discrete
 * action in a multi-tx pay flow (FHE encrypt, transfer, announce, wait,
 * record, etc.).  Components create a steps template, pass setters down
 * via the hook return value, and render <TxProgressPanel steps={steps} />.
 */
import { useCallback, useState } from "react";

// ── Step types ──────────────────────────────────────────────────────────────
export type TxStepType =
  | "fhe_encrypt"   // FHE client-side proof generation
  | "transfer"      // cUSDC.confidentialTransfer
  | "announce"      // ObscuraStealthRegistry.announce
  | "wait"          // Rate-limit / proof-settle delay with countdown
  | "record"        // invoice.recordPayment / fund
  | "create"        // escrow.create / stream.create
  | "fund"          // escrow.fund
  | "redeem"        // escrow.redeem
  | "approve"       // token approval
  | "subscribe";    // insurance / subscription

export type TxStepStatus = "idle" | "active" | "done" | "error";

export interface TxStep {
  id: string;
  type: TxStepType;
  label: string;
  sublabel?: string;
  status: TxStepStatus;
  txHash?: `0x${string}`;
  errorMsg?: string;
  /** For wait steps — remaining seconds to show in the icon */
  countdownSec?: number;
}

// ── Templates for each feature flow ─────────────────────────────────────────

/** Invoice pay — stealth path (3 txs + 2 waits + 2 encrypts = 7 visual steps) */
export const INVOICE_PAY_STEALTH_STEPS: Omit<TxStep, "status">[] = [
  { id: "enc1",     type: "fhe_encrypt", label: "FHE Encrypt",      sublabel: "Sealing transfer amount with CoFHE" },
  { id: "transfer", type: "transfer",    label: "Private Transfer",  sublabel: "cUSDC → one-time stealth address" },
  { id: "wait1",    type: "wait",        label: "Rate-limit pause",  sublabel: "12 s cooldown before announce", countdownSec: 12 },
  { id: "announce", type: "announce",    label: "Stealth Announce",  sublabel: "Publishing ephemeral key to inbox" },
  { id: "wait2",    type: "wait",        label: "Proof settle",      sublabel: "5 s CoFHE commit window", countdownSec: 5 },
  { id: "enc2",     type: "fhe_encrypt", label: "FHE Encrypt",      sublabel: "Sealing receipt amount" },
  { id: "record",   type: "record",      label: "Record Payment",    sublabel: "On-chain invoice receipt" },
];

/** Invoice pay — direct/fallback path (2 txs + 1 wait + 2 encrypts) */
export const INVOICE_PAY_DIRECT_STEPS: Omit<TxStep, "status">[] = [
  { id: "enc1",     type: "fhe_encrypt", label: "FHE Encrypt",      sublabel: "Sealing transfer amount" },
  { id: "transfer", type: "transfer",    label: "Transfer cUSDC",    sublabel: "Sending to creator wallet" },
  { id: "wait1",    type: "wait",        label: "Proof settle",      sublabel: "8 s CoFHE commit window", countdownSec: 8 },
  { id: "enc2",     type: "fhe_encrypt", label: "FHE Encrypt",      sublabel: "Sealing receipt amount" },
  { id: "record",   type: "record",      label: "Record Payment",    sublabel: "On-chain invoice receipt" },
];

/** Escrow create + auto-fund (3 txs + 2 encrypts) */
export const ESCROW_CREATE_STEPS: Omit<TxStep, "status">[] = [
  { id: "enc1",     type: "fhe_encrypt", label: "FHE Encrypt",      sublabel: "Sealing escrow amount" },
  { id: "create",   type: "create",      label: "Create Escrow",    sublabel: "On-chain record creation" },
  { id: "enc2",     type: "fhe_encrypt", label: "FHE Encrypt",      sublabel: "Sealing transfer amount" },
  { id: "transfer", type: "transfer",    label: "Fund Transfer",     sublabel: "cUSDC → escrow contract" },
  { id: "fund",     type: "fund",        label: "Record Funding",    sublabel: "Marking escrow as funded" },
];

/** Escrow redeem (1 tx) */
export const ESCROW_REDEEM_STEPS: Omit<TxStep, "status">[] = [
  { id: "redeem",   type: "redeem",      label: "Redeem Escrow",    sublabel: "FHE-verify & release cUSDC" },
];

/** Send — stealth (2 txs + 1 wait + 1 encrypt) */
export const SEND_STEALTH_STEPS: Omit<TxStep, "status">[] = [
  { id: "enc1",     type: "fhe_encrypt", label: "FHE Encrypt",      sublabel: "Sealing transfer amount" },
  { id: "transfer", type: "transfer",    label: "Private Transfer",  sublabel: "cUSDC → stealth address" },
  { id: "wait1",    type: "wait",        label: "Rate-limit pause",  sublabel: "12 s cooldown", countdownSec: 12 },
  { id: "announce", type: "announce",    label: "Stealth Announce",  sublabel: "Publishing ephemeral key" },
];

/** Send — direct (1 tx + 1 encrypt) */
export const SEND_DIRECT_STEPS: Omit<TxStep, "status">[] = [
  { id: "enc1",     type: "fhe_encrypt", label: "FHE Encrypt",      sublabel: "Sealing transfer amount" },
  { id: "transfer", type: "transfer",    label: "Transfer cUSDC",    sublabel: "Confidential on-chain transfer" },
];

/** Subscription create + first tick (3 txs + 1 wait + 1 encrypt) */
export const SUBSCRIPTION_STEPS: Omit<TxStep, "status">[] = [
  { id: "create",   type: "create",      label: "Create Schedule",  sublabel: "Registering subscription stream" },
  { id: "enc1",     type: "fhe_encrypt", label: "FHE Encrypt",      sublabel: "Sealing first payment" },
  { id: "transfer", type: "transfer",    label: "Cycle 1 Payment",  sublabel: "cUSDC → stealth address" },
  { id: "wait1",    type: "wait",        label: "Rate-limit pause",  sublabel: "12 s cooldown", countdownSec: 12 },
  { id: "announce", type: "announce",    label: "Stealth Announce",  sublabel: "First payment announced" },
];

// ── Hook ─────────────────────────────────────────────────────────────────────

function initSteps(template: Omit<TxStep, "status">[]): TxStep[] {
  return template.map((s) => ({ ...s, status: "idle" as TxStepStatus }));
}

export function useTxProgress(template: Omit<TxStep, "status">[]) {
  const [steps, setSteps] = useState<TxStep[]>(() => initSteps(template));

  const setStepStatus = useCallback((id: string, status: TxStepStatus, extra?: Partial<TxStep>) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status, ...extra } : s))
    );
  }, []);

  const setCountdown = useCallback((id: string, sec: number) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, countdownSec: sec } : s))
    );
  }, []);

  const resetSteps = useCallback((newTemplate?: Omit<TxStep, "status">[]) => {
    setSteps(initSteps(newTemplate ?? template));
  }, [template]);

  const activeStep = steps.find((s) => s.status === "active");
  const allDone = steps.every((s) => s.status === "done");
  const hasError = steps.some((s) => s.status === "error");

  return { steps, setStepStatus, setCountdown, resetSteps, activeStep, allDone, hasError };
}
