import { Coins, Eye, ArrowDownToLine, ArrowUpFromLine, ShieldCheck, Loader2 } from "lucide-react";
import UsdcIcon from "@/components/shared/UsdcIcon";
import { useState } from "react";
import { useOcUSDCBalance } from "@/hooks/useOcUSDCBalance";
import { toast } from "sonner";
import { HarmonyMaskedBalance, HarmonyPrivacyBadge } from "@/components/harmony/harmony-ui";

export default function OcUSDCPanel() {
  const { handle, decrypted, usdcBalance, trackedCusdc, reveal, wrap, unwrap, approveStream, busy, error } = useOcUSDCBalance();
  const [wrapAmount, setWrapAmount] = useState("");
  const [unwrapAmount, setUnwrapAmount] = useState("");
  const [maxApprove, setMaxApprove] = useState("30");

  const displayBalance = decrypted !== null
    ? `${(Number(decrypted) / 1_000_000).toFixed(6)}`
    : trackedCusdc ?? null;

  const balanceSource = decrypted !== null
    ? "On-chain decrypted"
    : trackedCusdc
      ? "Tracked estimate — reveal for exact"
      : null;

  return (
    <div className="space-y-5">
      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-muted hairline">
          <Coins className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-[15px] text-foreground leading-tight">Private USDC</div>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">
            Make USDC private · convert back any time
          </p>
        </div>
        <HarmonyPrivacyBadge state="private" label="Private" />
      </div>

      {/* ── Balance row ── */}
      <div className="grid grid-cols-2 gap-3">
        {/* Plain USDC */}
        <div className="rounded-xl border border-border bg-card p-3">
          <div className="flex items-center gap-1.5 text-[10.5px] text-muted-foreground mb-1.5">
            <UsdcIcon className="w-3.5 h-3.5" /> Plain USDC
          </div>
          <div className="font-mono text-lg font-medium tabular-nums">
            {usdcBalance !== null ? usdcBalance : "—"}
          </div>
        </div>
        {/* Private USDC */}
        <div className="rounded-xl border border-border bg-muted/40 p-3">
          <HarmonyMaskedBalance
            label="Private USDC"
            value={displayBalance ?? undefined}
            revealed={decrypted !== null || !!trackedCusdc}
            size="sm"
          />
          {balanceSource && (
            <div className="mt-1 text-[10px] text-muted-foreground/60">{balanceSource}</div>
          )}
        </div>
      </div>

      {/* Reveal — small right-aligned button, not full-width */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] text-muted-foreground/70 leading-snug max-w-[28ch]">
          Your private balance is hidden on-chain. Only you can decrypt it.
        </p>
        <button
          type="button"
          onClick={async () => {
            try {
              toast.info("Decrypting… sign the permit in your wallet");
              await reveal();
              if (!error) toast.success("Balance decrypted");
            } catch (e) {
              toast.error((e as Error).message || "Decrypt failed");
            }
          }}
          disabled={busy || !handle}
          className="btn-pay btn-pay-ghost btn-pay-sm shrink-0"
        >
          {busy
            ? <><Loader2 className="w-3 h-3 animate-spin" /> Decrypting…</>
            : <><Eye className="w-3 h-3" /> Reveal</>
          }
        </button>
      </div>

      {error && (
        <div className="text-[12px] text-destructive bg-destructive/5 px-3 py-2 rounded-lg border border-destructive/25 leading-relaxed">
          {error}
        </div>
      )}

      {/* ── Actions ── */}
      <div className="space-y-4 border-t border-border pt-4">
        {/* Make private */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ArrowDownToLine className="w-3 h-3 text-foreground/55" />
            Make USDC private
          </label>
          <div className="flex gap-2">
            <input
              type="number"
              placeholder="Amount"
              value={wrapAmount}
              onChange={(e) => setWrapAmount(e.target.value)}
              className="pay-input flex-1"
            />
            <button
              type="button"
              onClick={async () => {
                try {
                  toast.info("Step 1: Approving USDC spend…");
                  const toastId = toast.loading("Making private…");
                  await wrap(wrapAmount);
                  toast.dismiss(toastId);
                  toast.success("Done — your USDC is now private.");
                  setWrapAmount("");
                } catch (e) { toast.error((e as Error).message); }
              }}
              className="btn-pay btn-pay-primary shrink-0"
            >
              Make private
            </button>
          </div>
          <p className="text-[10.5px] text-muted-foreground/60">
            Need testnet USDC?{" "}
            <a href="https://faucet.circle.com" target="_blank" rel="noopener noreferrer"
               className="text-foreground/80 hover:text-foreground underline underline-offset-2">
              faucet.circle.com
            </a>
          </p>
        </div>

        {/* Convert back */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ArrowUpFromLine className="w-3 h-3 text-foreground/55" />
            Convert back to USDC
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
              <button
                type="button"
                onClick={() => setUnwrapAmount((Number(decrypted) / 1_000_000).toFixed(6))}
                className="btn-pay btn-pay-ghost btn-pay-sm shrink-0"
                title="Set to full revealed balance"
              >
                Max
              </button>
            )}
            <button
              type="button"
              onClick={async () => {
                try {
                  const toastId = toast.loading("Converting back to USDC…");
                  await unwrap(unwrapAmount);
                  toast.dismiss(toastId);
                  toast.success("Done — USDC is back in your wallet.");
                  setUnwrapAmount("");
                } catch (e) { toast.error((e as Error).message); }
              }}
              className="btn-pay btn-pay-primary shrink-0"
            >
              Convert
            </button>
          </div>
          {decrypted === null && (
            <p className="text-[10.5px] text-muted-foreground/60">
              Reveal your private balance first to see how much you can convert.
            </p>
          )}
        </div>

        {/* Authorize */}
        <div className="space-y-1.5 pt-3 border-t border-border">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <ShieldCheck className="w-3 h-3 text-foreground/55" />
            Authorize PayStream as operator
          </label>
          <div className="flex gap-2">
            <select
              value={maxApprove}
              onChange={(e) => setMaxApprove(e.target.value)}
              className="pay-select flex-1"
            >
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
              <option value="365">1 year</option>
            </select>
            <button
              type="button"
              onClick={async () => {
                try {
                  const days = Number(maxApprove) || 30;
                  toast.info("Checking operator status…");
                  const result = await approveStream(days);
                  if (result === "already-approved") {
                    toast.success("PayStream already authorized — no tx needed.");
                  } else {
                    toast.success(`PayStream authorized for ${days} days`);
                  }
                } catch (e) { toast.error((e as Error).message); }
              }}
              className="btn-pay btn-pay-primary shrink-0"
            >
              Authorize
            </button>
          </div>
          <p className="text-[10.5px] text-muted-foreground/60">
            Lets PayStream move private USDC on your behalf. Time-bounded, no amount limit.
          </p>
        </div>
      </div>
    </div>
  );
}
