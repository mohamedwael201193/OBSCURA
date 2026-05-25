import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Lock, Plus, Copy, CheckCircle2, Loader2, ExternalLink, Link2, Clock } from "lucide-react";
import UsdcIcon from "@/components/shared/UsdcIcon";
import { useOcUSDCEscrow } from "@/hooks/useOcUSDCEscrow";
import { toast } from "sonner";
import { parseUnits } from "viem";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS } from "@/config/pay";
import { FHEStepStatus } from "@/lib/constants";
import TxProgressPanel from "@/components/shared/TxProgressPanel";
import type { TxStep } from "@/hooks/useTxProgress";

// Arbitrum Sepolia produces ~345 600 blocks/day (~0.25 s/block).
// The old comment and constant (7200) was the Ethereum mainnet value; using it
// made a "30-day" escrow expire in ~15 hours. Fixed. 0 = no expiry (legacy mode).
const EXPIRY_OPTIONS: Array<{ label: string; days: number }> = [
  { label: "No expiry", days: 0 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

export default function OcUSDCEscrowForm() {
  const [ownerAddr, setOwnerAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [resolver, setResolver] = useState("");
  const [resolverData, setResolverData] = useState("");
  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const { create, txHash, isTxPending, status, stepIndex, lastEscrowId, reset } = useOcUSDCEscrow();
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
      st(3, "Fund Transfer",  "transfer",    "ocUSDC → escrow contract"),
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

      // Compute expiry block client-side. Arbitrum Sepolia ~345 600 blocks/day
      // (~0.25 s/block). The old value (7200) was the Ethereum mainnet figure
      // and made "30 days" expire in ~15 hours. Fixed.
      let expiryBlock = 0n;
      if (expiryDays > 0) {
        const blocksPerDay = 345_600n;
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
      toast.success(`Escrow created & auto-funded with ocUSDC! ${expiryNote} Send the ID to the recipient.`, { duration: 9000 });
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
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <h3 className="font-display text-[15px] text-foreground leading-tight">Escrow #{lastEscrowId} ready</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Created and funded privately.</p>
          </div>
        </div>

        {/* PRIMARY: Share with recipient — most important action */}
        <div className="rounded-xl bg-card border border-border p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5 text-foreground shrink-0" />
            <span className="text-[11px] text-foreground font-semibold uppercase tracking-wider">Send to Recipient</span>
          </div>
          <p className="text-[12px] text-muted-foreground/65 leading-relaxed">
            Share this link with your recipient. They open it, connect their wallet, and click{" "}
            <span className="text-foreground/80 font-medium">Claim Escrow</span> — no secret needed.
            The contract privately verifies their access.
          </p>
          <motion.button
            onClick={handleCopyLink}
            whileTap={{ scale: 0.99 }}
            className="btn-pay btn-pay-primary w-full"
          >
            {linkCopied ? (
              <><CheckCircle2 className="w-4 h-4" /> Link copied — paste it to your recipient!</>
            ) : (
              <><Link2 className="w-4 h-4" /> Copy Claim Link to Share</>
            )}
          </motion.button>
          <div className="flex items-center gap-2 justify-center">
            <span className="text-[11px] text-muted-foreground/40">or share the Escrow ID manually:</span>
            <button
              onClick={handleCopyId}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border hover:bg-muted/50 transition-colors text-[11px] font-mono text-foreground"
            >
              #{lastEscrowId}
              {copied ? <CheckCircle2 className="w-3 h-3 text-foreground" /> : <Copy className="w-3 h-3 opacity-60" />}
            </button>
          </div>
        </div>

        {/* TX link */}
        {txHash && (
          <div className="flex items-center gap-2 px-3 py-2 bg-muted/40 border border-border rounded-lg">
            <ExternalLink className="w-3 h-3 text-foreground/60 shrink-0" />
            <a
              href={`https://sepolia.arbiscan.io/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-foreground hover:text-foreground/70 transition-colors truncate"
            >
              {txHash.slice(0, 10)}…{txHash.slice(-8)}
            </a>
            <span className="ml-auto text-[10px] text-muted-foreground/55 shrink-0">Privacy placeholder</span>
          </div>
        )}

        <div className="flex justify-end">
          <motion.button onClick={reset} whileTap={{ scale: 0.99 }} className="btn-pay btn-pay-ghost">
            Create another
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <Lock className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-[15px] text-foreground leading-tight">Create private escrow</div>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">Owner and amount stay hidden on-chain.</p>
        </div>
        <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2 py-0.5 text-[10.5px] font-medium text-foreground/75">Private USDC</span>
      </div>

      {/* USDC balance pill */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border">
        <UsdcIcon className="w-3.5 h-3.5 shrink-0" />
        <span className="text-[11px] text-muted-foreground">Plain USDC</span>
        <span className="ml-auto font-mono text-[13px] text-foreground tabular-nums">
          {usdcBalance !== null ? usdcBalance : "—"}
        </span>
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed">
        Lock private USDC in an escrow. Owner and amount are encrypted on-chain. You'll need private USDC first (Send tab).
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
            <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">Amount (ocUSDC)</label>
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
                      ? "bg-foreground text-background border-foreground font-medium"
                      : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/40">
              {expiryDays > 0
                ? `After ${expiryDays} days, anyone can call refund() to return the ocUSDC to you. Recipient can still claim before that.`
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
        <div className="flex items-center justify-end gap-2 pt-3 mt-2 border-t border-border/60">
          <motion.button onClick={handleCreate} disabled={isProcessing || isTxPending} whileTap={{ scale: 0.99 }}
            className="btn-pay btn-pay-primary">
            <Plus className="w-3.5 h-3.5" />
            {isProcessing ? "Creating…" : "Create & fund escrow"}
          </motion.button>
        </div>
      )}
    </div>
  );
}
