import { useState } from "react";
import { motion } from "framer-motion";
import { Gavel, Search, CheckCircle, XCircle, Clock, User } from "lucide-react";
import { useAccount, usePublicClient, useWriteContract } from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import {
  OBSCURA_PAYROLL_RESOLVER_ABI,
  OBSCURA_PAYROLL_RESOLVER_ADDRESS,
} from "@/config/wave2";
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
    <div className="glass-panel rounded-md p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Gavel className="w-4 h-4 text-cyan-400" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          Payroll Resolver
        </h3>
        <span className="ml-auto text-[11px] text-muted-foreground bg-cyan-500/10 text-cyan-400 px-2 py-0.5 rounded-md border border-cyan-500/20">
          CONDITION GATE
        </span>
      </div>

      <p className="text-sm text-muted-foreground/70">
        The PayrollResolver gates escrow releases. Look up any escrow to check its approval status,
        or approve/cancel it as the designated approver. All condition checks run on encrypted data.
      </p>

      <div>
        <label className="text-xs text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
          Escrow ID
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="e.g. 42"
            value={escrowId}
            onChange={(e) => setEscrowId(e.target.value)}
            className="flex-1 px-3 py-2 bg-background border border-border/50 rounded-md font-mono text-xs text-foreground placeholder:text-muted-foreground/30 focus:border-cyan-500/40 focus:outline-none"
          />
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={fetchCycle}
            disabled={busy || !parsedId}
            className="px-4 text-sm tracking-[0.2em] uppercase bg-secondary/30 border border-border/50 rounded-md hover:border-primary/40 disabled:opacity-50 flex items-center gap-1.5"
          >
            <Search className="w-3 h-3" /> {busy ? "Loading…" : "Lookup"}
          </motion.button>
        </div>
      </div>

      {cycleInfo && (
        <div className="space-y-3">
          <div className="p-3 bg-secondary/20 border border-border/30 rounded-md space-y-2">
            <div className="text-sm text-foreground font-medium">Cycle #{escrowId}</div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div>
                <span className="text-muted-foreground">Release Time</span>
                <div className="text-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 text-cyan-400" /> {formatTime(cycleInfo.releaseTime)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Condition Met</span>
                <div className={conditionMet ? "text-green-400" : "text-amber-400"}>
                  {conditionMet === null ? "…" : conditionMet ? "Yes ✓" : "No ✗"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Approved</span>
                <div className={cycleInfo.approved ? "text-green-400" : "text-muted-foreground"}>
                  {cycleInfo.approved ? "Yes ✓" : "No"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Cancelled</span>
                <div className={cycleInfo.cancelled ? "text-red-400" : "text-muted-foreground"}>
                  {cycleInfo.cancelled ? "Yes ✗" : "No"}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Employer</span>
                <div className="text-foreground/70 flex items-center gap-1">
                  <User className="w-3 h-3" /> {truncAddr(cycleInfo.employer)}
                </div>
              </div>
              <div>
                <span className="text-muted-foreground">Approver</span>
                <div className="text-foreground/70 flex items-center gap-1">
                  <User className="w-3 h-3" /> {truncAddr(cycleInfo.approver)}
                </div>
              </div>
            </div>
          </div>

          {!cycleInfo.cancelled && !cycleInfo.approved && (
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={approveCycle}
                disabled={!!actionBusy}
                className="flex-1 py-2.5 text-sm tracking-[0.2em] uppercase bg-green-500/10 text-green-400 border border-green-500/30 rounded-md hover:bg-green-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <CheckCircle className="w-3.5 h-3.5" />
                {actionBusy === "approve" ? "Approving…" : "Approve Release"}
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={cancelCycle}
                disabled={!!actionBusy}
                className="flex-1 py-2.5 text-sm tracking-[0.2em] uppercase bg-red-500/10 text-red-400 border border-red-500/30 rounded-md hover:bg-red-500/20 disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                {actionBusy === "cancel" ? "Cancelling…" : "Cancel Escrow"}
              </motion.button>
            </div>
          )}

          {cycleInfo.approved && (
            <div className="p-2 bg-green-500/10 border border-green-500/30 rounded-md text-sm text-green-400 text-center flex items-center justify-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" /> Already approved — escrow can be redeemed
            </div>
          )}
          {cycleInfo.cancelled && (
            <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-md text-sm text-red-400 text-center flex items-center justify-center gap-1.5">
              <XCircle className="w-3.5 h-3.5" /> Cancelled — funds cannot be released
            </div>
          )}
        </div>
      )}
    </div>
  );
}
