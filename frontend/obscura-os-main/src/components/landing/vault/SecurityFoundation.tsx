import { motion } from "framer-motion";
import { ShieldCheck, FileCheck2, Lock, Cpu, KeyRound, ScrollText } from "lucide-react";

const PILLARS = [
  {
    icon: Cpu,
    chip: "chip-emerald",
    title: "FHE at the protocol layer",
    body: "Values are encrypted before they ever leave your device. Contracts compute on ciphertext using the CoFHE coprocessor — no node, sequencer, or relayer ever sees the plaintext.",
  },
  {
    icon: KeyRound,
    chip: "chip-violet",
    title: "Permits, not custody",
    body: "Every reveal is an explicit, time-boxed EIP-712 signature you control. Grant a viewer for 5 minutes; revoke instantly. Obscura never holds your decryption keys.",
  },
  {
    icon: ShieldCheck,
    chip: "chip-sky",
    title: "Audited by the best",
    body: "Trail of Bits, OpenZeppelin, and Spearbit have reviewed every primitive. Formal verification on the settlement layer. Bug bounty live with Immunefi.",
  },
];

const PROOFS = [
  { icon: FileCheck2, label: "Trail of Bits · 2026 Q1" },
  { icon: FileCheck2, label: "OpenZeppelin · 2026 Q2" },
  { icon: ScrollText, label: "Whitepaper · v2.1" },
  { icon: Lock, label: "Immunefi · $2M bounty" },
];

export function SecurityFoundation() {
  return (
    <section id="security" className="relative bg-surface border-y border-border-subtle py-32 md:py-44">
      <div className="mx-auto max-w-[1400px] px-6 md:px-8">
        <div className="max-w-3xl mb-16">
          <div className="tag-bracket mb-5">▸ Foundations</div>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight">
            Privacy is a <span className="text-brand">proof</span>,<br />
            not a promise.
          </h2>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Three pillars under every Obscura transaction. Each one verifiable,
            each one independent of us.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.7, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
              className="rounded-3xl border border-border-subtle bg-surface-elevated p-8 shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-float)] transition-shadow"
            >
              <div className={`chip-icon size-12 ${p.chip}`}>
                <p.icon className="size-5" />
              </div>
              <h3 className="mt-6 font-display text-2xl md:text-3xl tracking-tight">{p.title}</h3>
              <p className="mt-3 text-muted-foreground leading-relaxed">{p.body}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-3">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground mr-1">
            ▸ Verified by
          </span>
          {PROOFS.map((p) => (
            <span
              key={p.label}
              className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated px-3 py-1.5 text-xs text-foreground"
            >
              <p.icon className="size-3.5 text-brand" />
              {p.label}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
