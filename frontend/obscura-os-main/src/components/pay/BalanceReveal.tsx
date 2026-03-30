import { motion, AnimatePresence } from "framer-motion";
import { Eye, Wallet, EyeOff } from "lucide-react";
import { useDecryptBalance } from "@/hooks/useDecryptBalance";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";

export default function BalanceReveal() {
  const {
    ctHash,
    decryptedBalance,
    decrypt,
    reEncrypt,
    status,
    stepIndex,
  } = useDecryptBalance();

  const handleDecrypt = async () => {
    try {
      await decrypt();
      toast.success("Balance decrypted successfully");
    } catch (err) {
      toast.error((err as Error).message || "Decryption failed");
    }
  };

  const isDecrypted = decryptedBalance !== null;
  const isProcessing =
    status !== "idle" && status !== "ready" && status !== "error";

  return (
    <div className="glass-panel rounded-sm p-6 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full border border-primary/30 flex items-center justify-center bg-primary/5">
        <Wallet className="w-6 h-6 text-primary" />
      </div>
      <h3 className="font-display text-lg tracking-wider text-foreground mb-1">
        Your Payroll Balance
      </h3>
      <p className="text-[9px] font-mono text-muted-foreground/60 mb-4">
        Salary received via ObscuraPay — encrypted on-chain, visible only to you.
      </p>

      <div className="glass-panel rounded-sm p-6 my-6 max-w-sm mx-auto border-glow">
        <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-mono mb-3">
          BALANCE (euint64)
        </div>
        <AnimatePresence mode="wait">
          {!isDecrypted ? (
            <motion.div
              key="hidden"
              exit={{ opacity: 0, scale: 0.9 }}
              className="font-mono text-3xl text-primary tracking-wider"
            >
              ██████████
            </motion.div>
          ) : (
            <motion.div
              key="revealed"
              initial={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }}
              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-3xl text-primary text-glow"
            >
              {decryptedBalance.toString()} $OBS
            </motion.div>
          )}
        </AnimatePresence>
        {ctHash != null && (
          <div className="text-[9px] font-mono text-muted-foreground/50 mt-2">
            Handle: {ctHash.toString().slice(0, 10)}...{ctHash.toString().slice(-4)}
          </div>
        )}
      </div>

      {/* Async Stepper */}
      {status !== "idle" && (
        <div className="max-w-sm mx-auto mb-4">
          <AsyncStepper
            status={status}
            stepIndex={stepIndex}
            labels={["Signing Permit", "Fetching Handle", "Decrypting"]}
          />
        </div>
      )}

      <motion.button
        onClick={isDecrypted ? reEncrypt : handleDecrypt}
        disabled={isProcessing}
        whileHover={!isProcessing ? { scale: 1.02 } : {}}
        whileTap={!isProcessing ? { scale: 0.98 } : {}}
        className="px-8 py-3 text-xs tracking-[0.2em] uppercase font-mono border border-primary/40 text-primary hover:bg-primary/10 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDecrypted ? (
          <>
            <EyeOff className="w-3.5 h-3.5 inline mr-2" />
            Re-Encrypt
          </>
        ) : isProcessing ? (
          "Decrypting..."
        ) : (
          <>
            <Eye className="w-3.5 h-3.5 inline mr-2" />
            Sign Permit & Decrypt
          </>
        )}
      </motion.button>
      <p className="text-[9px] font-mono text-muted-foreground/40 mt-4">
        Signs EIP-712 permit to authorize decryption of your balance handle
      </p>
    </div>
  );
}
