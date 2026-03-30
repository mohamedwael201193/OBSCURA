import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, Coins } from "lucide-react";
import { useDecryptObsBalance } from "@/hooks/useDecryptObsBalance";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";
import { OBSCURA_TOKEN_ADDRESS } from "@/config/contracts";

export default function ObsBalanceReveal() {
  const { ctHash, decryptedBalance, decrypt, reset, status, stepIndex } =
    useDecryptObsBalance();

  const handleDecrypt = async () => {
    try {
      await decrypt();
      toast.success("$OBS balance decrypted");
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
        <Coins className="w-6 h-6 text-primary" />
      </div>
      <h3 className="font-display text-lg tracking-wider text-foreground mb-1">
        Your $OBS Token Balance
      </h3>
      <p className="text-[9px] font-mono text-muted-foreground/60 mb-4">
        $OBS governance tokens minted to you — separate from payroll, held in ObscuraToken.
      </p>

      <div className="glass-panel rounded-sm p-6 my-4 max-w-sm mx-auto border-glow">
        <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-mono mb-3">
          OBS BALANCE (euint64)
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
            Handle: {ctHash.toString().slice(0, 10)}...
          </div>
        )}
      </div>

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
        onClick={isDecrypted ? reset : handleDecrypt}
        disabled={isProcessing}
        whileHover={!isProcessing ? { scale: 1.02 } : {}}
        whileTap={!isProcessing ? { scale: 0.98 } : {}}
        className="px-8 py-3 text-xs tracking-[0.2em] uppercase font-mono border border-primary/40 text-primary hover:bg-primary/10 transition-all rounded-sm disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isDecrypted ? (
          <>
            <EyeOff className="w-3.5 h-3.5 inline mr-2" />
            Hide Balance
          </>
        ) : isProcessing ? (
          "Decrypting..."
        ) : (
          <>
            <Eye className="w-3.5 h-3.5 inline mr-2" />
            Sign Permit & Decrypt $OBS
          </>
        )}
      </motion.button>
      <p className="text-[9px] font-mono text-muted-foreground/40 mt-4">
        &ldquo;Hide Balance&rdquo; clears the local view only — your balance stays encrypted on-chain.
      </p>

      {OBSCURA_TOKEN_ADDRESS && (
        <p className="text-[9px] font-mono text-muted-foreground/40 mt-4">
          Token:{" "}
          <a
            href={`https://sepolia.arbiscan.io/address/${OBSCURA_TOKEN_ADDRESS}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary/60 hover:text-primary"
          >
            {OBSCURA_TOKEN_ADDRESS.slice(0, 10)}...{OBSCURA_TOKEN_ADDRESS.slice(-6)}
          </a>
        </p>
      )}
    </div>
  );
}
