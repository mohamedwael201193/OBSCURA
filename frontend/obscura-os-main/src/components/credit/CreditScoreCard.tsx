/**
 * CreditScoreCard — update + attest reputation.
 */
import { useState } from "react";
import { useAccount } from "wagmi";
import { Award, Loader2, ShieldCheck } from "lucide-react";
import { useCreditScore } from "@/hooks/useCredit";
import { CREDIT_MARKETS } from "@/config/credit";
import { Card, CardHeader } from "@/components/elite/Layout";

const CreditScoreCard = () => {
  const { address } = useAccount();
  const score = useCreditScore();
  const [busy, setBusy] = useState<"update" | "attest" | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [marketAddr, setMarketAddr] = useState<string>(CREDIT_MARKETS[0]?.address ?? "");

  const update = async () => {
    setBusy("update");
    setMsg(null);
    try {
      await score.update();
      setMsg("Reputation re-computed; encrypted handle updated on-chain.");
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

  return (
    <Card>
      <CardHeader title="Credit reputation" />
      <div className="px-5 py-4 grid gap-4">
        <p className="text-xs text-white/60 leading-relaxed">
          Your encrypted score (0–1000) blends Pay stream count, Address Book contacts and Vote participation.
          The score itself stays sealed; you can grant a specific market read access by attesting.
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
