/**
 * EncryptedValue — visual primitive for private/FHE-protected values.
 *
 * Locked state: calm pulsing "redacted" bars — no chaotic scrambling.
 * Revealed state: smooth blur-to-focus fade in.
 */

import { motion, AnimatePresence } from "framer-motion";
import { Lock, Unlock } from "lucide-react";

interface EncryptedValueProps {
  value?: string | number | null;
  revealed?: boolean;
  /** How many redaction segments to show when locked. Defaults to 3. */
  segments?: number;
  suffix?: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZE_MAP: Record<NonNullable<EncryptedValueProps["size"]>, { text: string; bar: string }> = {
  sm: { text: "text-[14px]", bar: "h-[12px]" },
  md: { text: "text-[18px]", bar: "h-[16px]" },
  lg: { text: "text-[24px]", bar: "h-[20px]" },
  xl: { text: "text-[32px]", bar: "h-[27px]" },
};

const SEGMENT_WIDTHS = [52, 36, 44, 32, 48, 40];

export default function EncryptedValue({
  value,
  revealed = false,
  segments = 3,
  suffix,
  size = "lg",
  className = "",
}: EncryptedValueProps) {
  const { text: sizeCls, bar: barCls } = SIZE_MAP[size];

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      {/* Value area */}
      <span className={`relative font-display font-semibold tracking-tight leading-none ${sizeCls}`}>
        <AnimatePresence mode="wait" initial={false}>
          {revealed ? (
            <motion.span
              key="revealed"
              initial={{ opacity: 0, filter: "blur(6px)" }}
              animate={{ opacity: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, filter: "blur(6px)" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
              className="inline-block text-foreground"
            >
              {value ?? "0"}
            </motion.span>
          ) : (
            <motion.span
              key="locked"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-1.5"
            >
              {Array.from({ length: segments }).map((_, i) => (
                <motion.span
                  key={i}
                  className={`inline-block rounded-sm bg-emerald-400/25 ${barCls}`}
                  style={{ width: SEGMENT_WIDTHS[i % SEGMENT_WIDTHS.length] }}
                  animate={{ opacity: [0.35, 0.65, 0.35] }}
                  transition={{
                    duration: 2.8,
                    ease: "easeInOut",
                    repeat: Infinity,
                    delay: i * 0.3,
                  }}
                />
              ))}
            </motion.span>
          )}
        </AnimatePresence>
      </span>

      {/* Suffix */}
      {suffix && (
        <span className="text-[12px] font-medium text-muted-foreground/60">{suffix}</span>
      )}

      {/* Lock badge */}
      <span
        className={`inline-flex items-center justify-center w-[18px] h-[18px] rounded border transition-colors ${
          revealed
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-white/10 bg-white/[0.03] text-muted-foreground/50"
        }`}
        title={revealed ? "Decrypted — visible to you only" : "Encrypted on-chain"}
      >
        {revealed ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
      </span>
    </span>
  );
}
