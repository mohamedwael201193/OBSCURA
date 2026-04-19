import { motion } from "framer-motion";
import { Coins, Eye, ArrowDownToLine } from "lucide-react";
import { useState } from "react";
import { useCUSDCBalance } from "@/hooks/useCUSDCBalance";
import { toast } from "sonner";

export default function CUSDCPanel() {
  const { handle, decrypted, reveal, wrap, approveStream, busy } = useCUSDCBalance();
  const [wrapAmount, setWrapAmount] = useState("");
  const [maxApprove, setMaxApprove] = useState("");

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
        cUSDC is an encrypted version of USDC. Your balance is hidden on-chain — only you can see it by clicking Reveal.
        You need cUSDC to create payroll streams and buy insurance.
      </p>

      <div className="text-[10px] font-mono space-y-1">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Encrypted Handle</span>
          <span className="text-foreground">{handle ? handle.toString().slice(0, 18) + "…" : "—"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Decrypted Balance</span>
          <span className="text-primary">
            {decrypted !== null ? `${(Number(decrypted) / 1_000_000).toFixed(6)} cUSDC` : "Reveal to view"}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={reveal}
          disabled={busy || !handle}
          className="py-2 text-[10px] tracking-[0.2em] uppercase font-mono bg-secondary/30 border border-border/50 rounded-sm hover:border-primary/40 disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          <Eye className="w-3 h-3" /> Reveal
        </button>
      </div>

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
            Approve PayStream to Spend cUSDC
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="10000"
              value={maxApprove}
              onChange={(e) => setMaxApprove(e.target.value)}
              className="flex-1 px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono"
            />
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={async () => {
                try {
                  await approveStream(BigInt(Math.floor(Number(maxApprove) * 1_000_000)));
                  toast.success("Approved");
                } catch (e) {
                  toast.error((e as Error).message);
                }
              }}
              className="px-4 text-[10px] tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm"
            >
              Approve
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}
