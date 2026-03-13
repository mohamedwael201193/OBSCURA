import { useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

interface Chip {
  id: string;
  label: string;
  value: string;
  sub?: string;
  top: string;
  left: string;
  opacity: number;
  parallax: number;
}

const CHIPS: Chip[] = [
  { id: "1", label: "Encrypted Value", value: "Ξ 12.4", sub: "sealed", top: "12%", left: "8%", opacity: 0.35, parallax: 0.3 },
  { id: "2", label: "Module", value: "Pay", top: "22%", left: "72%", opacity: 0.5, parallax: 0.5 },
  { id: "3", label: "FHE Status", value: "Sealed", top: "35%", left: "18%", opacity: 0.7, parallax: 0.8 },
  { id: "4", label: "Governance", value: "Hidden", top: "48%", left: "65%", opacity: 0.4, parallax: 0.4 },
  { id: "5", label: "Tx Hash", value: "0x7f3a…c91e", top: "58%", left: "5%", opacity: 0.55, parallax: 0.6 },
  { id: "6", label: "Module", value: "Vote", top: "68%", left: "78%", opacity: 0.45, parallax: 0.45 },
  { id: "7", label: "Encrypted Value", value: "Ξ 0.42", sub: "private", top: "75%", left: "35%", opacity: 0.85, parallax: 1 },
  { id: "8", label: "FHE Status", value: "Active", top: "18%", left: "42%", opacity: 0.3, parallax: 0.25 },
  { id: "9", label: "Module", value: "Credit", top: "42%", left: "88%", opacity: 0.35, parallax: 0.35 },
  { id: "10", label: "Chain", value: "Arbitrum", top: "82%", left: "58%", opacity: 0.5, parallax: 0.55 },
  { id: "11", label: "Category", value: "DeFi", sub: "FHE vault", top: "28%", left: "92%", opacity: 0.25, parallax: 0.2 },
  { id: "12", label: "Encrypted Value", value: "Ξ 8.1", top: "62%", left: "48%", opacity: 0.6, parallax: 0.65 },
];

function DataChip({ chip, scrollYProgress }: { chip: Chip; scrollYProgress: ReturnType<typeof useScroll>["scrollYProgress"] }) {
  const y = useTransform(scrollYProgress, [0, 1], [0, -80 * chip.parallax]);
  const opacity = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [chip.opacity * 0.5, chip.opacity, chip.opacity, chip.opacity * 0.7]);
  const isDark = chip.opacity > 0.65;

  return (
    <motion.div
      style={{ y, opacity, top: chip.top, left: chip.left }}
      className={`absolute rounded-md border px-3 py-2 font-mono text-[10px] md:px-4 md:py-2.5 md:text-xs ${
        isDark
          ? "border-forest/30 bg-forest text-lime-accent"
          : "border-forest/15 bg-white/90 text-forest/70 backdrop-blur-sm"
      }`}
    >
      <p className={`uppercase tracking-wider ${isDark ? "text-lime-accent/60" : "text-forest/40"}`}>
        {chip.label}
      </p>
      <p className="mt-0.5 font-medium">{chip.value}</p>
      {chip.sub && <p className="mt-0.5 text-[9px] opacity-60">{chip.sub}</p>}
    </motion.div>
  );
}

export default function DataEnrichmentSection() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const headlineOpacity = useTransform(scrollYProgress, [0.1, 0.35, 0.65, 0.9], [0, 1, 1, 0.6]);
  const headlineScale = useTransform(scrollYProgress, [0.1, 0.35], [0.95, 1]);

  return (
    <div ref={containerRef} className="relative h-[200vh] bg-white">
      <div className="sticky top-0 flex min-h-screen flex-col items-center justify-center overflow-hidden px-5 lg:px-8">
        <div className="relative h-full min-h-[70vh] w-full max-w-[1200px]">
          {CHIPS.map((chip) => (
            <DataChip key={chip.id} chip={chip} scrollYProgress={scrollYProgress} />
          ))}

          <motion.h2
            style={{ opacity: headlineOpacity, scale: headlineScale }}
            className="absolute left-1/2 top-1/2 z-10 max-w-2xl -translate-x-1/2 -translate-y-1/2 text-center font-spadeDisplay text-2xl font-medium leading-snug tracking-tight text-forest md:text-4xl lg:text-5xl"
          >
            OBSCURA enriches onchain data in real time, adding privacy, structure, and
            intelligence at every layer.
          </motion.h2>
        </div>
      </div>
    </div>
  );
}
