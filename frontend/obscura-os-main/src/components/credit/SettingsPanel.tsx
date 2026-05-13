/**
 * SettingsPanel — operator status + auto-repay hook + insurance subscription
 *                 + governance approvals (treasury-only).
 */
import { useEffect, useState } from "react";
import { useAccount, useReadContract, useWriteContract, usePublicClient } from "wagmi";
import { Loader2, Settings as SettingsIcon, Repeat, Umbrella, Landmark, Droplet } from "lucide-react";
import { Card, CardHeader } from "@/components/elite/Layout";
import {
  useCreditStreamHook,
  useCreditInsuranceHook,
  useGovernanceProxy,
  useApprovedSets,
} from "@/hooks/useCredit";
import {
  CREDIT_STREAM_HOOK_ADDRESS,
  CREDIT_INSURANCE_HOOK_ADDRESS,
  CREDIT_TOKENS,
  CONFIDENTIAL_TOKEN_ABI,
  type CreditMarketMeta,
} from "@/config/credit";
import { useIsOperator } from "@/hooks/useIsOperator";
import { useEffect as useEffectOp, useState as useStateOp } from "react";

function FaucetRow({ tokenKey }: { tokenKey: "cOBS" | "cWETH" }) {
  const meta = CREDIT_TOKENS[tokenKey];
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const next = useReadContract({
    abi: CONFIDENTIAL_TOKEN_ABI,
    address: meta.address,
    functionName: "nextFaucetIn",
    args: address ? [address] : undefined,
    query: { enabled: !!address && !!meta.address, refetchInterval: 15_000 },
  });
  const ready = (next.data as bigint | undefined) === 0n;
  const secs = Number((next.data as bigint | undefined) ?? 0n);
  const label = ready ? "Claim" : `${Math.floor(secs / 3600)}h ${Math.floor((secs % 3600) / 60)}m`;
  const claim = async () => {
    if (!meta.address) return;
    setBusy(true);
    setErr(null);
    try {
      const hash = await writeContractAsync({ abi: CONFIDENTIAL_TOKEN_ABI, address: meta.address, functionName: "claimFaucet" });
      await publicClient?.waitForTransactionReceipt({ hash });
      await next.refetch();
    } catch (e: any) {
      setErr(e?.shortMessage ?? e?.message ?? "Claim failed");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-white/85">{meta.symbol} <span className="text-white/40">· {meta.faucetAmountLabel}</span></div>
        <div className="text-[10.5px] text-white/40 truncate">{meta.address ?? "not configured"}</div>
        {err && <div className="text-[10.5px] text-rose-300/80 mt-0.5">{err}</div>}
      </div>
      <button
        onClick={claim}
        disabled={!address || !meta.address || !ready || busy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[11px] rounded-md border border-cyan-500/40 bg-cyan-500/10 text-cyan-100 hover:bg-cyan-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Droplet className="w-3 h-3" />}
        {label}
      </button>
    </div>
  );
}

function useOperatorStatus(spender?: `0x${string}`) {
  const { checkOperator } = useIsOperator();
  const [ok, setOk] = useStateOp<boolean | null>(null);
  useEffectOp(() => {
    if (!spender) return;
    let cancelled = false;
    checkOperator(spender).then((r) => { if (!cancelled) setOk(r); });
    return () => { cancelled = true; };
  }, [spender, checkOperator]);
  return ok;
}

interface Props {
  markets: CreditMarketMeta[];
  approved: ReturnType<typeof useApprovedSets>;
}

const SettingsPanel = ({ markets, approved }: Props) => {
  const { address } = useAccount();
  const stream = useCreditStreamHook();
  const insurance = useCreditInsuranceHook();
  const gov = useGovernanceProxy();

  const isOpStream = useOperatorStatus(CREDIT_STREAM_HOOK_ADDRESS as `0x${string}` | undefined);
  const isOpInsurance = useOperatorStatus(CREDIT_INSURANCE_HOOK_ADDRESS as `0x${string}` | undefined);

  const [marketAddr, setMarketAddr] = useState(markets[0]?.address ?? "");
  const [perCycle, setPerCycle] = useState("50");
  const [periodDays, setPeriodDays] = useState("7");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => { if (!marketAddr && markets[0]) setMarketAddr(markets[0].address ?? ""); }, [markets, marketAddr]);

  const enableStream = async () => {
    if (!marketAddr) return;
    setBusy("stream");
    setMsg(null);
    try {
      await stream.enable(
        marketAddr as `0x${string}`,
        BigInt(Math.round(parseFloat(perCycle) * 1e6)),
        BigInt(parseInt(periodDays) * 86400)
      );
      setMsg("Auto-repay stream enabled.");
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const subscribeIns = async () => {
    if (!marketAddr) return;
    setBusy("ins");
    setMsg(null);
    try {
      await insurance.subscribe(
        marketAddr as `0x${string}`,
        BigInt(Math.round(parseFloat(perCycle) * 1e6)),
        BigInt(parseInt(periodDays) * 86400)
      );
      setMsg("Insurance subscription active — top-ups will execute on schedule.");
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Failed");
    } finally {
      setBusy(null);
    }
  };

  const approveLLTV = async (v: bigint, ok: boolean) => {
    setBusy(`gov-${v}`);
    setMsg(null);
    try {
      await gov.approveLLTV(v, ok);
      await approved.refresh();
      setMsg(`LLTV ${(Number(v) / 100).toFixed(2)}% set to ${ok ? "approved" : "removed"}.`);
    } catch (e: any) {
      setMsg(e?.shortMessage ?? e?.message ?? "Failed (treasury-only)");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader title="Token faucets" />
        <div className="px-5 py-3 divide-y divide-white/[0.04]">
          <FaucetRow tokenKey="cOBS" />
          <FaucetRow tokenKey="cWETH" />
          <p className="text-[10.5px] text-white/40 pt-2">Mint test collateral to your wallet. Balances stay encrypted on-chain.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Operators" />
        <div className="px-5 py-4 text-xs grid gap-2">
          <div className="flex justify-between">
            <span className="text-white/60">Auto-repay hook</span>
            <span className={isOpStream ? "text-emerald-300" : "text-white/40"}>{isOpStream ? "approved" : "not approved"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white/60">Insurance hook</span>
            <span className={isOpInsurance ? "text-emerald-300" : "text-white/40"}>{isOpInsurance ? "approved" : "not approved"}</span>
          </div>
          <p className="text-[11px] text-white/45 mt-1">Approval is granted automatically on first use of each hook.</p>
        </div>
      </Card>

      <Card>
        <CardHeader title="Auto-repay (PayStream hook)" />
        <div className="px-5 py-4 grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/45">Market</label>
              <select value={marketAddr} onChange={(e) => setMarketAddr(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-md px-2 py-1.5 text-xs">
                {markets.map((m) => (<option key={m.address} value={m.address ?? ""}>{m.label}</option>))}
              </select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/45">Per cycle (cUSDC)</label>
              <input value={perCycle} onChange={(e) => setPerCycle(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-md px-2 py-1.5 text-xs" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-white/45">Period (days)</label>
              <input value={periodDays} onChange={(e) => setPeriodDays(e.target.value)} className="w-full bg-white/[0.03] border border-white/10 rounded-md px-2 py-1.5 text-xs" />
            </div>
          </div>
          <button onClick={enableStream} disabled={!address || busy === "stream"} className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-violet-500/15 border border-violet-500/40 text-violet-100 hover:bg-violet-500/25 disabled:opacity-50">
            {busy === "stream" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Repeat className="w-4 h-4" />}
            Enable
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Insurance top-up subscription" />
        <div className="px-5 py-4 grid gap-3">
          <p className="text-xs text-white/55">Schedules a recurring collateral top-up against your active position to keep your HF above 1.</p>
          <button onClick={subscribeIns} disabled={!address || busy === "ins"} className="self-start inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50">
            {busy === "ins" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Umbrella className="w-4 h-4" />}
            Subscribe
          </button>
        </div>
      </Card>

      <Card>
        <CardHeader title="Governance approvals (treasury-only)" />
        <div className="px-5 py-4 grid gap-3">
          <p className="text-xs text-white/55">Toggle which LLTV ceilings are approved for new markets. Reverts unless your wallet holds the Treasury role.</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {approved.lltv.map(({ v, ok }) => (
              <button
                key={v.toString()}
                onClick={() => approveLLTV(v, !ok)}
                disabled={busy === `gov-${v}`}
                className={`text-xs px-2.5 py-2 rounded-md border ${ok ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-white/10 bg-white/[0.03] text-white/60"} disabled:opacity-50 inline-flex items-center justify-center gap-1.5`}
              >
                {busy === `gov-${v}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Landmark className="w-3 h-3" />}
                {(Number(v) / 100).toFixed(0)}% {ok ? "·on" : "·off"}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {msg && (
        <Card>
          <div className="px-5 py-3 text-xs text-white/70 inline-flex items-center gap-2">
            <SettingsIcon className="w-3.5 h-3.5" /> {msg}
          </div>
        </Card>
      )}
    </div>
  );
};

export default SettingsPanel;
