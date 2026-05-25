import { useCallback, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Wireframe $ with vertical scan wipe — digital grid above, green wire below; FHE on hover.
 */
export default function MoneyGlyph({ className }: { className?: string }) {
  const reduceMotion = useReducedMotion();
  const [encrypting, setEncrypting] = useState(false);

  const startEncrypt = useCallback(() => {
    if (reduceMotion) return;
    setEncrypting(false);
    requestAnimationFrame(() => setEncrypting(true));
  }, [reduceMotion]);

  const stopEncrypt = useCallback(() => {
    setEncrypting(false);
  }, []);

  return (
    <motion.div
      role="img"
      aria-label="Encrypted value glyph — hover to preview homomorphic decryption"
      tabIndex={reduceMotion ? -1 : 0}
      onMouseEnter={startEncrypt}
      onMouseLeave={stopEncrypt}
      onFocus={startEncrypt}
      onBlur={stopEncrypt}
      className={cn(
        "money-glyph-figure relative flex w-full cursor-pointer items-center justify-center outline-none",
        encrypting && "money-glyph-figure--active",
        className,
      )}
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={reduceMotion ? undefined : { scale: 1.03 }}
      transition={{
        opacity: { duration: 1.1, ease: [0.16, 1, 0.3, 1] },
        scale: { type: "spring", stiffness: 260, damping: 22 },
      }}
    >
      <motion.div
        className="relative h-full w-full"
        animate={
          reduceMotion || encrypting
            ? undefined
            : {
                y: [0, -14, 0],
                rotate: [-2.5, 2.5, -2.5],
              }
        }
        transition={{
          y: { duration: 5.8, repeat: Infinity, ease: "easeInOut" },
          rotate: { duration: 9.5, repeat: Infinity, ease: "easeInOut" },
        }}
      >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 transition-opacity duration-500",
          encrypting ? "opacity-100" : "opacity-40",
        )}
      >
        <div className="money-glyph-mask money-glyph-mask--boost absolute inset-[4%]" />
      </div>

        <div className="money-glyph-mask money-glyph-mask--live absolute inset-0" />

        {!reduceMotion ? (
          <>
            <div className="money-glyph-encrypt-trail absolute inset-0" aria-hidden />
            <div className="money-glyph-digital-dots absolute inset-0" aria-hidden />
            <div className="money-glyph-scan-edge absolute inset-x-[-2%]" aria-hidden />
            <div className="money-glyph-cipher absolute inset-0" aria-hidden />
            <div className="money-glyph-seal-pulse absolute inset-[8%]" aria-hidden />
            <div className="money-glyph-scanlines pointer-events-none absolute inset-0" aria-hidden />
          </>
        ) : null}
      </motion.div>

      {!reduceMotion ? (
        <span
          className={cn(
            "money-glyph-status pointer-events-none absolute -bottom-0.5 left-1/2 z-20 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.22em] text-forest/45 transition-opacity duration-300",
            encrypting ? "opacity-100" : "opacity-0",
          )}
        >
          FHE · decrypting…
        </span>
      ) : null}

      {encrypting && !reduceMotion ? (
        <span
          className="sr-only"
          aria-live="polite"
        >
          Running homomorphic decryption preview
        </span>
      ) : null}
    </motion.div>
  );
}
