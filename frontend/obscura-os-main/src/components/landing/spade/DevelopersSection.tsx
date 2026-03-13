import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useScroll, useTransform, type MotionValue } from "framer-motion";
import { Copy, Check, Sparkles } from "lucide-react";
import OrganicLayerCanvas from "./OrganicLayerCanvas";

const CODE_SAMPLE = `curl -X POST https://api.obscura.dev/v1/seal \\
  -H "Authorization: Bearer \${OBSCURA_KEY}" \\
  -d '{
    "module": "pay",
    "chainId": 421614,
    "asset": "ocUSDC",
    "amount": "████",
    "permit": {
      "type": "EIP-712",
      "viewer": "0xAa…7b",
      "ttl": "5m"
    },
    "ciphertext": "0xenc…8f2a91",
    "revealed": false
  }'`;

function CodePanel() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(CODE_SAMPLE);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable */
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-forest/15 bg-[#0c1208] shadow-[0_20px_50px_-16px_rgba(24,40,14,0.35)]">
      <div className="flex items-center justify-between border-b border-white/8 px-4 py-2.5">
        <div className="flex gap-1.5">
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
          <span className="size-2 rounded-full bg-white/15" />
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-lime-accent/15 px-2 py-0.5 font-mono text-[10px] text-lime-accent">
            cURL
          </span>
          <button
            type="button"
            onClick={copy}
            className="rounded-md p-1 text-white/40 transition-colors hover:text-lime-accent"
            aria-label="Copy snippet"
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          </button>
          <Sparkles className="size-3.5 text-lime-accent/50" aria-hidden />
        </div>
      </div>
      <pre className="max-h-[320px] overflow-auto p-4 font-mono text-[11px] leading-relaxed text-lime-accent/90 md:text-xs">
        <code>{CODE_SAMPLE}</code>
      </pre>
    </div>
  );
}

/** Contained accent — green $ on dark only inside this card, not on sage hero */
function ProtocolGlyphCard({ progress }: { progress: MotionValue<number> }) {
  const glow = useTransform(progress, [0.2, 0.55, 0.85], [0.4, 1, 0.5]);
  const scale = useTransform(progress, [0.2, 0.55], [0.92, 1]);

  return (
    <motion.div
      style={{ opacity: glow, scale }}
      className="relative overflow-hidden rounded-2xl border border-forest/15 bg-forest p-6 md:p-8"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          background:
            "radial-gradient(55% 60% at 50% 45%, rgba(178,235,118,0.12), transparent 70%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-4 md:flex-row md:gap-8">
        <div className="relative size-[140px] shrink-0 md:size-[160px]">
          <img
            src="/images/protocol-glyph-dark.png"
            alt=""
            aria-hidden
            className="h-full w-full object-contain opacity-90 mix-blend-lighten"
          />
        </div>
        <div className="text-center md:text-left">
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-lime-accent/70">
            ▸ Settlement layer
          </p>
          <p className="mt-2 font-display text-xl font-medium leading-snug text-white md:text-2xl">
            Encrypted value, public proofs
          </p>
          <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/55">
            The protocol glyph marks where balances stay sealed onchain — visible settlement,
            invisible amounts.
          </p>
        </div>
      </div>
    </motion.div>
  );
}

export default function DevelopersSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-12%" });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const leftX = useTransform(scrollYProgress, [0.15, 0.45], [-32, 0]);
  const rightX = useTransform(scrollYProgress, [0.15, 0.45], [32, 0]);
  const centerY = useTransform(scrollYProgress, [0.1, 0.5], [40, 0]);

  return (
    <section
      ref={sectionRef}
      id="developers"
      className="border-y border-forest/8 bg-white px-4 py-16 sm:px-5 md:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="grid gap-10 lg:grid-cols-[1fr_auto_1fr] lg:items-center lg:gap-8 xl:gap-12">
          <motion.div
            style={{ x: leftX }}
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md lg:max-w-none"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-forest/45">
              [ Builders ]
            </p>
            <h2 className="mt-4 font-display text-2xl font-medium leading-[1.15] tracking-tight text-forest md:text-3xl lg:text-[2rem]">
              Integrate Obscura&apos;s privacy SDK in minutes. No custom FHE setup — just
              encrypted balances, permits, and modules that scale with your stack.
            </h2>
            <Link
              to="/docs"
              className="mt-8 inline-flex items-center gap-2 font-body text-sm font-medium text-forest transition-colors hover:text-forest/70"
            >
              <span aria-hidden>▸</span> Explore our docs
            </Link>
          </motion.div>

          <motion.div
            style={{ y: centerY }}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-full max-w-[300px] justify-self-center lg:max-w-none"
          >
            <OrganicLayerCanvas />
          </motion.div>

          <motion.div
            style={{ x: rightX }}
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <CodePanel />
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, delay: 0.35 }}
          className="mt-14 md:mt-16"
        >
          <ProtocolGlyphCard progress={scrollYProgress} />
        </motion.div>
      </div>
    </section>
  );
}
