/**
 * HistoryFeed — recent on-chain events from credit markets.
 *
 * Pulls the last 5000 blocks of Supplied/Borrowed/Repaid events across all
 * known markets and renders them in chronological order. Reads only.
 */
import { useEffect, useState } from "react";
import { usePublicClient } from "wagmi";
import { ScrollText, RefreshCcw, Loader2, ArrowDownToLine, ArrowUpFromLine, Activity } from "lucide-react";
import { Card, CardHeader } from "@/components/elite/Layout";
import type { Log } from "viem";
import { CREDIT_MARKET_ABI, type CreditMarketMeta } from "@/config/credit";

interface Event {
  type: "Supplied" | "Borrowed" | "Repaid" | "WithdrawnCollateral" | "SuppliedCollateral" | "Withdrawn";
  market: `0x${string}`;
  user?: `0x${string}`;
  amount?: bigint;
  blockNumber: bigint;
  txHash: `0x${string}`;
}

interface Props {
  markets: CreditMarketMeta[];
}

const ICONS: Record<Event["type"], React.ComponentType<any>> = {
  Supplied: ArrowDownToLine,
  Borrowed: ArrowDownToLine,
  Repaid: ArrowUpFromLine,
  WithdrawnCollateral: ArrowUpFromLine,
  SuppliedCollateral: ArrowDownToLine,
  Withdrawn: ArrowUpFromLine,
};
const COLORS: Record<Event["type"], string> = {
  Supplied: "text-emerald-300",
  Borrowed: "text-violet-300",
  Repaid: "text-emerald-300",
  WithdrawnCollateral: "text-amber-300",
  SuppliedCollateral: "text-emerald-300",
  Withdrawn: "text-amber-300",
};

const HistoryFeed = ({ markets }: Props) => {
  const publicClient = usePublicClient();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const refresh = async () => {
    if (!publicClient) return;
    setLoading(true);
    setErr(null);
    try {
      const head = await publicClient.getBlockNumber();
      const fromBlock = head > 5000n ? head - 5000n : 0n;
      const all: Event[] = [];

      for (const m of markets) {
        if (!m.address) continue;
        try {
          const logs = (await publicClient.getLogs({
            address: m.address,
            fromBlock,
            toBlock: "latest",
          })) as Log[];
          for (const log of logs) {
            try {
              // Decode using market ABI
              const ev = (await publicClient.getContractEvents({
                address: m.address,
                abi: CREDIT_MARKET_ABI as any,
                fromBlock: log.blockNumber!,
                toBlock: log.blockNumber!,
              })) as any[];
              for (const e of ev) {
                if (!["Supplied", "Borrowed", "Repaid", "WithdrawnCollateral", "SuppliedCollateral", "Withdrawn"].includes(e.eventName)) continue;
                all.push({
                  type: e.eventName,
                  market: m.address,
                  user: e.args?.user,
                  amount: e.args?.amount,
                  blockNumber: e.blockNumber,
                  txHash: e.transactionHash,
                });
              }
              // single decode pass per block is enough; break after first log of block
              break;
            } catch { /* skip undecoded */ }
          }
        } catch { /* market unreachable */ }
      }

      // dedupe by txHash+type
      const seen = new Set<string>();
      const unique = all.filter((e) => {
        const k = `${e.txHash}-${e.type}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
      unique.sort((a, b) => Number(b.blockNumber - a.blockNumber));
      setEvents(unique.slice(0, 30));
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? "Failed to load");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [publicClient, markets.length]);

  return (
    <Card>
      <CardHeader
        title="Recent activity"
        action={
          <button onClick={refresh} disabled={loading} className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1.5 disabled:opacity-50">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCcw className="w-3 h-3" />} Refresh
          </button>
        }
      />
      <div className="px-2 py-2">
        {err && <p className="px-3 py-2 text-xs text-rose-300">{err}</p>}
        {!err && events.length === 0 && !loading && (
          <p className="px-3 py-6 text-xs text-white/45 text-center inline-flex items-center justify-center gap-2 w-full">
            <ScrollText className="w-3.5 h-3.5" /> No recent events found in the last 5000 blocks.
          </p>
        )}
        <ul className="divide-y divide-white/[0.04]">
          {events.map((e, i) => {
            const Icon = ICONS[e.type];
            const color = COLORS[e.type];
            return (
              <li key={`${e.txHash}-${e.type}-${i}`} className="px-3 py-2.5 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <Icon className={`w-3.5 h-3.5 ${color}`} />
                  <span className={`font-mono ${color}`}>{e.type}</span>
                  <span className="text-white/40 truncate">{e.user?.slice(0, 10)}…</span>
                </div>
                <div className="flex items-center gap-3 text-white/50">
                  {e.amount !== undefined && (
                    <span className="font-mono">${(Number(e.amount) / 1e6).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                  )}
                  <a
                    href={`https://sepolia.arbiscan.io/tx/${e.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-violet-300/80 hover:text-violet-200 font-mono"
                  >
                    {e.txHash.slice(0, 10)}…
                  </a>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
};

export default HistoryFeed;
