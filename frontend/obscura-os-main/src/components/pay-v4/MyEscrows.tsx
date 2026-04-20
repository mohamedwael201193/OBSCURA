import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FileText, Copy, Trash2, ExternalLink, CheckCircle, AlertTriangle } from "lucide-react";
import type { SavedEscrow } from "@/hooks/useCUSDCEscrow";
import { formatUnits } from "viem";
import { useAccount } from "wagmi";

const STORAGE_KEY = 'obscura_cusdc_escrows';

function loadEscrows(): SavedEscrow[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

export default function MyEscrows() {
  const { address } = useAccount();
  const [escrows, setEscrows] = useState<SavedEscrow[]>(loadEscrows);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setEscrows(loadEscrows()), 3000);
    const onStorage = () => setEscrows(loadEscrows());
    window.addEventListener('storage', onStorage);
    return () => {
      clearInterval(interval);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setEscrows(updated);
  };

  if (escrows.length === 0) {
    return (
      <div className="glass-panel rounded-sm p-6">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display text-sm tracking-wider text-foreground">My Escrows</h3>
        </div>
        <div className="py-6 text-center text-muted-foreground/40 text-xs font-mono">
          No escrows created yet. Use the form above to create one.
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-sm p-6 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-cyan-400" />
          <h3 className="font-display text-sm tracking-wider text-foreground">My Escrows</h3>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm">
          {escrows.length} saved
        </span>
      </div>

      <p className="text-[9px] font-mono text-muted-foreground/50">
        Escrows created from this browser. Send the Escrow ID to the recipient — they must connect their wallet and click Redeem.
      </p>

      <div className="space-y-2">
        {escrows.map((escrow) => {
          const isRecipient = address?.toLowerCase() === escrow.recipient.toLowerCase();
          const formattedAmt = formatAmount(escrow.amount);
          const isTinyAmount = (() => { try { return BigInt(escrow.amount) < 1000n; } catch { return false; } })();
          return (
          <motion.div
            key={escrow.txHash}
            initial={{ opacity: 0, y: 5 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between p-3 bg-secondary/20 rounded-sm border border-border/30"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-cyan-400 font-bold">#{escrow.escrowId}</span>
                <button onClick={() => handleCopy(escrow.escrowId)} className="p-0.5 hover:bg-secondary rounded-sm">
                  {copiedId === escrow.escrowId ? (
                    <CheckCircle className="w-3 h-3 text-green-400" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted-foreground/50" />
                  )}
                </button>
                {isRecipient && !isTinyAmount && (
                  <span className="text-[7px] font-mono bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-sm border border-green-500/20">
                    YOU CAN REDEEM
                  </span>
                )}
                {isTinyAmount && (
                  <span className="text-[7px] font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded-sm border border-red-500/20">
                    BAD AMOUNT — CREATED BEFORE FIX
                  </span>
                )}
              </div>
              <div className="text-[8px] font-mono text-muted-foreground/40 mt-0.5">
                {formattedAmt} cUSDC · to {escrow.recipient.slice(0, 8)}... · {new Date(escrow.createdAt).toLocaleDateString()}
              </div>
            </div>
            <div className="flex items-center gap-1.5 ml-2">
              <a
                href={`https://sepolia.arbiscan.io/tx/${escrow.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 hover:bg-secondary rounded-sm"
              >
                <ExternalLink className="w-3 h-3 text-muted-foreground/50 hover:text-cyan-400" />
              </a>
              <button onClick={() => handleDelete(escrow.txHash)} className="p-1 hover:bg-secondary rounded-sm">
                <Trash2 className="w-3 h-3 text-muted-foreground/50 hover:text-red-400" />
              </button>
            </div>
          </motion.div>
          );
        })}
      </div>
    </div>
  );
}
