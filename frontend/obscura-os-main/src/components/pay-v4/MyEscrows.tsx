import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Copy, Trash2, ExternalLink, CheckCircle, AlertTriangle, ShieldCheck, ChevronDown, Link2 } from "lucide-react";
import type { SavedEscrow } from "@/hooks/useOcUSDCEscrow";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { getJSON, setJSON, migrateGlobalKey } from "@/lib/scopedStorage";
import { OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS } from "@/config/pay";
import EmptyState from "./EmptyState";
import { toast } from "sonner";

const STORAGE_KEY = 'obscura_cusdc_escrows';

function loadEscrows(addr: `0x${string}` | undefined): SavedEscrow[] {
  return getJSON<SavedEscrow[]>(STORAGE_KEY, addr, []);
}

export default function MyEscrows() {
  const { address } = useAccount();
  const [escrows, setEscrows] = useState<SavedEscrow[]>(() => loadEscrows(undefined));
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [sharedId, setSharedId] = useState<string | null>(null);

  useEffect(() => {
    if (address) migrateGlobalKey(STORAGE_KEY, address);
    setEscrows(loadEscrows(address));
    const interval = setInterval(() => setEscrows(loadEscrows(address)), 3000);
    const onStorage = () => setEscrows(loadEscrows(address));
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, [address]);

  // Format amount — stored values are always raw bigint (micro-USDC, 6 decimals)
  const formatAmount = (raw: string) => {
    try {
      const n = BigInt(raw);
      return formatUnits(n, 6);
    } catch {
      return raw;
    }
  };

  const handleCopy = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDelete = (txHash: string) => {
    const updated = escrows.filter((e) => e.txHash !== txHash);
    setJSON(STORAGE_KEY, address, updated);
    setEscrows(updated);
  };

  const currentAddr = OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS?.toLowerCase();
  const currentEscrows = escrows.filter(
    (e) => currentAddr && e.contract?.toLowerCase() === currentAddr
  );
  const legacyEscrows = escrows.filter(
    (e) => !currentAddr || !e.contract || e.contract.toLowerCase() !== currentAddr
  );

  if (escrows.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No escrows yet"
        description="Create your first confidential escrow to lock ocUSDC for a specific recipient. Amounts and parties stay encrypted end-to-end."
        cta={{
          label: "Create an escrow",
          onClick: () => document.getElementById("create-escrow-anchor")?.scrollIntoView({ behavior: "smooth" }),
        }}
      />
    );
  }

  const renderEscrowRow = (escrow: SavedEscrow, isLegacy = false) => {
    const isRecipient = address?.toLowerCase() === escrow.recipient.toLowerCase();
    const formattedAmt = formatAmount(escrow.amount);
    const isTinyAmount = (() => { try { return BigInt(escrow.amount) < 1000n; } catch { return false; } })();
    const rowKey = `${escrow.escrowId}-${escrow.contract ?? escrow.txHash}`;
    return (
      <motion.div key={rowKey} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
        className={`flex items-center justify-between p-3.5 rounded-xl border ${
          isLegacy
            ? "bg-white/[0.01] border-white/[0.04] opacity-60"
            : "bg-white/[0.025] border-white/[0.07]"
        }`}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-[13px] font-bold font-mono ${
              isLegacy ? "text-muted-foreground/50" : "text-[hsl(var(--success))]"
            }`}>#{escrow.escrowId}</span>
            <button onClick={() => handleCopy(escrow.escrowId)}
              className="p-1 hover:bg-white/[0.05] rounded-md transition-colors">
              {copiedId === escrow.escrowId
                ? <CheckCircle className="w-3 h-3 text-foreground" />
                : <Copy className="w-3 h-3 text-muted-foreground/40" />}
            </button>
            {isLegacy && (
              <span className="pay-badge pay-badge-amber text-[10px]">LEGACY</span>
            )}
            {!isLegacy && isRecipient && !isTinyAmount && (
              <span className="pay-badge pay-badge-emerald text-[10px]">YOU CAN REDEEM</span>
            )}
            {isTinyAmount && (
              <span className="pay-badge pay-badge-red text-[10px]">BAD AMOUNT</span>
            )}
          </div>
          <div className="text-[11px] text-muted-foreground/40 mt-0.5 font-mono">
            {formattedAmt} ocUSDC · to {escrow.recipient.slice(0, 8)}… · {new Date(escrow.createdAt).toLocaleDateString()}
          </div>
        </div>
        <div className="flex items-center gap-1.5 ml-2 shrink-0">
          {!isLegacy && (
            <button
              title="Copy claim link to share with recipient"
              onClick={() => {
                const origin = typeof window !== "undefined" ? window.location.origin : "";
                const contract = escrow.contract ?? OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS ?? "";
                const link = `${origin}/pay?tab=escrow&claim=${escrow.escrowId}&contract=${contract}`;
                navigator.clipboard.writeText(link);
                setSharedId(escrow.escrowId);
                setTimeout(() => setSharedId(null), 2500);
                toast.success(`Claim link for escrow #${escrow.escrowId} copied — send it to the recipient.`, { duration: 5000 });
              }}
              className="p-1.5 hover:bg-white/[0.05] rounded-md transition-colors"
            >
              {sharedId === escrow.escrowId
                ? <CheckCircle className="w-3 h-3 text-foreground" />
                : <Link2 className="w-3 h-3 text-muted-foreground/40 hover:text-foreground transition-colors" />}
            </button>
          )}
          <a href={`https://sepolia.arbiscan.io/tx/${escrow.txHash}`} target="_blank" rel="noopener noreferrer"
            className="p-1.5 hover:bg-white/[0.05] rounded-md transition-colors">
            <ExternalLink className="w-3 h-3 text-muted-foreground/40 hover:text-foreground transition-colors" />
          </a>
          <button onClick={() => handleDelete(escrow.txHash)}
            className="p-1.5 hover:bg-white/[0.05] rounded-md transition-colors">
            <Trash2 className="w-3 h-3 text-muted-foreground/40 hover:text-red-400 transition-colors" />
          </button>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <FileText className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg text-foreground leading-tight">My Escrows</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Saved Locally</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">{currentEscrows.length} active</span>
      </div>

      <p className="text-[12px] text-muted-foreground/50">
        Escrows created from this browser. Send the Escrow ID to the recipient — they must connect their wallet and click Redeem.
      </p>

      {currentEscrows.length === 0 && (
        <p className="text-[12px] text-muted-foreground/40 italic">
          No escrows on the current contract yet. Create one above.
        </p>
      )}

      <div className="space-y-2">
        {currentEscrows.map((e) => renderEscrowRow(e, false))}
      </div>

      {legacyEscrows.length > 0 && (
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-[11px] text-muted-foreground/40 hover:text-muted-foreground/60 select-none py-1">
            <ChevronDown className="w-3 h-3 transition-transform group-open:rotate-180" />
            <span>{legacyEscrows.length} legacy escrow{legacyEscrows.length > 1 ? "s" : ""} from older contracts</span>
          </summary>
          <div className="mt-2 space-y-2">
            <div className="flex items-start gap-2 p-2.5 bg-amber-500/[0.05] border border-amber-500/20 rounded-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
              <p className="text-[11px] text-amber-300/75 leading-relaxed">
                These escrows were created against an older contract deployment. Use <strong>Fund / Redeem / Refund by ID</strong> below to attempt recovery, or delete if no longer needed.
              </p>
            </div>
            {legacyEscrows.map((e) => renderEscrowRow(e, true))}
          </div>
        </details>
      )}
    </div>
  );
}
