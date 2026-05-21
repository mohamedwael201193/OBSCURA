/**
 * PrivateExplorer — improved on-chain event timeline.
 *
 * Replaces HistoryFeed with:
 *   - Filters: action (Supplied/Borrowed/Repaid/…) and market
 *   - Date column (block timestamp formatted)
 *   - "Reveal amount" toggle per row (CoFHE amounts on public events
 *     are already plaintext — but we keep the option to mask for screen
 *     sharing / privacy demos)
 *   - CSV export of the visible filtered slice
 *
 * Privacy note: the events emitted from the credit market expose
 * plaintext `amount` only as a convenience for indexing — the *user
 * principal* still requires FHE decrypt elsewhere. We label that clearly.
 */
import { useEffect, useMemo, useState } from "react";
import { usePublicClient } from "wagmi";
import {
  ScrollText, RefreshCcw, Loader2, ArrowDownToLine, ArrowUpFromLine,
  Filter, Download, Eye, EyeOff, ExternalLink,
} from "lucide-react";
import { Card, CardHeader } from "@/components/elite/Layout";
import { CREDIT_MARKET_ABI, type CreditMarketMeta } from "@/config/credit";
import { PRIVACY_COPY, HIDDEN_GLYPHS } from "@/lib/privacyCopy";

type EventType =
  | "Supplied" | "Borrowed" | "Repaid"
  | "WithdrawnCollateral" | "SuppliedCollateral" | "Withdrawn";

interface Row {
  type: EventType;
  market: `0x${string}`;
  marketLabel: string;
  user?: `0x${string}`;
  amount?: bigint;
  blockNumber: bigint;
  ts: number; // ms
  txHash: `0x${string}`;
}

const ICONS: Record<EventType, React.ComponentType<any>> = {
  Supplied: ArrowDownToLine, Borrowed: ArrowDownToLine, Repaid: ArrowUpFromLine,
  WithdrawnCollateral: ArrowUpFromLine, SuppliedCollateral: ArrowDownToLine, Withdrawn: ArrowUpFromLine,
};
const COLORS: Record<EventType, string> = {
  Supplied: "text-emerald-300", Borrowed: "text-violet-300", Repaid: "text-emerald-300",
  WithdrawnCollateral: "text-amber-300", SuppliedCollateral: "text-emerald-300", Withdrawn: "text-amber-300",
};
const ALL_TYPES: EventType[] = ["Supplied", "Borrowed", "Repaid", "WithdrawnCollateral", "SuppliedCollateral", "Withdrawn"];

interface Props {
  markets: CreditMarketMeta[];
}

export default function PrivateExplorer({ markets }: Props) {
  const publicClient = usePublicClient();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<Set<EventType>>(new Set(ALL_TYPES));
  const [marketFilter, setMarketFilter] = useState<string>("__all__");
  const [maskAll, setMaskAll] = useState(false);
  const [revealedTxs, setRevealedTxs] = useState<Set<string>>(new Set());

  const refresh = async () => {
    if (!publicClient) return;
    setLoading(true); setErr(null);
    try {
      const head = await publicClient.getBlockNumber();
      const fromBlock = head > 5000n ? head - 5000n : 0n;
      const all: Row[] = [];
      const blockTsCache = new Map<bigint, number>();

      for (const m of markets) {
        if (!m.address) continue;
        try {
          const evs = (await publicClient.getContractEvents({
            address: m.address, abi: CREDIT_MARKET_ABI as any,
            fromBlock, toBlock: "latest",
          })) as any[];
          for (const e of evs) {
            if (!ALL_TYPES.includes(e.eventName)) continue;
            let ts = blockTsCache.get(e.blockNumber);
            if (ts === undefined) {
              try {
                const b = await publicClient.getBlock({ blockNumber: e.blockNumber });
                ts = Number(b.timestamp) * 1000;
              } catch { ts = Date.now(); }
              blockTsCache.set(e.blockNumber, ts);
            }
            all.push({
              type: e.eventName, market: m.address, marketLabel: m.label,
              user: e.args?.user, amount: e.args?.amount,
              blockNumber: e.blockNumber, ts, txHash: e.transactionHash,
            });
          }
        } catch { /* market unreachable */ }
      }

      const seen = new Set<string>();
      const unique = all.filter((r) => {
        const k = `${r.txHash}-${r.type}`;
        if (seen.has(k)) return false;
        seen.add(k); return true;
      });
      unique.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      setRows(unique.slice(0, 200));
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); /* eslint-disable-next-line */ }, [publicClient, markets.length]);

  const filtered = useMemo(() => {
    return rows.filter((r) =>
      typeFilter.has(r.type) &&
      (marketFilter === "__all__" || r.market === marketFilter)
    );
  }, [rows, typeFilter, marketFilter]);

  const exportCsv = () => {
    const header = "ts,type,market,user,amount,txHash";
    const body = filtered.map((r) =>
      [
        new Date(r.ts).toISOString(),
        r.type,
        r.marketLabel,
        r.user ?? "",
        r.amount?.toString() ?? "",
        r.txHash,
      ].join(",")
    ).join("\n");
    const blob = new Blob([header + "\n" + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `obscura-credit-history-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleType = (t: EventType) => {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t); else next.add(t);
      return next;
    });
  };

  const toggleRowReveal = (tx: string) => {
    setRevealedTxs((prev) => {
      const next = new Set(prev);
      if (next.has(tx)) next.delete(tx); else next.add(tx);
      return next;
    });
  };

  return (
    <Card>
      <CardHeader
        title="Private explorer"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMaskAll((v) => !v)}
              className="text-[10.5px] text-white/55 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10"
            >
              {maskAll ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              {maskAll ? "Mask amounts" : "Show amounts"}
            </button>
            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className="text-[10.5px] text-white/55 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 disabled:opacity-40"
            >
              <Download className="w-3 h-3" /> CSV
            </button>
            <button onClick={refresh} disabled={loading} className="text-[10.5px] text-white/55 hover:text-white inline-flex items-center gap-1 px-2 py-1 rounded border border-white/10 disabled:opacity-50">
              {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />}
              Refresh
            </button>
          </div>
        }
      />

      <div className="px-5 pt-3 pb-2 flex flex-wrap items-center gap-2 border-b border-white/5">
        <Filter className="w-3 h-3 text-white/40" />
        {ALL_TYPES.map((t) => {
          const on = typeFilter.has(t);
          return (
            <button
              key={t}
              onClick={() => toggleType(t)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                on
                  ? `${COLORS[t]} border-white/15 bg-white/5`
                  : "text-white/35 border-white/10 hover:text-white/60"
              }`}
            >
              {t}
            </button>
          );
        })}
        <select
          value={marketFilter}
          onChange={(e) => setMarketFilter(e.target.value)}
          className="ml-auto text-[10.5px] bg-[#0d0d14] border border-white/10 rounded px-2 py-1 text-white/70"
        >
          <option value="__all__" className="bg-[#0d0d14] text-white">All markets</option>
          {markets.map((m) => (
            <option key={m.address} value={m.address} className="bg-[#0d0d14] text-white">{m.label}</option>
          ))}
        </select>
      </div>

      <div className="px-2 py-2">
        {err && <p className="px-3 py-2 text-xs text-rose-300">{err}</p>}
        {!err && filtered.length === 0 && !loading && (
          <p className="px-3 py-6 text-xs text-white/45 text-center inline-flex items-center justify-center gap-2 w-full">
            <ScrollText className="w-3.5 h-3.5" /> No matching events.
          </p>
        )}
        <ul className="divide-y divide-white/[0.04]">
          {filtered.map((r, i) => {
            const Icon = ICONS[r.type];
            const color = COLORS[r.type];
            const showAmount = !maskAll || revealedTxs.has(r.txHash);
            return (
              <li key={`${r.txHash}-${r.type}-${i}`} className="px-3 py-2.5 grid grid-cols-[auto_1fr_auto] items-center gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span className={`font-mono ${color}`}>{r.type}</span>
                </div>
                <div className="min-w-0 text-white/55 truncate">
                  <span className="text-white/35">{new Date(r.ts).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                  <span className="mx-2 text-white/20">·</span>
                  <span className="font-mono">{r.user?.slice(0, 10) ?? "—"}…</span>
                  <span className="mx-2 text-white/20">·</span>
                  <span>{r.marketLabel}</span>
                </div>
                <div className="flex items-center gap-3 text-white/60">
                  {r.amount !== undefined && (
                    <span className="font-mono flex items-center gap-1">
                      {showAmount
                        ? `$${(Number(r.amount) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}`
                        : HIDDEN_GLYPHS}
                      {maskAll && (
                        <button
                          type="button"
                          onClick={() => toggleRowReveal(r.txHash)}
                          className="text-white/40 hover:text-white"
                          aria-label={showAmount ? "Mask" : PRIVACY_COPY.revealAmt}
                        >
                          {showAmount ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        </button>
                      )}
                    </span>
                  )}
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${r.txHash}`}
                    target="_blank" rel="noreferrer"
                    className="text-violet-300/80 hover:text-violet-200 font-mono inline-flex items-center gap-1"
                  >
                    {r.txHash.slice(0, 8)}…<ExternalLink className="w-2.5 h-2.5" />
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
