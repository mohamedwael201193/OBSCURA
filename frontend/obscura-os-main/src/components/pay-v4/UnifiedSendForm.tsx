/**
 * UnifiedSendForm — single-form-three-modes sender.
 *
 *   1. Direct  — `ocUSDC.confidentialTransfer(to, encAmount)` to a known address.
 *   2. Stealth — resolve recipient meta (handle / address+meta lookup), derive
 *      a fresh ERC-5564 stealth payment, transfer ocUSDC there, then publish an
 *      `announce()` event so the recipient can find it via `useStealthScan`.
 *   3. Bridge  — link out to the existing CrossChainFund form.
 *
 * Mode auto-selects from `prefs.defaultSendMode`. All three paths emit a
 * receipt via `useReceipts.add()`.
 */
import { useEffect, useMemo, useState } from "react";
import { useAccount, usePublicClient, useWalletClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { encodeAbiParameters, parseUnits } from "viem";
import {
  Send,
  Eye,
  Loader2,
  ArrowRight,
  Lock,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import UsdcIcon from "@/components/shared/UsdcIcon";
import TxProgressPanel from "@/components/shared/TxProgressPanel";
import type { TxStep } from "@/hooks/useTxProgress";

import ContactPicker from "./ContactPicker";
import { useOcUSDCTransfer } from "@/hooks/useOcUSDCTransfer";
import { useRecipientResolver, type ResolvedRecipient } from "@/hooks/useRecipientResolver";
import { useReceipts } from "@/hooks/useReceipts";
import { usePreferences, type SendMode } from "@/contexts/PreferencesContext";
import { useOcUSDCBalance } from "@/hooks/useOcUSDCBalance";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/pay";
import { estimateCappedFees } from "@/lib/gas";
import { deriveStealthPayment } from "@/lib/stealth";
import { initFHEClient, encryptAmount } from "@/lib/fhe";
import { CONFIDENTIAL_USDC_ADDRESS, CONFIDENTIAL_TOKEN_ABI } from "@/config/credit";
import { payHarmony as h } from "@/components/harmony/payHarmonyClasses";

interface ModeOption {
  key: SendMode;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  tag?: string;
  description: string;
}

/** Direct and Stealth only — Bridge has its own dedicated card below the send form. */
const MODES: ModeOption[] = [
  {
    key: "stealth",
    icon: Eye,
    title: "Stealth Send",
    tag: "Recommended",
    description: "Derives a fresh one-time address from recipient's meta — no on-chain linkage.",
  },
  {
    key: "direct",
    icon: Send,
    title: "Direct Send",
    description: "Encrypted transfer straight to a known wallet address.",
  },
];

export default function UnifiedSendForm() {
  const prefs = usePreferences();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const transfer = useOcUSDCTransfer();
  const resolver = useRecipientResolver();
  const receipts = useReceipts();
  const { decrypted, trackedCusdc } = useOcUSDCBalance();

  const cusdc = decrypted !== null
    ? (Number(decrypted) / 1_000_000).toFixed(6)
    : trackedCusdc ?? null;

  // Default to stealth if the preference says direct but user hasn't changed it
  const [mode, setMode] = useState<SendMode>(
    prefs.defaultSendMode === "cross-chain" ? "stealth" : prefs.defaultSendMode
  );
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [recipientInput, setRecipientInput] = useState("");
  const [resolved, setResolved] = useState<ResolvedRecipient | null>(null);
  const [amount, setAmount] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successHash, setSuccessHash] = useState<`0x${string}` | null>(null);

  /** Live per-step progress shown in the UI while a transaction runs. */
  type StepStatus = "pending" | "active" | "done" | "error";
  interface ProgressStep { label: string; status: StepStatus; detail?: string }
  const [progress, setProgress] = useState<ProgressStep[]>([]);
  const beginProgress = (labels: string[]) =>
    setProgress(labels.map((label) => ({ label, status: "pending" })));
  const advanceProgress = (idx: number, status: StepStatus, detail?: string) =>
    setProgress((prev) => prev.map((s, i) => (i === idx ? { ...s, status, detail } : s)));

  useEffect(() => {
    setMode(prefs.defaultSendMode);
  }, [prefs.defaultSendMode]);

  const amountWei = useMemo(() => {
    const n = parseFloat(amount);
    if (!Number.isFinite(n) || n <= 0) return null;
    try {
      return parseUnits(amount, 6);
    } catch {
      return null;
    }
  }, [amount]);

  const tryResolve = async () => {
    setError(null);
    if (!recipientInput.trim()) {
      setError("Enter a recipient");
      return;
    }
    const r = await resolver.resolve(recipientInput);
    setResolved(r);
    if (r.warning && !r.address) {
      setError(r.warning);
      return;
    }
    if (mode === "stealth" && !r.meta) {
      setError(
        r.kind === "address"
          ? "This address has not registered a stealth meta-address yet. Ask them to go to Receive → Register stealth meta-address first, or use Direct Send instead."
          : "Stealth mode requires a recipient with a published meta-address."
      );
      return;
    }
    setStep(3);
  };

  const submit = async () => {
    if (!resolved || !amountWei || !publicClient || !walletClient || !address) return;
    setIsSending(true);
    setError(null);
    try {
      let hash: `0x${string}`;

      if (mode === "direct") {
        if (!resolved.address) throw new Error("Recipient address missing");
        beginProgress([
          "Initialize FHE encryption client",
          "Encrypt amount in browser",
          "Submit confidentialTransfer",
          "Wait for on-chain confirmation",
        ]);
        try {
          advanceProgress(0, "active");
          await initFHEClient(publicClient, walletClient);
          advanceProgress(0, "done");
          advanceProgress(1, "active");
          // useCUSDCTransfer encrypts + submits + waits internally; we surface
          // its three remaining steps as a single progress bracket.
          advanceProgress(1, "done");
          advanceProgress(2, "active");
          hash = await transfer.transfer(resolved.address, amountWei);
          advanceProgress(2, "done", `${hash.slice(0, 10)}…`);
          advanceProgress(3, "done");
        } catch (e) {
          const idx = progress.findIndex((s) => s.status === "active");
          if (idx >= 0) advanceProgress(idx, "error", (e as Error).message);
          throw e;
        }
        receipts.add({
          kind: "transfer",
          txHash: hash,
          chainId: arbitrumSepolia.id,
          amount,
          recipientLabel: resolved.label ?? resolved.raw,
          meta: { mode: "direct", to: resolved.address },
        });
      } else if (mode === "stealth") {
        if (!resolved.meta) throw new Error("Recipient meta-address missing");
        if (!CONFIDENTIAL_USDC_ADDRESS || !OBSCURA_STEALTH_REGISTRY_ADDRESS) {
          throw new Error("Stealth registry / ocUSDC not configured");
        }
        beginProgress([
          "Derive fresh stealth address",
          "Initialize FHE encryption client",
          "Encrypt amount in browser",
          "Transfer ocUSDC to stealth address",
          "Publish announcement on-chain",
        ]);
        let stealth: ReturnType<typeof deriveStealthPayment>;
        try {
          advanceProgress(0, "active");
          stealth = deriveStealthPayment(resolved.meta);
          advanceProgress(0, "done", `${stealth.stealthAddress.slice(0, 10)}…`);

          advanceProgress(1, "active");
          await initFHEClient(publicClient, walletClient);
          advanceProgress(1, "done");

          advanceProgress(2, "active");
          const enc = await encryptAmount(amountWei);
          advanceProgress(2, "done");

          advanceProgress(3, "active");
          const fees = await estimateCappedFees(publicClient);
          hash = await writeContractAsync({
            address: CONFIDENTIAL_USDC_ADDRESS,
            abi: CONFIDENTIAL_TOKEN_ABI,
            functionName: "confidentialTransfer",
            args: [stealth.stealthAddress, enc[0]],
            account: address,
            chain: arbitrumSepolia,
            maxFeePerGas: fees.maxFeePerGas,
            maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
            gas: 500_000n,
          });
          await publicClient.waitForTransactionReceipt({ hash });
          advanceProgress(3, "done", `${hash.slice(0, 10)}…`);

          advanceProgress(4, "active");
          const metadata = encodeAbiParameters(
            [{ type: "uint256" }, { type: "uint256" }, { type: "uint256" }],
            [0n, 0n, amountWei]
          );
          const annFees = await estimateCappedFees(publicClient);
          const annHash = await writeContractAsync({
            address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
            abi: OBSCURA_STEALTH_REGISTRY_ABI,
            functionName: "announce",
            args: [stealth.stealthAddress, stealth.ephemeralPubKey, stealth.viewTag, metadata],
            account: address,
            chain: arbitrumSepolia,
            maxFeePerGas: annFees.maxFeePerGas,
            maxPriorityFeePerGas: annFees.maxPriorityFeePerGas,
            gas: 250_000n,
          });
          await publicClient.waitForTransactionReceipt({ hash: annHash });
          advanceProgress(4, "done", `${annHash.slice(0, 10)}…`);

          receipts.add({
            kind: "stealth-sweep",
            txHash: hash,
            chainId: arbitrumSepolia.id,
            amount,
            recipientLabel: resolved.label ?? resolved.raw,
            meta: {
              mode: "stealth",
              stealthAddress: stealth.stealthAddress,
              announceTx: annHash,
            },
          });
        } catch (e) {
          const idx = progress.findIndex((s) => s.status === "active");
          if (idx >= 0) advanceProgress(idx, "error", (e as Error).message);
          throw e;
        }
      } else {
        throw new Error("Use the Bridge form for cross-chain sends");
      }

      setSuccessHash(hash);
      setStep(4);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setIsSending(false);
    }
  };

  const reset = () => {
    setStep(1);
    setRecipientInput("");
    setResolved(null);
    setAmount("");
    setSuccessHash(null);
    setError(null);
    setProgress([]);
  };

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <Send className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-display text-lg text-foreground leading-tight">Send ocUSDC</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Encrypted · Private</p>
        </div>
        {/* cUSDC balance */}
        <div className="flex shrink-0 items-center gap-1.5 rounded-full hairline bg-muted px-2.5 py-1.5">
          <Lock className="w-3 h-3 text-foreground/70" />
          <span className="font-mono text-[12px] text-[hsl(var(--success))] font-medium">
            {cusdc ?? "•••"}
          </span>
          <span className="text-[9px] text-foreground/50 uppercase">ocUSDC</span>
        </div>
        {/* step dots */}
        <div className="flex items-center gap-1 shrink-0">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={`block h-1.5 w-1.5 rounded-full ${i <= step ? "bg-accent" : "bg-border"}`} />
          ))}
        </div>
      </div>

      {/* Step 1 — send mode */}
      {step === 1 && (
        <div className="space-y-3">
          <div>
            <div className={`${h.label} mb-3`}>
              Step 1 / 4 · Choose how to send
            </div>
          </div>
          <div className="grid grid-cols-1 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              const isSelected = mode === m.key;
              return (
                <button
                  key={m.key}
                  onClick={() => { setMode(m.key); setStep(2); }}
                  className={`p-4 rounded-xl border text-left flex items-center gap-4 transition-all ${
                    isSelected
                      ? "border-accent/40 bg-accent/15"
                      : "hairline bg-card hover:bg-muted/50"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                    isSelected
                      ? "bg-accent/20 border-accent/35"
                      : "bg-muted hairline"
                  }`}>
                    <Icon className={`w-4 h-4 ${isSelected ? "text-[hsl(var(--success))]" : "text-muted-foreground/60"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-foreground">{m.title}</span>
                      {m.tag && (
                        <span className="text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-muted text-foreground border border-border font-semibold">
                          {m.tag}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-muted-foreground/55 mt-0.5 leading-relaxed">{m.description}</div>
                  </div>
                  <ArrowRight className={`w-4 h-4 shrink-0 ${isSelected ? "text-foreground" : "text-muted-foreground/25"}`} />
                </button>
              );
            })}
          </div>
          <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl hairline bg-muted/40">
            <ShieldCheck className="w-3.5 h-3.5 text-foreground/60 mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground/55 leading-relaxed">
              Both modes encrypt the amount client-side with FHE before it touches the chain.
              <span className="text-[hsl(var(--success))]/70"> Stealth</span> also hides who you're paying.
            </p>
          </div>
        </div>
      )}

      {/* Step 2 — recipient */}
      {step === 2 && (
        <div className="space-y-4">
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono mb-1">
              Step 2 / 4 · Recipient
            </div>
            <p className="text-[12px] text-muted-foreground/60">
              {mode === "stealth"
                ? "Enter a 0x address, @handle, or ENS name — the recipient must have registered their stealth meta-address."
                : "Enter a 0x address, ENS name, or @handle."}
            </p>
          </div>
          <ContactPicker
            value={recipientInput}
            onChange={setRecipientInput}
            placeholder={mode === "stealth" ? "0x… or @alice or alice.eth" : "0x… or alice.eth"}
          />
          {error && (
            <div className="flex items-start gap-2 text-[12px] text-red-300 bg-red-500/[0.06] border border-red-500/20 p-2.5 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} className="text-[12px]">← Back</Button>
            <Button onClick={() => void tryResolve()} disabled={resolver.isResolving} className="text-[12px]">
              {resolver.isResolving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <>Continue <ArrowRight className="w-3.5 h-3.5 ml-1" /></>}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3 — amount + review */}
      {step === 3 && resolved && (
        <div>
          <h3 className="font-display text-lg text-foreground mb-1">Amount</h3>
          <div className="text-[11px] text-muted-foreground/55 mb-3 font-mono">
            Sending to {resolved.label ?? resolved.raw}
            {resolved.address && (
              <span> · {resolved.address.slice(0, 6)}…{resolved.address.slice(-4)}</span>
            )}
          </div>
          {resolved.warning && (
            <div className="mb-3 flex items-start gap-2 text-[12px] text-amber-300 bg-amber-500/[0.06] border border-amber-500/20 p-2.5 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{resolved.warning}</span>
            </div>
          )}
          <Label className="text-[11px] tracking-wide uppercase text-muted-foreground/70">Amount (cUSDC)</Label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className="mt-1.5 font-mono"
          />
          <div className="mt-4 p-3 rounded-xl hairline bg-muted/40 text-[11px] text-muted-foreground/65 space-y-1.5">
            <div className="flex items-center gap-1.5 text-[hsl(var(--success))]/80">
              <Lock className="w-3 h-3" /> Amount encrypted client-side before submission.
            </div>
            {mode === "stealth" && (
              <div>A fresh stealth address is derived per send — observers cannot link it to this recipient.</div>
            )}
          </div>
          {progress.length > 0 && (
            <div className="mt-4">
              <TxProgressPanel
                steps={progress.map((p, i): TxStep => ({
                  id: `send-step-${i}`,
                  type: p.label.toLowerCase().includes("encrypt") ? "fhe_encrypt"
                      : p.label.toLowerCase().includes("announce") ? "announce"
                      : p.label.toLowerCase().includes("confirm") ? "record"
                      : p.label.toLowerCase().includes("operator") ? "approve"
                      : "transfer",
                  label: p.label,
                  sublabel: p.detail,
                  status: p.status === "pending" ? "idle"
                        : p.status === "active"  ? "active"
                        : p.status === "done"    ? "done"
                        : "error",
                  txHash: (p.detail && p.detail.includes("…")) ? undefined : undefined,
                }))}
                title={mode === "stealth" ? "Sending privately (stealth)" : "Sending confidentially"}
                subtitle={mode === "stealth" ? "2-tx stealth flow" : "Direct confidential transfer"}
                doneMessage="Payment confirmed on-chain"
              />
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-start gap-2 text-[12px] text-red-300 bg-red-500/[0.06] border border-red-500/20 p-2.5 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-between mt-5">
            <Button variant="outline" onClick={() => setStep(2)} disabled={isSending} className="text-[12px]">← Back</Button>
            <Button onClick={() => void submit()} disabled={!amountWei || isSending} className="text-[12px]">
              {isSending ? (
                <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sending…</>
              ) : (
                <>Send <ArrowRight className="w-3.5 h-3.5 ml-1" /></>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 4 — success */}
      {step === 4 && successHash && (
        <div className="text-center py-6">
          <div className="inline-flex w-12 h-12 rounded-full bg-muted border border-border items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-foreground" />
          </div>
          <h3 className="font-display text-lg text-foreground mb-1">Payment sent</h3>
          <p className="text-[12px] text-muted-foreground/70 mb-4">
            Receipt saved locally. Tx{" "}
            <a
              href={`https://sepolia.arbiscan.io/tx/${successHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-foreground/70 hover:underline"
            >
              {successHash.slice(0, 10)}…{successHash.slice(-6)}
            </a>
          </p>
          <Button variant="outline" onClick={reset} className="text-[12px]">Send another</Button>
        </div>
      )}
    </div>
  );
}
