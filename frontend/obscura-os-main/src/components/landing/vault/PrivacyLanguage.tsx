import { motion } from "framer-motion";
import { useState } from "react";

const ITEMS = [
  { hidden: "$ ●●●●●●", revealed: "$ 248,000.00", label: "Balance" },
  { hidden: "●●●●", revealed: "1,420", label: "Holders" },
  { hidden: "—————", revealed: "−$14.00", label: "Tx amount" },
  { hidden: "●●●●●●", revealed: "78% health", label: "Position" },
];

export function PrivacyLanguage() {
  const [revealed, setRevealed] = useState(false);

  return (
    <section className="relative bg-background py-32 md:py-48">
      <div className="mx-auto max-w-[1400px] px-6 md:px-8 grid lg:grid-cols-2 gap-16 items-center">
        <div>
          <div className="tag-bracket mb-5">▸ Privacy, visualized</div>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight">
            Hidden by default.<br />
            <span className="text-brand">Revealed by permit.</span>
          </h2>
          <p className="mt-6 max-w-lg text-muted-foreground text-lg leading-relaxed">
            Every value across Obscura ships in two states. The default is
            encrypted — a cipher that travels with the asset. A signed permit
            turns it back into a number, for one viewer at a time.
          </p>

          <button
            onClick={() => setRevealed((v) => !v)}
            className="mt-8 inline-flex items-center gap-3 rounded-full bg-brand-ink px-5 py-3 text-sm text-brand-soft"
          >
            <span className="size-1.5 rounded-full bg-brand" />
            {revealed ? "Re-encrypt values" : "Try a reveal permit"}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {ITEMS.map((it, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className="rounded-2xl border border-border-subtle bg-surface-elevated p-6 shadow-[var(--shadow-card)] aspect-square flex flex-col justify-between"
            >
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                ▸ {it.label}
              </div>
              <motion.div
                key={revealed ? "r" : "h"}
                initial={{ opacity: 0, filter: "blur(8px)" }}
                animate={{ opacity: 1, filter: "blur(0px)" }}
                transition={{ duration: 0.5 }}
                className="font-display text-3xl md:text-4xl tabular-nums tracking-tight"
              >
                {revealed ? it.revealed : it.hidden}
              </motion.div>
              <div className={`text-xs ${revealed ? "text-brand" : "text-muted-foreground"}`}>
                {revealed ? "Permit · valid 5 min" : "Encrypted ciphertext"}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
