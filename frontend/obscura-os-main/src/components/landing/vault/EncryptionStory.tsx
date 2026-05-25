import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import {
  ObscuraFeatureIcon,
  ENCRYPTION_STEP_ICONS,
} from "@/components/landing/ObscuraFeatureIcon";

const STEPS = [
  {
    title: "Inputs encrypted client-side",
    body: "Your values are sealed with FHE in the browser before they ever touch a public network. No node sees the plaintext.",
  },
  {
    title: "Computation on ciphertext",
    body: "Smart contracts add, subtract, and compare encrypted numbers directly. The CoFHE coprocessor never decrypts your data.",
  },
  {
    title: "Selective reveal",
    body: "Decryption needs an explicit EIP-712 permit signed by you. Auditors, partners, regulators — invited one viewer at a time.",
  },
  {
    title: "Public proofs, private values",
    body: "Settlement is on Arbitrum. The math is verifiable, the numbers are yours. Privacy by mathematics, not by trust.",
  },
];

export function EncryptionStory() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const lineHeight = useTransform(scrollYProgress, [0.1, 0.9], ["0%", "100%"]);

  return (
    <section id="how" ref={ref} className="relative bg-background py-32 md:py-48">
      <div className="mx-auto max-w-[1400px] px-6 md:px-8">
        <div className="max-w-3xl mb-20">
          <div className="tag-bracket mb-5">▸ How it works</div>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight">
            Privacy that <span className="text-brand">computes</span>,<br />
            not just <span className="italic">hides</span>.
          </h2>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            Fully Homomorphic Encryption lets contracts run on data they can't
            read. Four moments, one continuous proof.
          </p>
        </div>

        <div className="relative grid md:grid-cols-2 gap-x-16 gap-y-20">
          <div className="hidden md:block absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-border-subtle">
            <motion.div
              style={{ height: lineHeight }}
              className="w-px bg-brand origin-top"
            />
          </div>

          {STEPS.map((s, i) => (
            <motion.div
              key={s.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
              className={`${i % 2 === 0 ? "md:pr-12" : "md:pl-12 md:translate-y-24"}`}
            >
              <div className="rounded-3xl border border-border-subtle bg-surface-elevated p-8 shadow-[var(--shadow-card)]">
                <div className="flex items-center gap-3 mb-5">
                  <ObscuraFeatureIcon
                    icon={ENCRYPTION_STEP_ICONS[i].icon}
                    tone={ENCRYPTION_STEP_ICONS[i].tone}
                  />
                  <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                    Step 0{i + 1}
                  </div>
                </div>
                <h3 className="font-display text-2xl md:text-3xl tracking-tight">{s.title}</h3>
                <p className="mt-3 text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
