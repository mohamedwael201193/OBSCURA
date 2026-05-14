/**
 * AuctionCard — view + bid + settle.
 */
import { useEffect, useMemo, useState } from "react";
import { Gavel, Clock, Loader2, Award } from "lucide-react";
import type { AuctionView } from "@/hooks/useCredit";

interface Props {
  auction: AuctionView;
  onBid: (id: bigint, bidAmount: bigint) => Promise<unknown>;
  onSettle: (id: bigint) => Promise<unknown>;
}

const AuctionCard = ({ auction, onBid, onSettle }: Props) => {
  const [bid, setBid] = useState("");
  const [busy, setBusy] = useState<"bid" | "settle" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [now, setNow] = useState<number>(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    const t = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const remaining = useMemo(() => Math.max(0, Number(auction.endsAt) - now), [auction.endsAt, now]);
  const expired = remaining === 0;

  const submit = async () => {
    if (!bid) return;
    setBusy("bid");
    setMsg(null);
    try {
      const u = BigInt(Math.round(parseFloat(bid) * 1e6));
      await onBid(auction.id, u);
      setMsg("Bid submitted (encrypted).");
      setBid("");
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Bid failed");
    } finally {
      setBusy(null);
    }
  };

  const settle = async () => {
    setBusy("settle");
    setMsg(null);
    try {
      await onSettle(auction.id);
      setMsg("Auction settled.");
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Settle failed");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.015]">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Gavel className="w-4 h-4 text-amber-400/80" />
            <span className="text-[13px] font-medium text-white/90">Auction #{auction.id.toString()}</span>
          </div>
          <p className="text-[11px] font-mono text-white/45 mt-1 truncate">borrower {auction.borrower.slice(0, 10)}…</p>
        </div>
        <span className={`inline-flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase font-mono ${auction.settled ? "text-white/40" : expired ? "text-rose-300" : "text-amber-300"}`}>
          <Clock className="w-3 h-3" /> {auction.settled ? "settled" : expired ? "expired" : `${Math.floor(remaining / 60)}m ${remaining % 60}s`}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
        <div className="rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Best bid</div>
          {auction.settled && auction.bestBid > 0n
            ? <div className="font-mono text-amber-200">${(Number(auction.bestBid) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
            : <div className="font-mono text-white/35 flex items-center gap-1">🔒 Sealed</div>
          }
        </div>
        <div className="rounded-md bg-black/20 px-2.5 py-2">
          <div className="text-[10px] uppercase tracking-wider text-white/40">Bids</div>
          <div className="font-mono text-white/80">{auction.bids}</div>
        </div>
      </div>

      {!auction.settled && !expired && (
        <div className="mt-3 flex gap-2">
          <input
            inputMode="decimal"
            value={bid}
            onChange={(e) => setBid(e.target.value)}
            placeholder="Bid in cUSDC"
            className="flex-1 bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-amber-500/40"
          />
          <button
            disabled={!bid || !!busy}
            onClick={submit}
            className="px-3 py-2 rounded-md text-sm bg-amber-500/15 border border-amber-500/40 text-amber-100 hover:bg-amber-500/25 disabled:opacity-50 inline-flex items-center gap-1.5"
          >
            {busy === "bid" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Gavel className="w-3.5 h-3.5" />}
            Bid
          </button>
        </div>
      )}

      {!auction.settled && expired && (
        <button
          disabled={!!busy}
          onClick={settle}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
        >
          {busy === "settle" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Award className="w-3.5 h-3.5" />}
          Settle
        </button>
      )}

      {msg && <p className="mt-2 text-xs text-white/60">{msg}</p>}
    </div>
  );
};

export default AuctionCard;
