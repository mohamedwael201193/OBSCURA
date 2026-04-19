import { motion } from "framer-motion";
import { Coins, Eye, ArrowDownToLine } from "lucide-react";
import { useState } from "react";
import { useCUSDCBalance } from "@/hooks/useCUSDCBalance";
import { toast } from "sonner";

export default function CUSDCPanel() {
  const { handle, decrypted, usdcBalance, trackedCusdc, reveal, wrap, approveStream, busy, error } = useCUSDCBalance();
  const [wrapAmount, setWrapAmount] = useState("");
  const [maxApprove, setMaxApprove] = useState("30");

  // Best available balance: on-chain decrypt > tracked from wraps
  const displayBalance = decrypted !== null
    ? `${(Number(decrypted) / 1_000_000).toFixed(6)} cUSDC`
    : trackedCusdc
      ? `~${trackedCusdc} cUSDC (tracked)`
      : "Reveal to view";

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Coins className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">cUSDC Wallet</h3>
        <span className="ml-auto text-[8px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-sm border border-cyan-500/20">
          ENCRYPTED STABLECOIN
        </span>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        cUSDC is an encrypted version of USDC. Your balance is hidden on-chain.
        You need cUSDC to create payroll streams and buy insurance.
      </p>

      <div className="text-[10px] font-mono space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Plain USDC Balance</span>
          <span className="text-foreground">{usdcBalance !== null ? `${usdcBalance} USDC` : "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Encrypted Handle</span>
          <span className="text-foreground">{handle ? handle.toString().slice(0, 18) + "…" : "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">cUSDC Balance</span>
          <span className="text-primary">{displayBalance}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={async () => {
            try {
              toast.info("Decrypting… sign the permit in your wallet");
              await reveal();
              if (!error) toast.success("Balance decrypted!");
            } catch (e) {
              toast.error((e as Error).message || "Decrypt failed");
            }
          }}
          disabled={busy || !handle}
          className="py-2 text-[10px] tracking-[0.2em] uppercase font-mono bg-secondary/30 border border-border/50 rounded-sm hover:border-primary/40 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Eye className="w-3 h-3" /> {busy ? "Decrypting…" : "Reveal"}
        </button>
      </div>

      {error && (
        <div className="text-[9px] font-mono text-red-400 bg-red-500/10 px-3 py-2 rounded-sm border border-red-500/20">
          {error}
        </div>
      )}

      <div className="border-t border-border/30 pt-4 space-y-3">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Wrap USDC → cUSDC
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="100"
              value={wrapAmount}
              onChange={(e) => setWrapAmount(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                try {
                  toast.info("Step 1: Approving USDC spend…");
                  await wrap(wrapAmount);
                  toast.success("Wrapped! Your cUSDC balance is updated.");
                  setWrapAmount("");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              className="px-4 text-[10px] tracking-[0.2em] uppercase font-mono bg-primary/10 text-primary border border-primary/30 rounded-sm flex items-center gap-1.5"
            >
              <ArrowDownToLine className="w-3 h-3" /> Wrap
            </motion.button>
          </div>
          <div className="text-[9px] font-mono text-muted-foreground/60 mt-1">
            Convert regular USDC into encrypted cUSDC. You need plain USDC first — get testnet USDC from <span className="text-cyan-400">faucet.circle.com</span>.
          </div>
        </div>

        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Authorize PayStream as Operator
          </label>
          <div className="flex gap-2">
            <select
              value={maxApprove}
              onChange={(e) => setMaxApprove(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                try {
                  const days = Number(maxApprove) || 30;
                  toast.info(`Authorizing PayStream for ${days} days…`);
                  await approveStream(days);
                  toast.success(`PayStream authorized for ${days} days`);
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              className="px-4 text-[10px] tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm"
            >
              Authorize
            </motion.button>
          </div>
          <div className="text-[9px] font-mono text-muted-foreground/60 mt-1">
            This lets PayStream transfer your cUSDC when creating streams. No amount limit — it's time-bounded.
          </div>
        </div>
      </div>
    </div>
  );
}
