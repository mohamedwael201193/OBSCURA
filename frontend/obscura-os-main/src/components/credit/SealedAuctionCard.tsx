/**
 * SealedAuctionCard — replaces AuctionCard with:
 *   - Countdown ring (SVG circle stroke-dashoffset)
 *   - Encrypted bid display (HIDDEN until settle)
 *   - Sealed bid form (encrypted submit via useCreditAuctions.submitBid)
 *   - Settle button after expiry
 *   - Bidder count tag
 *
 * Privacy invariant: best bid is "▓▓▓▓" until `settled === true`, after which
 * the contract emits the plaintext via publishDecryptResult.
 */
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Gavel, Clock, Loader2, Award, Lock, Users, Send, Eye } from "lucide-react";
import type { AuctionView } from "@/hooks/useCredit";
import { HIDDEN_GLYPHS } from "@/lib/privacyCopy";

interface Props {
  auction: AuctionView;
  /** Total window duration in seconds — used for ring fill calc. Default 1h. */
  windowSec?: number;
  onBid: (id: bigint, bidAmount: bigint) => Promise<unknown>;
  onSettle: (id: bigint) => Promise<unknown>;
}

export default function SealedAuctionCard({ auction, windowSec = 3600, onBid, onSettle }: Props) {
  const [bid, setBid] = useState("");
  const [busy, setBusy] = useState<"bid" | "settle" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = useMemo(() => Math.max(0, Number(auction.endsAt) - now), [auction.endsAt, now]);
  const expired = remaining === 0;
  const startedAt = Number(auction.endsAt) - windowSec;
  const elapsedFrac = Math.min(1, Math.max(0, (now - startedAt) / windowSec));

  // Ring
  const R = 22, C = 2 * Math.PI * R;
  const offset = C * elapsedFrac;
  const ringColor = auction.settled ? "rgb(110,110,130)" : expired ? "rgb(239,68,68)" : remaining < 300 ? "rgb(245,158,11)" : "rgb(34,211,238)";

  const submit = async () => {
    if (!bid) return;
    setBusy("bid"); setMsg(null);
    try {
      const u = BigInt(Math.round(parseFloat(bid) * 1e6));
      await onBid(auction.id, u);
      setMsg("Bid submitted (encrypted).");
      setBid("");
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Bid failed");
    } finally { setBusy(null); }
  };

  const settle = async () => {
    setBusy("settle"); setMsg(null);
    try {
      await onSettle(auction.id);
      setMsg("Auction settled — bid revealed.");
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Settle failed");
    } finally { setBusy(null); }
  };

  const mm = Math.floor(remaining / 60).toString().padStart(2, "0");
  const ss = (remaining % 60).toString().padStart(2, "0");

  return (
    <div className="rounded-2xl hairline bg-card p-4 border-amber-500/20">
      <div className="flex items-start gap-4">
        {/* Countdown ring */}
        <div className="relative w-[60px] h-[60px] flex-shrink-0">
          <svg viewBox="0 0 60 60" className="w-full h-full -rotate-90">
            <circle cx="30" cy="30" r={R} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="4" />
            <motion.circle
              cx="30" cy="30" r={R}
              fill="none" stroke={ringColor} strokeWidth="4"
              strokeLinecap="round"
              strokeDasharray={C}
              strokeDashoffset={offset}
              initial={false}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.6, ease: "linear" }}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <Clock className="w-4 h-4" style={{ color: ringColor }} />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Gavel className="w-3.5 h-3.5 text-amber-300" />
            <span className="text-[13px] font-medium text-white/90">Sealed Auction #{auction.id.toString()}</span>
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] tracking-widest uppercase font-mono border border-amber-500/20 bg-amber-500/10 text-amber-300">
              <Lock className="w-2 h-2" /> No MEV
            </span>
            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-mono border border-white/10 bg-white/5 text-white/55">
              <Users className="w-2.5 h-2.5" /> {auction.bids} bids
            </span>
          </div>
          <p className="text-[10.5px] font-mono text-white/45 mt-1 truncate">borrower {auction.borrower.slice(0, 12)}…</p>
          <p className="text-[10px] mt-0.5" style={{ color: ringColor }}>
            {auction.settled ? "Settled" : expired ? "Expired — awaiting settle" : `${mm}:${ss} remaining`}
          </p>
        </div>
      </div>

      {/* Bid tiles */}
      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-lg bg-black/25 border border-white/8 px-3 py-2">
          <div className="text-[9.5px] uppercase tracking-[0.15em] text-white/40 font-mono flex items-center gap-1">
            <Eye className="w-2.5 h-2.5" /> Best bid
          </div>
          {auction.settled && auction.bestBid > 0n ? (
            <div className="mt-0.5 text-[hsl(var(--success))] tabular-nums font-mono">
              ${(Number(auction.bestBid) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </div>
          ) : (
            <div className="mt-0.5 text-white/45 font-mono flex items-center gap-1">
              <Lock className="w-2.5 h-2.5" /> {HIDDEN_GLYPHS}
            </div>
          )}
        </div>
        <div className="rounded-lg bg-black/25 border border-white/8 px-3 py-2">
          <div className="text-[9.5px] uppercase tracking-[0.15em] text-white/40 font-mono flex items-center gap-1">
            <Award className="w-2.5 h-2.5" /> Winner
          </div>
          {auction.settled && auction.bestBidder !== "0x0000000000000000000000000000000000000000" ? (
            <div className="mt-0.5 text-violet-300 font-mono truncate">{auction.bestBidder.slice(0, 10)}…</div>
          ) : (
            <div className="mt-0.5 text-white/45 font-mono">{HIDDEN_GLYPHS}</div>
          )}
        </div>
      </div>

      {/* Action */}
      {!auction.settled && !expired && (
        <div className="mt-3 flex items-center gap-2">
          <input
            type="number"
            inputMode="decimal"
            value={bid}
            onChange={(e) => setBid(e.target.value)}
            placeholder="0.00"
            className="flex-1 bg-black/30 border border-white/10 focus:border-violet-500/40 rounded px-2.5 py-1.5 text-[12px] text-white/90 font-mono tabular-nums outline-none"
          />
          <button
            type="button"
            onClick={submit}
            disabled={busy !== null || !bid}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded text-[11px] bg-amber-500/15 hover:bg-amber-500/25 text-amber-100 border border-amber-500/30 disabled:opacity-40"
          >
            {busy === "bid" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Sealed bid
          </button>
        </div>
      )}

      {!auction.settled && expired && (
        <button
          type="button"
          onClick={settle}
          disabled={busy !== null}
          className="mt-3 w-full inline-flex items-center justify-center gap-1 px-3 py-2 rounded text-[12px] bg-violet-500/15 hover:bg-violet-500/25 text-violet-100 border border-violet-500/30 disabled:opacity-40"
        >
          {busy === "settle" ? <Loader2 className="w-3 h-3 animate-spin" /> : <Gavel className="w-3 h-3" />}
          Settle & reveal winning bid
        </button>
      )}

      {msg && <p className="mt-2 text-[10.5px] text-white/55">{msg}</p>}
    </div>
  );
}
