import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, useInView, useScroll, useTransform } from "framer-motion";
import { Copy, Check, Sparkles } from "lucide-react";
import OrganicFigureCard from "./OrganicFigureCard";

const JSON_SAMPLE = `{
  "dot": "42161.arb",
  "amount": "encrypted",
  "userId": "0xAa…7b",
  "location": "client",
  "acquirerId": "cofhe",
  "occurredAt": "2026-05-25T12:00:00Z",
  "categoryCode": "FHE_SEAL",
  "categoryType": "ciphertext",
  "currencyCode": "ocUSDC",
  "transactionId": "0x8a91…f2c4"
}`;

function JsonCodePanel() {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(JSON_SAMPLE);
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
            JSON
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
      <pre className="max-h-[340px] overflow-auto p-4 font-mono text-[11px] leading-relaxed text-lime-accent/90 md:text-xs">
        <code>{JSON_SAMPLE}</code>
      </pre>
    </div>
  );
}

/** Spade-style [DEVELOPERS] band — organic figure on black, separate from SDK section */
export default function FigureShowcaseSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-12%" });
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start end", "end start"],
  });

  const leftX = useTransform(scrollYProgress, [0.15, 0.45], [-28, 0]);
  const rightX = useTransform(scrollYProgress, [0.15, 0.45], [28, 0]);
  const centerY = useTransform(scrollYProgress, [0.1, 0.5], [36, 0]);

  return (
    <section
      ref={sectionRef}
      id="privacy-layer"
      className="border-y border-forest/8 bg-white px-4 py-16 sm:px-5 md:py-24 lg:px-8"
    >
      <div className="mx-auto max-w-[1200px]">
        <div className="figure-showcase-grid grid gap-10 lg:items-center lg:gap-8 xl:gap-12">
          <motion.div
            style={{ x: leftX }}
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
            className="max-w-md lg:max-w-none lg:col-start-1 lg:row-start-1"
          >
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-forest/45">
              [ Developers ]
            </p>
            <h2 className="mt-4 font-body text-2xl font-bold leading-[1.2] tracking-tight text-forest md:text-[1.65rem] lg:text-[1.75rem]">
              Integrate Obscura&apos;s API in minutes. No complex FHE setup, no custom
              configuration — just high-performance privacy that scales automatically.
            </h2>
            <Link
              to="/docs"
              className="mt-8 inline-flex items-center gap-2 font-mono text-sm text-forest transition-colors hover:text-forest/70"
            >
              <span aria-hidden>▸</span> Explore our docs
            </Link>
          </motion.div>

          <motion.div
            style={{ y: centerY }}
            initial={{ opacity: 0, scale: 0.94 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.9, delay: 0.12, ease: [0.16, 1, 0.3, 1] }}
            className="mx-auto w-full max-w-[420px] shrink-0 justify-self-center lg:col-start-2 lg:row-start-1"
          >
            <OrganicFigureCard variant="reference" />
          </motion.div>

          <motion.div
            style={{ x: rightX }}
            initial={{ opacity: 0, y: 28 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.85, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-start-3 lg:row-start-1"
          >
            <JsonCodePanel />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
