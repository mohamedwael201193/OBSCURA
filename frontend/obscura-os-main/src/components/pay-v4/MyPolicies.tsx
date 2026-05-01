import { useState, useEffect } from "react";
import { FileText, Copy, ExternalLink, Trash2, Umbrella } from "lucide-react";
import { toast } from "sonner";
import type { SavedPolicy } from "@/hooks/useInsurePayroll";
import EmptyState from "./EmptyState";

const POLICIES_KEY = "obscura_insurance_policies";

function loadPolicies(): SavedPolicy[] {
  try {
    return JSON.parse(localStorage.getItem(POLICIES_KEY) || "[]");
  } catch {
    return [];
  }
}

export default function MyPolicies() {
  const [policies, setPolicies] = useState<SavedPolicy[]>([]);

  useEffect(() => {
    setPolicies(loadPolicies());

    const onStorage = () => setPolicies(loadPolicies());
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  // Also refresh when the component re-renders (e.g. after a purchase)
  useEffect(() => {
    const id = setInterval(() => setPolicies(loadPolicies()), 3000);
    return () => clearInterval(id);
  }, []);

  const removePolicy = (idx: number) => {
    const all = loadPolicies();
    all.splice(idx, 1);
    localStorage.setItem(POLICIES_KEY, JSON.stringify(all));
    setPolicies(all);
  };

  if (policies.length === 0) {
    return (
      <EmptyState
        icon={Umbrella}
        title="No coverage yet"
        description="Buy a policy to insure your encrypted streams against missed cycles. Premiums and payouts both stay confidential on-chain."
        cta={{
          label: "Buy your first policy",
          onClick: () => document.getElementById("buy-coverage-anchor")?.scrollIntoView({ behavior: "smooth" }),
        }}
      />
    );
  }

  return (
    <div className="pay-card p-5 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <FileText className="w-3.5 h-3.5 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">My Policies</h3>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">{policies.length} active</span>
      </div>

      <div className="space-y-2">
        {policies.map((p, i) => (
          <div key={i} className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-3 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-muted-foreground/50">Coverage ID:</span>
                <code className="font-mono text-[12px] text-emerald-300">{p.coverageId}</code>
                <button onClick={() => { navigator.clipboard.writeText(p.coverageId); toast.success("Coverage ID copied"); }}
                  className="p-0.5 hover:bg-white/[0.05] rounded-md transition-colors">
                  <Copy className="w-2.5 h-2.5 text-muted-foreground/40" />
                </button>
              </div>
              <button onClick={() => removePolicy(i)} className="p-1 hover:bg-red-500/10 rounded-md transition-colors" title="Remove from list">
                <Trash2 className="w-3 h-3 text-muted-foreground/40 hover:text-red-400 transition-colors" />
              </button>
            </div>
            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground/45 font-mono">
              <span>Stream {p.streamId}</span>
              <span>Escrow {p.escrowId}</span>
              <span>{p.coverageAmount} cUSDC</span>
              <span>{p.coverageDays}d</span>
            </div>
            {p.txHash && (
              <a href={`https://sepolia.arbiscan.io/tx/${p.txHash}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-emerald-400/60 hover:text-emerald-400 transition-colors">
                <ExternalLink className="w-2.5 h-2.5" /> View tx
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
