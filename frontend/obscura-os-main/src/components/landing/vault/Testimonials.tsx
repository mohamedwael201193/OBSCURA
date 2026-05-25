import { motion } from "framer-motion";

const QUOTES = [
  {
    quote:
      "Obscura is the first privacy layer that didn't force us to compromise on auditability. Our treasury moves confidentially, our auditors still get a verified seat at the table.",
    name: "Mira Velazquez",
    role: "Head of Treasury · Stellar DAO",
    chip: "chip-emerald",
  },
  {
    quote:
      "We replaced three off-chain reporting systems with a single permit flow. Encrypted payroll, public proofs of solvency — it just works.",
    name: "Daniel Cho",
    role: "CFO · Sequence Labs",
    chip: "chip-violet",
  },
  {
    quote:
      "Coercion-resistant voting changed our governance overnight. Quiet votes, loud results — proposals finally reflect what people actually want.",
    name: "Adaeze Okafor",
    role: "Steward · Arbitrum Citizens",
    chip: "chip-amber",
  },
];

export function Testimonials() {
  return (
    <section className="relative bg-background py-32 md:py-40">
      <div className="mx-auto max-w-[1400px] px-6 md:px-8">
        <div className="mb-16 max-w-2xl">
          <div className="tag-bracket mb-5">▸ Trusted by operators</div>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight">
            Treasuries, DAOs, and<br />
            <span className="text-brand">financial institutions.</span>
          </h2>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {QUOTES.map((q, i) => (
            <motion.figure
              key={q.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-3xl border border-border-subtle bg-surface-elevated p-8 shadow-[var(--shadow-card)] flex flex-col"
            >
              <blockquote className="font-display text-xl md:text-2xl leading-snug tracking-tight text-foreground flex-1">
                “{q.quote}”
              </blockquote>
              <figcaption className="mt-8 flex items-center gap-3 pt-6 border-t border-border-subtle">
                <div className={`chip-icon size-10 ${q.chip} font-display text-lg`}>
                  {q.name[0]}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{q.name}</div>
                  <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    {q.role}
                  </div>
                </div>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
