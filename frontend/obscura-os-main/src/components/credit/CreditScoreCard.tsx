/**
 * CreditScoreCard — decrypt + display + attest encrypted reputation score.
 */
import { useState } from "react";
import { useAccount } from "wagmi";
import { Award, Loader2, ShieldCheck, Lock } from "lucide-react";
import { useCreditScore, useCreditScoreValue } from "@/hooks/useCredit";
import { CREDIT_MARKETS } from "@/config/credit";
import { Card, CardHeader } from "@/components/elite/Layout";

const CreditScoreCard = () => {
  const { address } = useAccount();
  const score = useCreditScore();
  const { score: scoreValue, loading: scoreLoading, refresh: refreshScore } = useCreditScoreValue();
  const [busy, setBusy] = useState<"update" | "attest" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [marketAddr, setMarketAddr] = useState<string>(CREDIT_MARKETS[0]?.address ?? "");

  const update = async () => {
    setBusy("update");
    setMsg(null);
    try {
      await score.update();
      setMsg("Reputation re-computed; encrypted handle updated on-chain.");
      await refreshScore();
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const attest = async () => {
    if (!marketAddr) return;
    setBusy("attest");
    setMsg(null);
    try {
      await score.attest(marketAddr as `0x${string}`);
      setMsg("Score ACL granted to selected market.");
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  // Visual score gauge 0–1000
  const pct = scoreValue !== null ? Math.min(100, (Number(scoreValue) / 1000) * 100) : 0;
  const tier =
    scoreValue === null ? "—"
    : scoreValue >= 800n ? "Excellent"
    : scoreValue >= 600n ? "Good"
    : scoreValue >= 400n ? "Fair"
    : "New";

  return (
    <Card>
      <CardHeader title="Credit reputation" />
      <div className="px-5 py-4 grid gap-4">
        {/* Score display */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] uppercase tracking-wider text-white/45">Your encrypted score</span>
            {scoreLoading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin text-white/40" />
              : <Lock className="w-3.5 h-3.5 text-violet-400/70" />
            }
          </div>
          {scoreValue !== null ? (
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-violet-200">{scoreValue.toString()}</span>
              <span className="text-sm text-white/50">/ 1000 · {tier}</span>
            </div>
          ) : (
            <span className="text-sm text-white/40 italic">
              {scoreLoading ? "Decrypting…" : "No score yet — click Re-compute"}
            </span>
          )}
          {/* Progress bar */}
          {scoreValue !== null && (
            <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full rounded-full bg-violet-400/70 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
          )}
        </div>

        <p className="text-xs text-white/60 leading-relaxed">
          Your score (0–1000) blends Pay stream count, Address Book contacts and Vote participation.
          The score stays sealed on-chain; attest to grant a market read access.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={!address || !!busy}
            onClick={update}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-violet-500/15 border border-violet-500/40 text-violet-100 hover:bg-violet-500/25 disabled:opacity-50"
          >
            {busy === "update" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Award className="w-4 h-4" />}
            Re-compute
          </button>
          <select
            value={marketAddr}
            onChange={(e) => setMarketAddr(e.target.value)}
            className="bg-white/[0.03] border border-white/10 rounded-md px-3 py-2 text-sm"
          >
            {CREDIT_MARKETS.map((m) => (
              <option key={m.address} value={m.address ?? ""}>{m.label}</option>
            ))}
          </select>
          <button
            disabled={!address || !!busy || !marketAddr}
            onClick={attest}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50"
          >
            {busy === "attest" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
            Attest to market
          </button>
        </div>
        {msg && <p className="text-xs text-white/60">{msg}</p>}
      </div>
    </Card>
  );
};

export default CreditScoreCard;

