import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Plus, Clock, CheckCircle } from "lucide-react";
import { useConfidentialEscrow } from "@/hooks/useConfidentialEscrow";
import { OBSCURA_CONDITION_RESOLVER_ADDRESS } from "@/config/contracts";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";

type ConditionType = "none" | "timelock" | "approval";

export default function CreateEscrowForm() {
  const [ownerAddr, setOwnerAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [conditionType, setConditionType] = useState<ConditionType>("none");
  const [timelockMinutes, setTimelockMinutes] = useState("");
  const [approverAddr, setApproverAddr] = useState("");

  const { createEscrow, txHash, isTxPending, status, stepIndex } = useConfidentialEscrow();

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);
  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";

  const handleCreate = async () => {
    if (!isValidAddress(ownerAddr)) {
      toast.error("Enter a valid owner/recipient address");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Enter a valid escrow amount");
      return;
    }

    try {
      let resolver: `0x${string}` | null = null;
      let cType: number | undefined;
      let cParam: bigint | undefined;

      if (conditionType === "timelock") {
        if (!timelockMinutes || Number(timelockMinutes) <= 0) {
          toast.error("Enter a valid timelock duration in minutes");
          return;
        }
        resolver = OBSCURA_CONDITION_RESOLVER_ADDRESS ?? null;
        cType = 1; // TIME_LOCK
        cParam = BigInt(Math.floor(Date.now() / 1000) + Number(timelockMinutes) * 60);
      } else if (conditionType === "approval") {
        if (!isValidAddress(approverAddr)) {
          toast.error("Enter a valid approver address");
          return;
        }
        resolver = OBSCURA_CONDITION_RESOLVER_ADDRESS ?? null;
        cType = 2; // APPROVAL
        cParam = BigInt(approverAddr);
      }

      await createEscrow(
        ownerAddr as `0x${string}`,
        BigInt(Math.floor(Number(amount))),
        resolver,
        cType,
        cParam
      );

      toast.success("Encrypted escrow created");
      setOwnerAddr("");
      setAmount("");
      setConditionType("none");
      setTimelockMinutes("");
      setApproverAddr("");
    } catch (err) {
      toast.error((err as Error).message || "Escrow creation failed");
    }
  };

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-2">
        <Lock className="w-4 h-4 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          Create Encrypted Escrow
        </h3>
      </div>

      <p className="text-[10px] font-mono text-muted-foreground/70">
        Lock $OBS in an encrypted escrow. Owner address and amount are both FHE ciphertexts.
        Add optional time-lock or manual approval conditions.
      </p>

      <div className="space-y-3">
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Owner / Recipient (who can redeem)
          </label>
          <input
            type="text"
            placeholder="0x... owner address"
            value={ownerAddr}
            onChange={(e) => setOwnerAddr(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
          />
        </div>

        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Amount ($OBS)
          </label>
          <input
            type="number"
            placeholder="e.g. 100"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
          />
        </div>

        {/* Condition type selector */}
        <div>
          <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
            Release Condition
          </label>
          <div className="flex gap-2">
            {([
              { key: "none", label: "None", icon: CheckCircle },
              { key: "timelock", label: "Time Lock", icon: Clock },
              { key: "approval", label: "Approval", icon: CheckCircle },
            ] as const).map((c) => (
              <button
                key={c.key}
                onClick={() => setConditionType(c.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-[9px] font-mono rounded-sm border transition-all ${
                  conditionType === c.key
                    ? "border-primary/40 text-primary bg-primary/5"
                    : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/20"
                }`}
              >
                <c.icon className="w-3 h-3" />
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {conditionType === "timelock" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
              Lock Duration (minutes)
            </label>
            <input
              type="number"
              placeholder="e.g. 60"
              value={timelockMinutes}
              onChange={(e) => setTimelockMinutes(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
            />
          </motion.div>
        )}

        {conditionType === "approval" && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
            <label className="text-[9px] font-mono text-muted-foreground tracking-[0.15em] uppercase block mb-1.5">
              Approver Address
            </label>
            <input
              type="text"
              placeholder="0x... approver who can release"
              value={approverAddr}
              onChange={(e) => setApproverAddr(e.target.value)}
              className="w-full px-3 py-2 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
            />
          </motion.div>
        )}
      </div>

      {status !== "idle" && (
        <div className="pt-1">
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}

      <motion.button
        onClick={handleCreate}
        disabled={isProcessing || isTxPending}
        whileHover={!isProcessing ? { scale: 1.01 } : {}}
        whileTap={!isProcessing ? { scale: 0.99 } : {}}
        className="w-full py-3 text-xs tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Plus className="w-3.5 h-3.5" />
        {isProcessing ? "Processing..." : "Create Encrypted Escrow"}
      </motion.button>

      {txHash && (
        <div className="text-[9px] font-mono text-muted-foreground/60 text-center">
          TX:{" "}
          <a
            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}
    </div>
  );
}
