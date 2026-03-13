import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Banknote, Vault, Vote as VoteIcon, ShieldCheck } from "lucide-react";
import { MoneyGlyph } from "./MoneyGlyph";
import { ReceiptTag, MerchantPill } from "./ReceiptTag";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-background">
      {/* Animated gradient mesh */}
      <motion.div
        aria-hidden
        className="absolute inset-0 mesh-bg opacity-70 dark:opacity-50"
        initial={{ scale: 1.05, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.7 }}
        transition={{ duration: 2 }}
      />
      {/* Subtle grid */}
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.04] dark:opacity-[0.08]"
        style={{
          backgroundImage:
            "linear-gradient(currentColor 1px, transparent 1px), linear-gradient(90deg, currentColor 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />

      <div className="relative mx-auto max-w-[1400px] px-6 md:px-8 pb-32 pt-12 md:pt-20">
        {/* Trust badge */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated/70 backdrop-blur px-3 py-1.5 text-xs text-muted-foreground"
        >
          <ShieldCheck className="size-3.5 text-brand" />
          <span>Audited by Trail of Bits · Live on Arbitrum</span>
        </motion.div>

        {/* Headline */}
        <div className="relative z-10 max-w-3xl mt-6">
          <div className="tag-bracket mb-5">▸ The encrypted operating system</div>
          <h1 className="font-display text-5xl md:text-7xl lg:text-[92px] leading-[0.95] tracking-tight text-foreground">
            Private money,<br />
            <span className="text-brand">computed in the open.</span>
          </h1>
          <p className="mt-8 max-w-xl text-lg text-muted-foreground leading-relaxed">
            Obscura is one privacy engine for payments, credit, and governance —
            every balance, vote, and transfer encrypted end-to-end with Fully
            Homomorphic Encryption.
          </p>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              to="/pay"
              className="rounded-full bg-brand-ink px-6 py-3 text-sm text-brand-soft shadow-[var(--shadow-glow)] transition hover:opacity-90"
            >
              Open Obscura →
            </Link>
            <a href="#how" className="rounded-full border border-border bg-surface-elevated/70 backdrop-blur px-6 py-3 text-sm text-foreground hover:bg-accent transition">
              See how privacy works
            </a>
          </div>
        </div>

        {/* Floating composition */}
        <div className="relative mt-20 h-[420px] md:h-[480px]">
          <motion.div
            initial={{ opacity: 0, scale: 0.92, rotate: -4 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 aurora-ring"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            >
              <MoneyGlyph className="relative size-[420px] md:size-[520px] text-brand opacity-90" />
            </motion.div>
          </motion.div>

          <Floater delay={0.3} className="left-0 top-4 md:top-8">
            <ReceiptTag
              label="Transaction ID"
              value={<span className="text-foreground">0x8a91…f2c4</span>}
            />
          </Floater>

          <Floater delay={0.5} className="left-6 md:left-16 top-44">
            <ReceiptTag
              label="Encrypted Amount"
              value={<span className="tracking-widest text-foreground">▪ ▪ ▪ ▪ ▪ ▪ ▪ ▪</span>}
            />
          </Floater>

          <Floater delay={0.7} className="left-2 md:left-10 bottom-2">
            <ReceiptTag label="View Permit" value={"EIP-712 · Signed\nViewer: 0xAa…7b · 5m"} />
          </Floater>

          <Floater delay={0.4} from="right" className="right-0 top-8">
            <MerchantPill
              name="Payroll · Acme Labs"
              meta="2026-05-24 · sealed at source"
              amount="—————"
              accent="emerald"
              icon={<Banknote className="size-5" />}
            />
          </Floater>

          <Floater delay={0.6} from="right" className="right-4 md:right-12 top-44">
            <MerchantPill
              name="Vault · Conservative"
              meta="Health factor · encrypted"
              amount="●●●●"
              accent="violet"
              icon={<Vault className="size-5" />}
            />
          </Floater>

          <Floater delay={0.8} from="right" className="right-0 bottom-4">
            <MerchantPill
              name="Proposal #014 · Ballot cast"
              meta="Confidential · sealed"
              amount="✓"
              accent="amber"
              icon={<VoteIcon className="size-5" />}
            />
          </Floater>
        </div>
      </div>
    </section>
  );
}

function Floater({
  children,
  className,
  delay,
  from = "left",
}: {
  children: React.ReactNode;
  className?: string;
  delay: number;
  from?: "left" | "right";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, x: from === "left" ? -20 : 20, y: 10 }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration: 0.9, delay }}
      className={`absolute ${className}`}
    >
      <motion.div animate={{ y: [0, -6, 0] }} transition={{ duration: 5 + delay * 2, repeat: Infinity, ease: "easeInOut" }}>
        {children}
      </motion.div>
    </motion.div>
  );
}
