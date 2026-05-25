import { useRef } from "react";
import { motion, useScroll, useTransform, type MotionValue } from "framer-motion";
import { MapPin, Tag, Store, Coffee, Fuel, ShoppingBag, CreditCard } from "lucide-react";
import { ReceiptTag, MerchantPill } from "./ReceiptTag";

const HEADLINE = [
  "Billions",
  "in",
  "value",
  "settle",
  "onchain",
  "every",
  "day —",
  "and",
  "almost",
  "all",
  "of",
  "it",
  "is",
  "broadcast",
  "in",
  "the",
  "clear.",
];

/** Accent phrase starts here — must stay readable on dark ink band */
const ACCENT_FROM = 9;

/** All words fully sharp by ~68% scroll through this section */
const REVEAL_START = 0.06;
const REVEAL_SPAN = 0.58;
const WORD_STEP = 0.038;

function Word({
  word,
  index,
  progress,
  total,
}: {
  word: string;
  index: number;
  progress: MotionValue<number>;
  total: number;
}) {
  const start = REVEAL_START + (index / total) * REVEAL_SPAN;
  const end = Math.min(start + WORD_STEP, REVEAL_START + REVEAL_SPAN + WORD_STEP);
  const opacity = useTransform(progress, [start, end], [0.12, 1]);
  const y = useTransform(progress, [start, end], [14, 0]);
  const blur = useTransform(progress, [start, end], [5, 0]);
  const filter = useTransform(blur, (b) => `blur(${b}px)`);
  const isAccent = index >= ACCENT_FROM;

  return (
    <motion.span
      style={{ opacity, y, filter }}
      className={`inline-block mr-[0.28em] ${isAccent ? "text-ink-accent" : "text-ink-fg"}`}
    >
      {word}
    </motion.span>
  );
}

function FloatItem({
  progress,
  appear,
  exit,
  x,
  y,
  rotate = 0,
  parallax = 30,
  children,
}: {
  progress: MotionValue<number>;
  appear: [number, number];
  exit: [number, number];
  x: number;
  y: number;
  rotate?: number;
  parallax?: number;
  children: React.ReactNode;
}) {
  const opacityIn = useTransform(progress, appear, [0, 1]);
  const opacityOut = useTransform(progress, exit, [1, 0]);
  const opacity = useTransform([opacityIn, opacityOut], ([a, b]) => Math.min(a, b));
  const blurOut = useTransform(progress, exit, [0, 6]);
  const filter = useTransform(blurOut, (b) => `blur(${b}px)`);
  const translateY = useTransform(progress, [0, 1], [parallax, -parallax]);

  return (
    <motion.div
      style={{
        opacity,
        filter,
        y: translateY,
        left: `${x}%`,
        top: `${y}%`,
        rotate,
      }}
      className="absolute"
    >
      {children}
    </motion.div>
  );
}

export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const headlineScale = useTransform(scrollYProgress, [0.08, 0.65], [0.97, 1]);
  const gridY = useTransform(scrollYProgress, [0, 1], ["0%", "-24%"]);
  const gridOpacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 0.45, 0.45, 0]);
  const eyebrowOpacity = useTransform(scrollYProgress, [0, 0.08], [0, 1]);
  const subOpacity = useTransform(scrollYProgress, [0.58, 0.72], [0, 1]);
  const subY = useTransform(scrollYProgress, [0.58, 0.72], [16, 0]);

  return (
    <section
      id="why"
      ref={containerRef}
      className="scroll-story-section relative bg-ink text-ink-fg"
      style={{ height: "260vh" }}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <motion.div
          aria-hidden
          style={{
            y: gridY,
            opacity: gridOpacity,
            backgroundImage:
              "radial-gradient(circle, oklch(0.82 0.16 145 / 0.18) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
          className="absolute inset-0 -top-32 -bottom-32"
        />

        <div
          className="absolute inset-0 opacity-80"
          style={{
            background:
              "radial-gradient(60% 50% at 50% 50%, oklch(0.3 0.08 150 / 0.55), transparent 70%)",
          }}
        />

        <div className="pointer-events-none absolute inset-0">
          <FloatItem progress={scrollYProgress} appear={[0.05, 0.2]} exit={[0.82, 0.96]} x={38} y={8} rotate={-2} parallax={32}>
            <ReceiptTag
              label="Location"
              value={
                <span className="inline-flex items-center gap-1.5 text-ink-fg">
                  <MapPin className="size-3" /> Dallas, TX · U88
                </span>
              }
              className="bg-transparent border-ink-accent/40"
            />
          </FloatItem>

          <FloatItem progress={scrollYProgress} appear={[0.08, 0.22]} exit={[0.82, 0.96]} x={60} y={16} parallax={48}>
            <MerchantPill
              name="Wire · BR283-29429"
              meta="Operating account"
              amount="−$1.86"
              accent="emerald"
              icon={<Coffee className="size-5" />}
              className="bg-ink-elev text-ink-fg border-ink"
            />
          </FloatItem>

          <FloatItem progress={scrollYProgress} appear={[0.1, 0.24]} exit={[0.82, 0.96]} x={2} y={28} rotate={1} parallax={40}>
            <ReceiptTag
              label="Category"
              value={
                <span className="inline-flex items-center gap-1.5 text-ink-fg">
                  <Tag className="size-3" /> MCC: 5814 · Settlement
                </span>
              }
              className="bg-transparent border-ink-accent/40"
            />
          </FloatItem>

          <FloatItem progress={scrollYProgress} appear={[0.12, 0.26]} exit={[0.82, 0.96]} x={76} y={30} parallax={36}>
            <ReceiptTag
              label="Counterparty"
              value={
                <span className="inline-flex items-center gap-1.5 text-ink-fg">
                  <MapPin className="size-3" /> 0xAa…7b · NYC desk
                </span>
              }
              className="bg-transparent border-ink-accent/40"
            />
          </FloatItem>

          <FloatItem progress={scrollYProgress} appear={[0.18, 0.34]} exit={[0.84, 0.97]} x={6} y={62} rotate={-1} parallax={56}>
            <MerchantPill
              name="Payroll · Q2 cycle"
              meta="42 contributors · USDC"
              amount="−$98,500"
              accent="amber"
              icon={<Fuel className="size-5" />}
              className="bg-ink-elev text-ink-fg border-ink"
            />
          </FloatItem>

          <FloatItem progress={scrollYProgress} appear={[0.24, 0.4]} exit={[0.86, 0.98]} x={0} y={80} parallax={44}>
            <ReceiptTag
              label="Tag"
              value={
                <span className="inline-flex items-center gap-1.5 text-ink-fg">
                  <Tag className="size-3" /> Treasury · Strategic reserve
                </span>
              }
              className="bg-transparent border-ink-accent/40"
            />
          </FloatItem>

          <FloatItem progress={scrollYProgress} appear={[0.28, 0.44]} exit={[0.86, 0.98]} x={46} y={84} rotate={1} parallax={28}>
            <ReceiptTag
              label="Memo"
              value={
                <span className="inline-flex items-center gap-1.5 text-ink-fg">
                  <Store className="size-3" /> Vendor · MG427482842
                </span>
              }
              className="bg-transparent border-ink-accent/40"
            />
          </FloatItem>

          <FloatItem progress={scrollYProgress} appear={[0.32, 0.48]} exit={[0.88, 0.99]} x={68} y={78} parallax={52}>
            <MerchantPill
              name="Vault · M-70 WETH"
              meta="Collateral · public position"
              amount="−$67,000"
              accent="rose"
              icon={<ShoppingBag className="size-5" />}
              className="bg-ink-elev text-ink-fg border-ink"
            />
          </FloatItem>

          <FloatItem progress={scrollYProgress} appear={[0.36, 0.5]} exit={[0.88, 0.99]} x={74} y={66} rotate={-2} parallax={40}>
            <ReceiptTag
              label="Permit"
              value={
                <span className="inline-flex items-center gap-1.5 text-ink-fg">
                  <CreditCard className="size-3" /> None · public ledger
                </span>
              }
              className="bg-transparent border-ink-accent/40 opacity-70"
            />
          </FloatItem>
        </div>

        <motion.div
          style={{ scale: headlineScale }}
          className="relative z-10 mx-auto max-w-4xl px-5 text-center sm:px-8"
        >
          <motion.div className="tag-bracket mb-6 md:mb-8" style={{ opacity: eyebrowOpacity }}>
            ▸ Why Obscura
          </motion.div>
          <h2 className="font-display text-[clamp(1.75rem,5vw,4.5rem)] leading-[1.08] tracking-tight">
            {HEADLINE.map((w, i) => (
              <Word key={i} word={w} index={i} progress={scrollYProgress} total={HEADLINE.length} />
            ))}
          </h2>

          <motion.p
            style={{ opacity: subOpacity, y: subY }}
            className="mx-auto mt-8 max-w-2xl text-base leading-relaxed text-ink-mute md:mt-10 md:text-lg"
          >
            Obscura encrypts every value at the protocol layer. Pay, lend, and govern on public
            chains — without revealing a single number.
          </motion.p>
        </motion.div>

        <div className="absolute bottom-8 left-1/2 h-px w-32 -translate-x-1/2 overflow-hidden bg-ink-fg/15">
          <motion.div className="h-full origin-left bg-ink-accent" style={{ scaleX: scrollYProgress }} />
        </div>
      </div>
    </section>
  );
}
