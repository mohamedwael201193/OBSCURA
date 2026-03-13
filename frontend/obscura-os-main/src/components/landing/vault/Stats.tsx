import { motion } from "framer-motion";

const STATS = [
  { value: "$2.4B", label: "Encrypted value secured" },
  { value: "142k", label: "Confidential transactions" },
  { value: "25", label: "Audited contracts live" },
  { value: "0", label: "Plaintext values exposed" },
];

export function Stats() {
  return (
    <section className="relative bg-background py-24 md:py-32 border-y border-border-subtle">
      <div className="mx-auto max-w-[1400px] px-6 md:px-8 grid grid-cols-2 md:grid-cols-4 gap-10">
        {STATS.map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.08 }}
          >
            <div className="font-display text-5xl md:text-6xl tracking-tight tabular-nums">
              {s.value}
            </div>
            <div className="mt-3 font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
              ▸ {s.label}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
