import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Copy, Trash2, ExternalLink, CheckCircle, AlertTriangle, ShieldCheck } from "lucide-react";
import type { SavedEscrow } from "@/hooks/useCUSDCEscrow";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";
import { getJSON, setJSON, migrateGlobalKey } from "@/lib/scopedStorage";
import EmptyState from "./EmptyState";

const STORAGE_KEY = 'obscura_cusdc_escrows';

function loadEscrows(addr: `0x${string}` | undefined): SavedEscrow[] {
  return getJSON<SavedEscrow[]>(STORAGE_KEY, addr, []);
}

export default function MyEscrows() {
  const { address } = useAccount();
  const [escrows, setEscrows] = useState<SavedEscrow[]>(() => loadEscrows(undefined));
  const [copiedId, setCopiedId] = useState<string | null>(null);

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

  if (escrows.length === 0) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="No escrows yet"
        description="Create your first confidential escrow to lock cUSDC for a specific recipient. Amounts and parties stay encrypted end-to-end."
        cta={{
          label: "Create an escrow",
          onClick: () => document.getElementById("create-escrow-anchor")?.scrollIntoView({ behavior: "smooth" }),
        }}
      />
    );
  }

  return (
    <div className="pay-card p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <FileText className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">My Escrows</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Saved Locally</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">{escrows.length} saved</span>
      </div>

      <p className="text-[12px] text-muted-foreground/50">
        Escrows created from this browser. Send the Escrow ID to the recipient — they must connect their wallet and click Redeem.
      </p>

      <div className="space-y-2">
        {escrows.map((escrow) => {
          const isRecipient = address?.toLowerCase() === escrow.recipient.toLowerCase();
          const formattedAmt = formatAmount(escrow.amount);
          const isTinyAmount = (() => { try { return BigInt(escrow.amount) < 1000n; } catch { return false; } })();
          // Use escrowId + contract address as key — batch escrows share the same txHash
          const rowKey = `${escrow.escrowId}-${escrow.contract ?? escrow.txHash}`;
          return (
            <motion.div key={rowKey} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.025] border border-white/[0.07]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[13px] text-emerald-300 font-bold font-mono">#{escrow.escrowId}</span>
                  <button onClick={() => handleCopy(escrow.escrowId)}
                    className="p-1 hover:bg-white/[0.05] rounded-md transition-colors">
                    {copiedId === escrow.escrowId
                      ? <CheckCircle className="w-3 h-3 text-emerald-400" />
                      : <Copy className="w-3 h-3 text-muted-foreground/40" />}
                  </button>
                  {isRecipient && !isTinyAmount && (
                    <span className="pay-badge pay-badge-emerald text-[10px]">YOU CAN REDEEM</span>
                  )}
                  {isTinyAmount && (
                    <span className="pay-badge pay-badge-red text-[10px]">BAD AMOUNT</span>
                  )}
                </div>
                <div className="text-[11px] text-muted-foreground/40 mt-0.5 font-mono">
                  {formattedAmt} cUSDC · to {escrow.recipient.slice(0, 8)}… · {new Date(escrow.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex items-center gap-1.5 ml-2 shrink-0">
                <a href={`https://sepolia.arbiscan.io/tx/${escrow.txHash}`} target="_blank" rel="noopener noreferrer"
                  className="p-1.5 hover:bg-white/[0.05] rounded-md transition-colors">
                  <ExternalLink className="w-3 h-3 text-muted-foreground/40 hover:text-emerald-400 transition-colors" />
                </a>
                <button onClick={() => handleDelete(escrow.txHash)}
                  className="p-1.5 hover:bg-white/[0.05] rounded-md transition-colors">
                  <Trash2 className="w-3 h-3 text-muted-foreground/40 hover:text-red-400 transition-colors" />
                </button>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
