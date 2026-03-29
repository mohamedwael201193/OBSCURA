import { motion, AnimatePresence } from "framer-motion";
import { Shield, Eye, EyeOff, Users } from "lucide-react";
import { useReadContract } from "wagmi";
import { OBSCURA_PAY_ABI, OBSCURA_PAY_ADDRESS } from "@/config/contracts";
import { useDecryptAggregate } from "@/hooks/useDecryptBalance";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";

export default function AuditView() {
  const {
    decryptedTotal,
    decrypt,
    reset,
    status,
    stepIndex,
  } = useDecryptAggregate();

  const { data: employeeCount } = useReadContract({
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
    functionName: "getEmployeeCount",
    query: { enabled: !!OBSCURA_PAY_ADDRESS },
  });

  const handleDecrypt = async () => {
    try {
      await decrypt();
      toast.success("Aggregate total decrypted");
    } catch (err) {
      toast.error((err as Error).message || "Decryption failed");
    }
  };

  const isDecrypted = decryptedTotal !== null;
  const isProcessing =
    status !== "idle" && status !== "ready" && status !== "error";

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <Shield className="w-5 h-5 text-primary" />
        <h3 className="font-display text-sm tracking-wider text-foreground">
          Auditor View — Aggregate Only
        </h3>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <div className="p-4 bg-secondary/30 rounded-sm border border-border/30">
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-mono mb-2">
            Total Payroll (Encrypted)
          </div>
          <AnimatePresence mode="wait">
            {!isDecrypted ? (
              <motion.div
                key="encrypted"
                exit={{ opacity: 0 }}
                className="font-mono text-xl text-primary text-glow"
              >
                ████████████
              </motion.div>
            ) : (
              <motion.div
                key="decrypted"
                initial={{ opacity: 0, filter: "blur(8px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                className="font-display text-xl text-primary text-glow"
              >
                {decryptedTotal.toString()} $OBS
              </motion.div>
            )}
          </AnimatePresence>
          <div className="text-[9px] font-mono text-muted-foreground/50 mt-1">
            euint64 · Aggregate Handle
          </div>
        </div>

        <div className="p-4 bg-secondary/30 rounded-sm border border-border/30">
          <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-mono mb-2">
            Employees Paid
          </div>
          <div className="font-display text-xl text-foreground flex items-center gap-2">
            <Users className="w-4 h-4 text-primary/50" />
            {employeeCount?.toString() ?? "0"}
          </div>
          <div className="text-[9px] font-mono text-muted-foreground/50 mt-1">
            Plaintext counter · Public
          </div>
        </div>
      </div>

      {/* Async Stepper */}
      {status !== "idle" && (
        <div className="pt-1">
          <AsyncStepper
            status={status}
            stepIndex={stepIndex}
            labels={["Signing Permit", "Fetching Total", "Decrypting"]}
          />
        </div>
      )}

      <motion.button
        onClick={isDecrypted ? reset : handleDecrypt}
        disabled={isProcessing}
        whileHover={!isProcessing ? { scale: 1.01 } : {}}
        whileTap={!isProcessing ? { scale: 0.99 } : {}}
        className="w-full py-2.5 text-xs tracking-[0.2em] uppercase font-mono border border-primary/30 text-primary hover:bg-primary/10 transition-all rounded-sm disabled:opacity-50"
      >
        {isDecrypted ? (
          <>
            <EyeOff className="w-3.5 h-3.5 inline mr-2" />
            Hide Total
          </>
        ) : isProcessing ? (
          "Decrypting..."
        ) : (
          <>
            <Eye className="w-3.5 h-3.5 inline mr-2" />
            Decrypt Aggregate Total
          </>
        )}
      </motion.button>

      <div className="p-3 bg-secondary/20 rounded-sm border border-border/20">
        <div className="text-[9px] font-mono text-muted-foreground">
          <span className="text-primary">ℹ</span> Individual salary amounts are
          not accessible. Only the aggregate total is visible via
          FHE.allow(totalPayroll, auditorAddress).
        </div>
      </div>
    </div>
  );
}
