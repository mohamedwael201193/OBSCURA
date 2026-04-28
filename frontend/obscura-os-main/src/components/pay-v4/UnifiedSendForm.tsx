/**
 * UnifiedSendForm — single-form-three-modes sender.
 *
 *   1. Direct  — `cUSDC.confidentialTransfer(to, encAmount)` to a known address.
 *   2. Stealth — resolve recipient meta (handle / address+meta lookup), derive
 *      a fresh ERC-5564 stealth payment, transfer cUSDC there, then publish an
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
  Globe2,
  Loader2,
  ArrowRight,
  Lock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

import { Card } from "@/components/elite/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import ContactPicker from "./ContactPicker";
import { useCUSDCTransfer } from "@/hooks/useCUSDCTransfer";
import { useRecipientResolver, type ResolvedRecipient } from "@/hooks/useRecipientResolver";
import { useReceipts } from "@/hooks/useReceipts";
import { usePreferences, type SendMode } from "@/contexts/PreferencesContext";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/pay";
import { estimateCappedFees } from "@/lib/gas";
import { deriveStealthPayment } from "@/lib/stealth";
import { initFHEClient, encryptAmount } from "@/lib/fhe";
import { ensureOperator } from "@/lib/operators";
import { REINEIRA_CUSDC_ADDRESS, REINEIRA_CUSDC_ABI } from "@/config/pay";

interface ModeOption {
  key: SendMode;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}

const MODES: ModeOption[] = [
  { key: "direct", icon: Send, title: "Direct", description: "Encrypted transfer to a wallet you know." },
  { key: "stealth", icon: Eye, title: "Stealth", description: "Fresh one-time address derived from recipient meta." },
  { key: "cross-chain", icon: Globe2, title: "Bridge", description: "From another chain via CCTP receiver." },
];

export default function UnifiedSendForm() {
  const prefs = usePreferences();
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const transfer = useCUSDCTransfer();
  const resolver = useRecipientResolver();
  const receipts = useReceipts();

  const [mode, setMode] = useState<SendMode>(prefs.defaultSendMode);
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
      setError("Stealth mode requires a recipient with a published meta-address.");
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
          "Authorize cUSDC operator (if needed)",
          "Initialize FHE encryption client",
          "Encrypt amount in browser",
          "Submit confidentialTransfer",
          "Wait for on-chain confirmation",
        ]);
        try {
          advanceProgress(0, "active");
          await ensureOperator(publicClient, walletClient, address, REINEIRA_CUSDC_ADDRESS!);
          advanceProgress(0, "done");
          advanceProgress(1, "active");
          await initFHEClient(publicClient, walletClient);
          advanceProgress(1, "done");
          advanceProgress(2, "active");
          // useCUSDCTransfer encrypts + submits + waits internally; we surface
          // its three remaining steps as a single progress bracket.
          advanceProgress(2, "done");
          advanceProgress(3, "active");
          hash = await transfer.transfer(resolved.address, amountWei);
          advanceProgress(3, "done", `${hash.slice(0, 10)}…`);
          advanceProgress(4, "done");
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
        if (!REINEIRA_CUSDC_ADDRESS || !OBSCURA_STEALTH_REGISTRY_ADDRESS) {
          throw new Error("Stealth registry / cUSDC not configured");
        }
        beginProgress([
          "Derive fresh stealth address",
          "Authorize cUSDC operator (if needed)",
          "Initialize FHE encryption client",
          "Encrypt amount in browser",
          "Transfer cUSDC to stealth address",
          "Publish announcement on-chain",
        ]);
        let stealth: ReturnType<typeof deriveStealthPayment>;
        try {
          advanceProgress(0, "active");
          stealth = deriveStealthPayment(resolved.meta);
          advanceProgress(0, "done", `${stealth.stealthAddress.slice(0, 10)}…`);

          advanceProgress(1, "active");
          await ensureOperator(publicClient, walletClient, address, REINEIRA_CUSDC_ADDRESS);
          advanceProgress(1, "done");

          advanceProgress(2, "active");
          await initFHEClient(publicClient, walletClient);
          advanceProgress(2, "done");

          advanceProgress(3, "active");
          const enc = await encryptAmount(amountWei);
          advanceProgress(3, "done");

          advanceProgress(4, "active");
          const fees = await estimateCappedFees(publicClient);
          hash = await writeContractAsync({
            address: REINEIRA_CUSDC_ADDRESS,
            abi: REINEIRA_CUSDC_ABI,
            functionName: "confidentialTransfer",
            args: [stealth.stealthAddress, enc[0]],
            account: address,
            chain: arbitrumSepolia,
            maxFeePerGas: fees.maxFeePerGas,
            maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
            gas: 500_000n,
          });
          await publicClient.waitForTransactionReceipt({ hash });
          advanceProgress(4, "done", `${hash.slice(0, 10)}…`);

          advanceProgress(5, "active");
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
          advanceProgress(5, "done", `${annHash.slice(0, 10)}…`);

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
    <Card className="p-6">
      {/* Stepper header */}
      <div className="flex items-center justify-between mb-5">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55 font-mono">
          Step {step} / 4
        </div>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`block w-1.5 h-1.5 rounded-full ${
                i <= step ? "bg-emerald-400" : "bg-white/15"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step 1 — pick mode */}
      {step === 1 && (
        <div>
          <h3 className="font-display text-lg text-foreground mb-1">Pick a send mode</h3>
          <p className="text-[12px] text-muted-foreground/70 mb-4">
            Privacy properties differ. Stealth is recommended for personal payments;
            Direct is faster when you can reuse the recipient's wallet.
          </p>
          <div className="grid grid-cols-1 gap-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              return (
                <button
                  key={m.key}
                  onClick={() => {
                    setMode(m.key);
                    setStep(2);
                  }}
                  className={`p-3 rounded-md border text-left flex items-start gap-3 transition-all ${
                    mode === m.key
                      ? "border-emerald-500/50 bg-emerald-500/[0.06]"
                      : "border-white/10 hover:border-white/20"
                  }`}
                >
                  <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                    <Icon className="w-3.5 h-3.5 text-emerald-300" />
                  </div>
                  <div>
                    <div className="text-[13px] text-foreground">{m.title}</div>
                    <div className="text-[11px] text-muted-foreground/65">{m.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Step 2 — recipient */}
      {step === 2 && (
        <div>
          <h3 className="font-display text-lg text-foreground mb-1">Recipient</h3>
          <p className="text-[12px] text-muted-foreground/70 mb-4">
            {mode === "stealth"
              ? "Enter a handle (@alice) or contact label — the recipient must have a published meta-address."
              : "Enter a 0x address, ENS name, or pick a contact."}
          </p>
          <ContactPicker
            value={recipientInput}
            onChange={setRecipientInput}
            placeholder={
              mode === "stealth" ? "@alice or contact label" : "0x… or alice.eth"
            }
          />
          {error && (
            <div className="mt-3 flex items-start gap-2 text-[12px] text-red-300 bg-red-500/[0.06] border border-red-500/20 p-2.5 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-between mt-5">
            <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
            <Button onClick={() => void tryResolve()} disabled={resolver.isResolving}>
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
          <div className="mt-4 p-3 rounded-md border border-white/[0.06] bg-white/[0.02] text-[11px] text-muted-foreground/65 space-y-1.5">
            <div className="flex items-center gap-1.5 text-emerald-300/80">
              <Lock className="w-3 h-3" /> Amount encrypted client-side before submission.
            </div>
            {mode === "stealth" && (
              <div>A fresh stealth address is derived per send — observers cannot link it to this recipient.</div>
            )}
          </div>
          {progress.length > 0 && (
            <div className="mt-4 p-3 rounded-md border border-emerald-500/20 bg-emerald-500/[0.03]">
              <div className="text-[10px] tracking-[0.22em] uppercase text-emerald-300/70 font-mono mb-2">
                Transaction progress
              </div>
              <div className="space-y-1.5">
                {progress.map((p, i) => (
                  <div key={i} className="flex items-start gap-2 text-[11.5px]">
                    <span className="mt-0.5 shrink-0 w-3.5 h-3.5 inline-flex items-center justify-center">
                      {p.status === "done" && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                      {p.status === "active" && <Loader2 className="w-3.5 h-3.5 text-emerald-300 animate-spin" />}
                      {p.status === "pending" && <span className="w-1.5 h-1.5 rounded-full bg-white/20" />}
                      {p.status === "error" && <AlertTriangle className="w-3.5 h-3.5 text-red-400" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className={
                        p.status === "done" ? "text-foreground/85" :
                        p.status === "active" ? "text-emerald-200" :
                        p.status === "error" ? "text-red-300" :
                        "text-muted-foreground/55"
                      }>
                        {p.label}
                      </div>
                      {p.detail && (
                        <div className="text-[10px] font-mono text-muted-foreground/55 mt-0.5 truncate">{p.detail}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {error && (
            <div className="mt-3 flex items-start gap-2 text-[12px] text-red-300 bg-red-500/[0.06] border border-red-500/20 p-2.5 rounded-md">
              <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex justify-between mt-5">
            <Button variant="outline" onClick={() => setStep(2)} disabled={isSending}>Back</Button>
            <Button onClick={() => void submit()} disabled={!amountWei || isSending}>
              {isSending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Sending…
                </>
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
          <div className="inline-flex w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/30 items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-300" />
          </div>
          <h3 className="font-display text-lg text-foreground mb-1">Payment sent</h3>
          <p className="text-[12px] text-muted-foreground/70 mb-4">
            Receipt saved locally. Tx{" "}
            <a
              href={`https://sepolia.arbiscan.io/tx/${successHash}`}
              target="_blank"
              rel="noreferrer"
              className="font-mono text-emerald-300 hover:underline"
            >
              {successHash.slice(0, 10)}…{successHash.slice(-6)}
            </a>
          </p>
          <Button variant="outline" onClick={reset}>Send another</Button>
        </div>
      )}
    </Card>
  );
}
