/**
 * VaultPerformanceChart — Recharts area chart over time of public TVL.
 *
 * Privacy: TVL is a public scalar (publicTotalDeposited), no FHE involved.
 * Reads time-series samples from useVaultHistory (IndexedDB).
 */
import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Clock } from "lucide-react";
import { useVaultHistory } from "@/hooks/useVaultHistory";

const WINDOWS = [
  { id: "24h", label: "24h", ms: 24 * 3600 * 1000 },
  { id: "7d",  label: "7d",  ms: 7  * 24 * 3600 * 1000 },
] as const;

type WindowId = typeof WINDOWS[number]["id"];

interface Props {
  address?: `0x${string}`;
  kind: "vault" | "market";
  title?: string;
  decimals?: number; // default 6 (cUSDC public mirror is 6dp)
}

export default function VaultPerformanceChart({ address, kind, title = "TVL history", decimals = 6 }: Props) {
  const [windowId, setWindowId] = useState<WindowId>("24h");
  const winMs = WINDOWS.find((w) => w.id === windowId)!.ms;
  const { samples } = useVaultHistory({ address, kind, windowMs: winMs });

  const data = useMemo(
    () => samples.map((s) => ({
      ts: s.ts,
      time: new Date(s.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      tvl: Number(s.tvl) / 10 ** decimals,
      util: typeof s.utilizationBps === "number" ? s.utilizationBps / 100 : undefined,
    })),
    [samples, decimals]
  );

  return (
    <div className="rounded-2xl border border-white/8 bg-white/[0.02] backdrop-blur-xl p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[9.5px] tracking-[0.22em] uppercase text-violet-400/60 font-mono">{title}</div>
          <h3 className="mt-1 text-base text-white/90 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-white/40" /> Public scalar
          </h3>
        </div>
        <div className="inline-flex rounded-md border border-white/10 bg-white/5 p-0.5">
          {WINDOWS.map((w) => (
            <button
              key={w.id}
              type="button"
              onClick={() => setWindowId(w.id)}
              className={`px-2.5 py-1 text-[10.5px] rounded ${
                windowId === w.id
                  ? "bg-violet-500/20 text-violet-200"
                  : "text-white/55 hover:text-white"
              }`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 h-44">
        {data.length < 2 ? (
          <div className="h-full flex items-center justify-center text-[11px] text-white/30">
            Collecting samples — first datapoint takes ~30s.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 8, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="tvlFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%"  stopColor="rgba(139,92,246,0.35)" />
                  <stop offset="100%" stopColor="rgba(139,92,246,0)" />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }} axisLine={false} tickLine={false} width={40} />
              <Tooltip
                contentStyle={{ background: "rgba(6,9,12,0.95)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                formatter={(v: number) => [`$${v.toLocaleString(undefined, { maximumFractionDigits: 2 })}`, "TVL"]}
              />
              <Area type="monotone" dataKey="tvl" stroke="rgb(139,92,246)" strokeWidth={1.5} fill="url(#tvlFill)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
