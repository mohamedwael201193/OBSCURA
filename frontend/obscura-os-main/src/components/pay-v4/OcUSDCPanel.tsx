import { motion } from "framer-motion";
import { Coins, Eye, ArrowDownToLine, ArrowUpFromLine, ShieldCheck, Loader2 } from "lucide-react";
import UsdcIcon from "@/components/shared/UsdcIcon";
import { useState } from "react";
import { useOcUSDCBalance } from "@/hooks/useOcUSDCBalance";
import { toast } from "sonner";

export default function OcUSDCPanel() {
  const { handle, decrypted, usdcBalance, trackedCusdc, reveal, wrap, unwrap, approveStream, busy, error } = useOcUSDCBalance();
  const [wrapAmount, setWrapAmount] = useState("");
  const [unwrapAmount, setUnwrapAmount] = useState("");
  const [maxApprove, setMaxApprove] = useState("30");

  const displayBalance = decrypted !== null
    ? `${(Number(decrypted) / 1_000_000).toFixed(6)}`
    : trackedCusdc ?? null;

  const balanceSource = decrypted !== null
    ? "on-chain decrypted"
    : trackedCusdc
      ? "tracked estimate — click Reveal for exact"
      : null;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <Coins className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-lg text-foreground leading-tight">ocUSDC Wallet</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Encrypted Stablecoin</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">FHERC-20</span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed">
        ocUSDC is USDC shielded on-chain with FHE — your balance is hidden from everyone, including block explorers. Shield USDC to get ocUSDC; unshield to get plain USDC back.
      </p>

      {/* ── Balance Grid ── */}
      {/* Plain USDC always-visible badge */}
      <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-[#3e73c4]/10 border border-[#3e73c4]/25">
        <UsdcIcon className="w-4 h-4 shrink-0" />
        <span className="text-[11px] text-white/60 font-medium tracking-wide">USDC (plain)</span>
        <span className="ml-auto font-mono text-[15px] text-white font-bold">
          {usdcBalance !== null ? usdcBalance : "—"}
        </span>
        <span className="text-[10px] text-[#3e73c4] font-semibold uppercase tracking-wider">USDC</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-xl hairline bg-card p-3 space-y-1.5">
          <div className="text-[9px] tracking-widest uppercase text-muted-foreground/40">Handle (encrypted)</div>
          <div className="text-[13px] font-mono text-foreground/80 truncate">
            {handle ? handle.toString().slice(0, 8) + "…" : "—"}
          </div>
        </div>
        <div className="rounded-xl hairline bg-muted/50 p-3 space-y-1.5">
          <div className="text-[9px] tracking-widest uppercase text-foreground/50">ocUSDC (private)</div>
          <div className="text-[13px] font-mono font-medium">
            {displayBalance
              ? <span className="text-[hsl(var(--success))]">{displayBalance}</span>
              : <span className="text-muted-foreground/30 text-[11px]">tap reveal</span>
            }
          </div>
        </div>
      </div>
      {balanceSource && (
        <p className="text-[10px] text-right text-muted-foreground/30 -mt-3">{balanceSource}</p>
      )}

      {/* ── Reveal CTA ── */}
      <motion.button
        whileTap={{ scale: 0.99 }}
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
        className="btn-pay btn-pay-emerald w-full py-2.5"
      >
        {busy
          ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Decrypting…</>
          : <><Eye className="w-3.5 h-3.5" /> Reveal ocUSDC Balance</>
        }
      </motion.button>

      {error && (
        <div className="text-[12px] text-red-300 bg-red-500/8 px-4 py-3 rounded-lg border border-red-500/20 leading-relaxed">
          {error}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="space-y-4 border-t border-border pt-5">

        {/* Wrap */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
            <ArrowDownToLine className="w-3 h-3 text-foreground/60" />
            Shield USDC → ocUSDC
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              value={wrapAmount}
              onChange={(e) => setWrapAmount(e.target.value)}
              className="pay-input flex-1"
            />
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                try {
                  toast.info("Step 1: Approving USDC spend…");
                  const toastId = toast.loading("Shielding…");
                  await wrap(wrapAmount);
                  toast.dismiss(toastId);
                  toast.success("Shielded! ocUSDC balance updated.");
                  setWrapAmount("");
                } catch (e) { toast.error((e as Error).message); }
              }}
              className="btn-pay btn-pay-emerald shrink-0"
            >
              <ArrowDownToLine className="w-3.5 h-3.5" /> Shield
            </motion.button>
          </div>
          <p className="text-[11px] text-muted-foreground/40">
            Need testnet USDC?{" "}
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
               className="text-foreground/80 hover:text-foreground underline underline-offset-2 transition-colors">
              faucet.circle.com
            </a>
          </p>
        </div>

        {/* Unwrap */}
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
            <ArrowUpFromLine className="w-3 h-3 text-amber-400/60" />
            Unshield ocUSDC → USDC
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              value={unwrapAmount}
              onChange={(e) => setUnwrapAmount(e.target.value)}
              className="pay-input flex-1"
            />
            {decrypted !== null && (
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={() => setUnwrapAmount((Number(decrypted) / 1_000_000).toFixed(6))}
                className="btn-pay shrink-0 text-[11px] px-2.5 py-1.5 border border-amber-500/30 text-amber-400/70 hover:text-amber-300 hover:border-amber-400/50 rounded-lg transition-colors"
                title="Set to full revealed balance"
              >
                Max
              </motion.button>
            )}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                try {
                  const toastId = toast.loading("Unshielding ocUSDC → USDC…");
                  await unwrap(unwrapAmount);
                  toast.dismiss(toastId);
                  toast.success("Unshielded! USDC balance updated.");
                  setUnwrapAmount("");
                } catch (e) { toast.error((e as Error).message); }
              }}
              className="btn-pay btn-pay-emerald shrink-0"
            >
              <ArrowUpFromLine className="w-3.5 h-3.5" /> Unshield
            </motion.button>
          </div>
          <p className="text-[11px] text-muted-foreground/40">
            Unshields on-chain — converts ocUSDC back to plain USDC in your wallet.
            {decrypted === null && (
              <span className="text-amber-400/50"> Reveal your balance first to see how much you can unshield.</span>
            )}
          </p>
        </div>

        {/* Authorize Operator */}
        <div className="space-y-2 pt-2 border-t border-border">
          <label className="flex items-center gap-2 text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">
            <ShieldCheck className="w-3 h-3 text-primary/60" />
            Authorize PayStream as Operator
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <select
                value={maxApprove}
                onChange={(e) => setMaxApprove(e.target.value)}
                className="pay-select"
              >
                <option value="7"   className="bg-[#0a0e14]">7 days</option>
                <option value="30"  className="bg-[#0a0e14]">30 days</option>
                <option value="90"  className="bg-[#0a0e14]">90 days</option>
                <option value="365" className="bg-[#0a0e14]">1 year</option>
              </select>
              <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[hsl(var(--success))]/60" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={async () => {
                try {
                  const days = Number(maxApprove) || 30;
                  toast.info("Checking operator status…");
                  const result = await approveStream(days);
                  if (result === "already-approved") {
                    toast.success("PayStream already authorized — no tx needed!");
                  } else {
                    toast.success(`PayStream authorized for ${days} days`);
                  }
                } catch (e) { toast.error((e as Error).message); }
              }}
              className="btn-pay btn-pay-emerald shrink-0"
            >
              Authorize
            </motion.button>
          </div>
          <p className="text-[11px] text-muted-foreground/40">
            Lets PayStream transfer your ocUSDC. Time-bounded — no amount limit.
          </p>
        </div>
      </div>
    </div>
  );
}
