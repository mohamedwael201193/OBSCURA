import { useState, useEffect } from "react";
import { FileText, Copy, ExternalLink, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { SavedPolicy } from "@/hooks/useInsurePayroll";

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

  if (policies.length === 0) return null;

  return (
    <div className="glass-panel rounded-md p-4 space-y-3">
      <div className="flex items-center gap-2">
        <FileText className="w-4 h-4 text-cyan-400" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          My Policies
        </h3>
        <span className="ml-auto text-[11px] text-muted-foreground/50">
          {policies.length} active
        </span>
      </div>

      <div className="space-y-2">
        {policies.map((p, i) => (
          <div
            key={i}
            className="bg-background/50 border border-border/30 rounded-md p-3 space-y-1"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Coverage ID:
                </span>
                <code className="font-mono text-xs text-cyan-400">
                  {p.coverageId}
                </code>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(p.coverageId);
                    toast.success("Coverage ID copied");
                  }}
                  className="p-0.5 hover:bg-muted/50 rounded-md"
                >
                  <Copy className="w-2.5 h-2.5 text-muted-foreground" />
                </button>
              </div>
              <button
                onClick={() => removePolicy(i)}
                className="p-1 hover:bg-red-500/10 rounded-md"
                title="Remove from list"
              >
                <Trash2 className="w-3 h-3 text-muted-foreground/40 hover:text-red-400" />
              </button>
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground/60">
              <span>Stream {p.streamId}</span>
              <span>Escrow {p.escrowId}</span>
              <span>{p.coverageAmount} cUSDC</span>
              <span>{p.coverageDays}d</span>
            </div>
            {p.txHash && (
              <a
                href={`https://sepolia.arbiscan.io/tx/${p.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-cyan-400/60 hover:text-cyan-400"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                View tx
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
