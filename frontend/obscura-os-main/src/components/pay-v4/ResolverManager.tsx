import { useState } from "react";
import { motion } from "framer-motion";
import { Gavel, Search, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import {
  OBSCURA_PAYROLL_RESOLVER_ABI,
  OBSCURA_PAYROLL_RESOLVER_ADDRESS,
} from "@/config/pay";
import { toast } from "sonner";

interface CycleInfo {
  releaseTime: bigint;
  cancelled: boolean;
  approved: boolean;
  employer: `0x${string}`;
  approver: `0x${string}`;
}

export default function ResolverManager() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { writeContractAsync } = useWriteContract();
  const [escrowId, setEscrowId] = useState("");
  const [cycleInfo, setCycleInfo] = useState<CycleInfo | null>(null);
  const [conditionMet, setConditionMet] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  const parsedId = (() => {
    try {
      return escrowId.trim() ? BigInt(escrowId.trim()) : null;
    } catch {
      return null;
    }
  })();

  const fetchCycle = async () => {
    if (!publicClient || !OBSCURA_PAYROLL_RESOLVER_ADDRESS || !parsedId) {
      toast.error("Enter a valid escrow ID");
      return;
    }
    setBusy(true);
    setCycleInfo(null);
    setConditionMet(null);
    try {
      const result = await publicClient.readContract({
        address: OBSCURA_PAYROLL_RESOLVER_ADDRESS,
        abi: OBSCURA_PAYROLL_RESOLVER_ABI,
        functionName: "getCycle",
        args: [parsedId],
      }) as readonly [bigint, boolean, boolean, `0x${string}`, `0x${string}`];

      setCycleInfo({
        releaseTime: result[0],
        cancelled: result[1],
        approved: result[2],
        employer: result[3],
        approver: result[4],
      });

      const met = await publicClient.readContract({
        address: OBSCURA_PAYROLL_RESOLVER_ADDRESS,
        abi: OBSCURA_PAYROLL_RESOLVER_ABI,
        functionName: "isConditionMet",
        args: [parsedId],
      }) as boolean;
      setConditionMet(met);
    } catch (e) {
      toast.error((e as Error).message || "Failed to fetch cycle info");
    } finally {
      setBusy(false);
    }
  };

  const approveCycle = async () => {
    if (!publicClient || !OBSCURA_PAYROLL_RESOLVER_ADDRESS || !parsedId) return;
    setActionBusy("approve");
    try {
      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 130n) / 100n
        : undefined;
      const hash = await writeContractAsync({
        address: OBSCURA_PAYROLL_RESOLVER_ADDRESS,
        abi: OBSCURA_PAYROLL_RESOLVER_ABI,
        functionName: "approve",
        args: [parsedId],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas,
        gas: 200_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.success(`Escrow #${escrowId} approved for release`);
      await fetchCycle();
    } catch (e) {
      toast.error((e as Error).message || "Approve failed");
    } finally {
      setActionBusy(null);
    }
  };

  const cancelCycle = async () => {
    if (!publicClient || !OBSCURA_PAYROLL_RESOLVER_ADDRESS || !parsedId) return;
    setActionBusy("cancel");
    try {
      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 130n) / 100n
        : undefined;
      const hash = await writeContractAsync({
        address: OBSCURA_PAYROLL_RESOLVER_ADDRESS,
        abi: OBSCURA_PAYROLL_RESOLVER_ABI,
        functionName: "cancel",
        args: [parsedId],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas,
        gas: 200_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      toast.success(`Escrow #${escrowId} cancelled by resolver`);
      await fetchCycle();
    } catch (e) {
      toast.error((e as Error).message || "Cancel failed");
    } finally {
      setActionBusy(null);
    }
  };

  const formatTime = (ts: bigint) => {
    if (ts === 0n) return "Not set";
    return new Date(Number(ts) * 1000).toLocaleString();
  };

  const truncAddr = (a: string) =>
    a === "0x0000000000000000000000000000000000000000" ? "None" : `${a.slice(0, 8)}…${a.slice(-6)}`;

  return (
    <div className="pay-card p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <Gavel className="w-4 h-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <h3 className="font-display text-sm font-semibold text-foreground leading-tight">Payroll Resolver</h3>
          <p className="text-[10px] text-muted-foreground/45 tracking-widest mt-0.5 uppercase">Condition Gate</p>
        </div>
        <span className="ml-auto shrink-0 pay-badge pay-badge-emerald">CONDITION GATE</span>
      </div>

      <p className="text-[12px] text-muted-foreground/55 leading-relaxed">
        The PayrollResolver gates escrow releases. Look up any escrow to check its approval status,
        or approve/cancel it as the designated approver. All condition checks run on encrypted data.
      </p>

      <div className="space-y-2">
        <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold">Escrow ID</label>
        <div className="flex gap-2">
          <input type="text" placeholder="e.g. 42" value={escrowId}
            onChange={(e) => setEscrowId(e.target.value)}
            className="pay-input flex-1 font-mono" />
          <motion.button whileTap={{ scale: 0.98 }} onClick={fetchCycle} disabled={busy || !parsedId}
            className="btn-pay btn-pay-ghost px-4 disabled:opacity-40">
            <Search className="w-3 h-3" /> {busy ? "Loading…" : "Lookup"}
          </motion.button>
        </div>
      </div>

      {cycleInfo && (
        <div className="space-y-4">
          <div className="rounded-xl bg-white/[0.025] border border-white/[0.07] p-4 space-y-3">
            <div className="font-display text-[13px] font-semibold text-foreground">Cycle #{escrowId}</div>
            <div className="grid grid-cols-2 gap-3 text-[12px] font-mono">
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground/45 uppercase tracking-wider block">Release Time</span>
                <div className="text-foreground/80 flex items-center gap-1.5">
                  <Clock className="w-3 h-3 text-emerald-400 shrink-0" /> {formatTime(cycleInfo.releaseTime)}
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground/45 uppercase tracking-wider block">Condition Met</span>
                <div className={conditionMet ? "text-emerald-400" : "text-amber-400"}>
                  {conditionMet === null ? "…" : conditionMet ? "Yes ✓" : "No ✗"}
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground/45 uppercase tracking-wider block">Approved</span>
                <div className={cycleInfo.approved ? "text-emerald-400" : "text-muted-foreground/50"}>
                  {cycleInfo.approved ? "Yes ✓" : "No"}
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground/45 uppercase tracking-wider block">Cancelled</span>
                <div className={cycleInfo.cancelled ? "text-red-400" : "text-muted-foreground/50"}>
                  {cycleInfo.cancelled ? "Yes ✗" : "No"}
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground/45 uppercase tracking-wider block">Employer</span>
                <div className="text-foreground/60 flex items-center gap-1">
                  <User className="w-3 h-3 shrink-0" /> {truncAddr(cycleInfo.employer)}
                </div>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-muted-foreground/45 uppercase tracking-wider block">Approver</span>
                <div className="text-foreground/60 flex items-center gap-1">
                  <User className="w-3 h-3 shrink-0" /> {truncAddr(cycleInfo.approver)}
                </div>
              </div>
            </div>
          </div>

          {!cycleInfo.cancelled && !cycleInfo.approved && (
            <div className="flex gap-2">
              <motion.button whileTap={{ scale: 0.98 }} onClick={approveCycle} disabled={!!actionBusy}
                className="btn-pay btn-pay-emerald flex-1 py-2.5">
                <CheckCircle className="w-3.5 h-3.5" />
                {actionBusy === "approve" ? "Approving…" : "Approve Release"}
              </motion.button>
              <motion.button whileTap={{ scale: 0.98 }} onClick={cancelCycle} disabled={!!actionBusy}
                className="btn-pay btn-pay-ghost flex-1 py-2.5 text-red-400 hover:text-red-300 border-red-500/25 disabled:opacity-50">
                <XCircle className="w-3.5 h-3.5" />
                {actionBusy === "cancel" ? "Cancelling…" : "Cancel Escrow"}
              </motion.button>
            </div>
          )}
          {cycleInfo.approved && (
            <div className="flex items-center justify-center gap-2 p-3 bg-emerald-500/8 border border-emerald-500/20 rounded-xl text-[12px] text-emerald-400">
              <CheckCircle className="w-3.5 h-3.5" /> Already approved — escrow can be redeemed
            </div>
          )}
          {cycleInfo.cancelled && (
            <div className="flex items-center justify-center gap-2 p-3 bg-red-500/8 border border-red-500/20 rounded-xl text-[12px] text-red-400">
              <XCircle className="w-3.5 h-3.5" /> Cancelled — funds cannot be released
            </div>
          )}
        </div>
      )}
    </div>
  );
}
