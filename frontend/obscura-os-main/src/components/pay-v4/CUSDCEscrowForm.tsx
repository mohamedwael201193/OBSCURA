import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Lock, Plus, Copy, CheckCircle2, Loader2, ExternalLink, Link2, Clock } from "lucide-react";
import UsdcIcon from "@/components/shared/UsdcIcon";
import { useCUSDCEscrow } from "@/hooks/useCUSDCEscrow";
import { toast } from "sonner";
import { parseUnits } from "viem";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS } from "@/config/pay";
import { FHEStepStatus } from "@/lib/constants";
import TxProgressPanel from "@/components/shared/TxProgressPanel";
import type { TxStep } from "@/hooks/useTxProgress";

// Arbitrum One/Sepolia produces ~7200 blocks/day (12s avg, but L2 rolls up
// faster — 7200 is the conservative number). 0 = no expiry (legacy mode).
const EXPIRY_OPTIONS: Array<{ label: string; days: number }> = [
  { label: "No expiry", days: 0 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

export default function CUSDCEscrowForm() {
  const [ownerAddr, setOwnerAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [resolver, setResolver] = useState("");
  const [resolverData, setResolverData] = useState("");
  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { create, txHash, isTxPending, status, stepIndex, lastEscrowId, reset } = useCUSDCEscrow();
  const usdcBalance = useUSDCBalance();

  // Map useCUSDCEscrow's (status, stepIndex) to TxStep[] for TxProgressPanel.
  const escrowSteps = useMemo((): TxStep[] => {
    type S = TxStepStatus;
    function st(phase: number, label: string, type: TxStep["type"], sub: string): TxStep {
      const active = stepIndex === phase && status !== FHEStepStatus.READY && status !== FHEStepStatus.IDLE && status !== FHEStepStatus.ERROR;
      const done   = stepIndex > phase || (status === FHEStepStatus.READY && stepIndex >= phase);
      const error  = status === FHEStepStatus.ERROR && stepIndex === phase;
      const s: S   = error ? "error" : done ? "done" : active ? "active" : "idle";
      return { id: `step${phase}`, type, label, sublabel: sub, status: s, txHash: done && phase === 1 ? (txHash ?? undefined) : undefined };
    }
    return [
      st(0, "FHE Encrypt",    "fhe_encrypt", "Sealing escrow amount with CoFHE"),
      st(1, "Create Escrow",  "create",      "On-chain record creation"),
      st(2, "FHE Encrypt",    "fhe_encrypt", "Sealing transfer amount"),
      st(3, "Fund Transfer",  "transfer",    "cUSDC → escrow contract"),
      st(4, "Record Funding", "fund",        "Marking escrow as funded"),
    ] as TxStep[];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, stepIndex, txHash]);

  // Needed for the useMemo above to compile — import the type.
  type TxStepStatus = TxStep["status"];

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";
  const isDone = status === "ready" && lastEscrowId;

  const handleCreate = async () => {
    if (!isValidAddress(ownerAddr)) {
      toast.error("Enter a valid owner/recipient address");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid escrow amount");
      return;
    }
    try {
      const parsedAmount = parseUnits(amount, 6);
      const resolverAddr = isValidAddress(resolver)
        ? (resolver as `0x${string}`)
        : ("0x0000000000000000000000000000000000000000" as `0x${string}`);
      const data = resolverData.startsWith("0x") ? (resolverData as `0x${string}`) : ("0x" as `0x${string}`);

      // Compute expiry block client-side. Arbitrum Sepolia ~7200 blocks/day.
      let expiryBlock = 0n;
      if (expiryDays > 0) {
        // Get current block via wagmi public client through window.ethereum is
        // overkill — just use a forward-looking estimate. The contract only
        // checks block.number >= expiryBlock at refund time so a slight drift
        // is harmless.
        const blocksPerDay = 7200n;
        // We don't have publicClient in scope here — hook does the encryption
        // and submit. Pass approx block based on Date.now diff vs known anchor:
        // simpler: fetch from window.ethereum.
        try {
          const provider = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<string> } }).ethereum;
          if (provider) {
            const hex = await provider.request({ method: "eth_blockNumber" });
            const current = BigInt(hex);
            expiryBlock = current + blocksPerDay * BigInt(expiryDays);
          } else {
            // Fallback: anchor at block 0; refund will be callable as soon as N blocks pass.
            expiryBlock = blocksPerDay * BigInt(expiryDays);
          }
        } catch {
          expiryBlock = blocksPerDay * BigInt(expiryDays);
        }
      }

      await create(ownerAddr as `0x${string}`, parsedAmount, resolverAddr, data, expiryBlock);
      const expiryNote = expiryDays > 0
        ? `Auto-refund enabled after ${expiryDays} days if unclaimed.`
        : `No expiry — cancel manually if needed.`;
      toast.success(`Escrow created & auto-funded with cUSDC! ${expiryNote} Send the ID to the recipient.`, { duration: 9000 });
      setOwnerAddr(""); setAmount(""); setResolver(""); setResolverData("");
    } catch (err) {
      toast.error((err as Error).message || "Escrow creation failed");
    }
  };

  const handleCopyLink = () => {
    if (!lastEscrowId) return;
    // Simple, backendless claim link: anyone the sender shares this URL with
    // can land directly on the redeem screen with the ID prefilled. The
    // contract's silent-failure semantics mean only the encrypted recipient
    // actually receives funds — the link is just a UX helper, not a secret.
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/pay?tab=escrow&claim=${lastEscrowId}&contract=${OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS ?? ""}`;
    navigator.clipboard.writeText(url);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2500);
    toast.success("Claim link copied — share it with the recipient via any channel.");
  };

  const handleCopyId = () => {
    if (lastEscrowId) {
      navigator.clipboard.writeText(lastEscrowId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isDone) {
    return (
      <div className="pay-card p-6 space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-display text-sm font-semibold text-emerald-300">Escrow Created &amp; Funded</h3>
            <p className="text-[10px] text-muted-foreground/40 tracking-widest uppercase">cUSDC · Encrypted</p>
          </div>
        </div>
        <div className="rounded-lg bg-emerald-500/8 border border-emerald-500/20 p-4 space-y-2">
          <div className="text-[11px] text-muted-foreground/55 uppercase tracking-wider">Escrow ID</div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-2xl font-bold text-emerald-300">#{lastEscrowId}</span>
            <button onClick={handleCopyId} className="px-2.5 py-1.5 hover:bg-white/[0.06] rounded-md transition-colors text-muted-foreground/60 hover:text-emerald-300 inline-flex items-center gap-1.5 text-[11px] uppercase tracking-wider border border-white/[0.08]">
              {copied ? (
                <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Copied</>
              ) : (
                <><Copy className="w-3.5 h-3.5" /> Copy ID</>
              )}
            </button>
          </div>
          <p className="text-[11px] text-muted-foreground/55 leading-relaxed">
            Escrow created and funded. <span className="text-amber-300/90 font-semibold">Save this ID now</span> — the recipient must enter it in <span className="text-foreground/80">Redeem Escrow</span> from their wallet to claim the cUSDC. Without the ID, the funds cannot be retrieved.
          </p>
        </div>
        <motion.button onClick={handleCopyLink} whileTap={{ scale: 0.99 }}
          className="btn-pay btn-pay-ghost w-full py-2.5 text-cyan-300 border-cyan-500/25 hover:text-cyan-200">
          {linkCopied ? (
            <><CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Claim link copied</>
          ) : (
            <><Link2 className="w-3.5 h-3.5" /> Copy claim link to share</>
          )}
        </motion.button>
        {txHash && (
          <div className="flex items-center gap-2 px-3 py-2.5 bg-white/[0.025] border border-white/[0.07] rounded-lg">
            <ExternalLink className="w-3 h-3 text-cyan-400 shrink-0" />
            <a href={`https://sepolia.arbiscan.io/tx/${txHash}`} target="_blank" rel="noopener noreferrer"
              className="font-mono text-[11px] text-cyan-300 hover:text-cyan-200 transition-colors truncate">
              {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </a>
          </div>
        )}
        <motion.button onClick={reset} whileTap={{ scale: 0.99 }} className="btn-pay btn-pay-ghost w-full py-2.5">
          Create Another Escrow
        </motion.button>
      </div>
    );
  }

  return (
    <div className="pay-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Create Encrypted Escrow</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">cUSDC · FHE Locked</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">cUSDC</span>
      </div>

      {/* USDC balance pill */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#3e73c4]/10 border border-[#3e73c4]/25">
        <UsdcIcon className="w-4 h-4 shrink-0" />
        <span className="text-[11px] text-white/60 font-medium tracking-wide">USDC Balance</span>
        <span className="ml-auto font-mono text-[14px] text-white font-semibold">
          {usdcBalance !== null ? usdcBalance : "—"}
        </span>
        <span className="text-[10px] text-[#3e73c4] font-semibold uppercase tracking-wider">USDC</span>
      </div>

      <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
        Lock cUSDC in an encrypted escrow. The owner address and locked amount are both encrypted on-chain.
        You must have enough cUSDC balance (wrap USDC first in Dashboard tab).
      </p>

      {!isProcessing && (
        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
              Owner / Recipient <span className="normal-case tracking-normal text-muted-foreground/30">(who can redeem)</span>
            </label>
            <input type="text" placeholder="0x… owner address" value={ownerAddr}
              onChange={(e) => setOwnerAddr(e.target.value)} className="pay-input font-mono" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">Amount (cUSDC)</label>
            <input type="number" placeholder="e.g. 100" value={amount}
              onChange={(e) => setAmount(e.target.value)} className="pay-input font-mono" />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
              Resolver Contract <span className="normal-case tracking-normal text-muted-foreground/30">(optional)</span>
            </label>
            <input type="text" placeholder="0x… or leave blank for no resolver" value={resolver}
              onChange={(e) => setResolver(e.target.value)} className="pay-input font-mono" />
            <p className="text-[11px] text-muted-foreground/35">Leave empty for unconditional escrow</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Auto-Refund Window
              <span className="normal-case tracking-normal text-muted-foreground/30">(if unclaimed)</span>
            </label>
            <div className="grid grid-cols-4 gap-2">
              {EXPIRY_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  onClick={() => setExpiryDays(opt.days)}
                  className={`px-2 py-1.5 rounded-lg text-[11px] border transition-colors ${
                    expiryDays === opt.days
                      ? "bg-emerald-500/12 border-emerald-500/40 text-emerald-300"
                      : "bg-white/[0.02] border-white/[0.08] text-muted-foreground/60 hover:text-foreground/80"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/40">
              {expiryDays > 0
                ? `After ${expiryDays} days, anyone can call refund() to return the cUSDC to you. Recipient can still claim before that.`
                : "Funds are held indefinitely until recipient claims or you manually cancel."}
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
              Resolver Data <span className="normal-case tracking-normal text-muted-foreground/30">(optional hex)</span>
            </label>
            <input type="text" placeholder="0x… or leave blank" value={resolverData}
              onChange={(e) => setResolverData(e.target.value)} className="pay-input font-mono" />
          </div>
        </div>
      )}

      {status !== "idle" && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="overflow-hidden"
        >
          <TxProgressPanel
            steps={escrowSteps}
            title="Creating &amp; funding escrow"
            subtitle="5-step FHE flow: create → transfer → fund"
            doneMessage={`Escrow #${lastEscrowId} created and funded`}
          />
        </motion.div>
      )}

      {!isDone && (
        <motion.button onClick={handleCreate} disabled={isProcessing || isTxPending} whileTap={{ scale: 0.99 }}
          className="btn-pay btn-pay-emerald w-full py-2.5">
          <Plus className="w-3.5 h-3.5" />
          {isProcessing ? "Creating & Funding…" : "+ Create & Fund Escrow"}
        </motion.button>
      )}
    </div>
  );
}
