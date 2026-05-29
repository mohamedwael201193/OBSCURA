import { useRef } from "react";
import { motion, useTransform } from "framer-motion";
import {
  FloatCard,
  StoryPill,
  StoryTag,
  useScrollStoryProgress,
  Word,
} from "./scrollStoryPrimitives";

const WORDS = [
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

const REVEAL_START = 0.04;
const REVEAL_END = 0.78;

export function ScrollStory() {
  const containerRef = useRef<HTMLDivElement>(null);
  const progress = useScrollStoryProgress(containerRef);

  const headlineScale = useTransform(progress, [0.06, 0.72], [0.98, 1]);
  const gridOpacity = useTransform(progress, [0, 0.12, 0.88, 1], [0, 0.4, 0.4, 0]);
  const eyebrowOpacity = useTransform(progress, [0, 0.06], [0, 1]);
  const subOpacity = useTransform(progress, [0.72, 0.84], [0, 1]);
  const subY = useTransform(progress, [0.72, 0.84], [12, 0]);
  const barScale = useTransform(progress, [0.02, 0.98], [0, 1]);

  return (
    <section
      id="why"
      ref={containerRef}
      className="scroll-story-section relative bg-forest"
      style={{ height: "320vh" }}
    >
      <div className="sticky top-0 flex h-screen items-center justify-center overflow-hidden">
        <motion.div
          aria-hidden
          style={{ opacity: gridOpacity }}
          className="pointer-events-none absolute inset-0"
        >
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(55% 52% at 50% 50%, rgba(45,107,69,0.65) 0%, transparent 72%)",
            }}
          />
        </motion.div>

        <div className="pointer-events-none absolute inset-0">
          <FloatCard progress={progress} enterAt={0.03} className="left-[4%] top-[10%] hidden md:block">
            <StoryTag label="Transaction ID" value="3012128618" />
          </FloatCard>
          <FloatCard progress={progress} enterAt={0.08} className="left-[2%] top-[24%] hidden lg:block">
            <StoryTag label="Encrypted amount" value="• • • • • • • •" />
          </FloatCard>
          <FloatCard progress={progress} enterAt={0.14} className="left-[5%] top-[38%] hidden md:block">
            <StoryTag label="Location" value="1164 Broadway, New York, NY" />
          </FloatCard>
          <FloatCard progress={progress} enterAt={0.2} className="left-[3%] top-[52%] hidden lg:block">
            <StoryTag label="Category" value="MCC 5814 · Settlement" />
          </FloatCard>
          <FloatCard progress={progress} enterAt={0.28} className="left-[6%] top-[66%] hidden lg:block">
            <StoryTag label="View permit" value="EIP-712 · viewer 0xAa…7b" />
          </FloatCard>
          <FloatCard progress={progress} enterAt={0.36} className="left-[4%] top-[78%] hidden xl:block">
            <StoryTag label="Memo" value="Vendor · MG427482842" />
          </FloatCard>

          <FloatCard progress={progress} enterAt={0.1} className="right-[3%] top-[12%] hidden md:block">
            <StoryPill name="Wire · BR283-29429" meta="Operating account" amount="−$1.50" />
          </FloatCard>
          <FloatCard progress={progress} enterAt={0.18} className="right-[5%] top-[26%] hidden lg:block">
            <StoryTag label="Merchant" value="STORM NORTH AMERICA" />
          </FloatCard>
          <FloatCard progress={progress} enterAt={0.24} className="right-[2%] top-[40%] hidden md:block">
            <StoryTag label="Counterparty" value="0xAa…7b · NYC desk" />
          </FloatCard>
          <FloatCard progress={progress} enterAt={0.32} className="right-[4%] top-[54%] hidden lg:block">
            <StoryPill name="Payroll · Q2 cycle" meta="42 contributors · ocUSDC" amount="−$98,500" />
          </FloatCard>
          <FloatCard progress={progress} enterAt={0.42} className="right-[3%] top-[68%] hidden lg:block">
            <StoryTag label="Permit" value="None · public ledger" />
          </FloatCard>
          <FloatCard progress={progress} enterAt={0.52} className="right-[5%] top-[80%] hidden xl:block">
            <StoryPill name="Vault · M-70 WETH" meta="Collateral · sealed" amount="−$67,000" />
          </FloatCard>

          <FloatCard progress={progress} enterAt={0.16} className="left-[8%] top-[62%] hidden sm:block lg:hidden">
            <StoryTag label="Chain" value="Arbitrum Sepolia · 421614" />
          </FloatCard>
          <FloatCard progress={progress} enterAt={0.38} className="right-[6%] top-[72%] hidden sm:block lg:hidden">
            <StoryTag label="Status" value="FHE · ciphertext onchain" />
          </FloatCard>
        </div>

        <motion.div
          style={{ scale: headlineScale }}
          className="relative z-10 mx-auto max-w-4xl px-5 text-center sm:px-8 md:px-10"
        >
          <motion.p
            style={{ opacity: eyebrowOpacity }}
            className="mb-6 font-mono text-[10px] uppercase tracking-[0.28em] text-lime-accent/70"
          >
            ▸ Why Obscura
          </motion.p>

          <h2 className="flex flex-wrap justify-center gap-x-[0.3em] gap-y-[0.08em] font-display text-[clamp(1.9rem,5.5vw,5rem)] font-normal leading-[1.06] tracking-tight">
            {WORDS.map((w, i) => (
              <Word
                key={i}
                word={w}
                index={i}
                total={WORDS.length}
                progress={progress}
                revealStart={REVEAL_START}
                revealEnd={REVEAL_END}
              />
            ))}
          </h2>

          <motion.p
            style={{ opacity: subOpacity, y: subY }}
            className="mx-auto mt-8 max-w-xl text-[15px] leading-relaxed text-white/55 md:text-base"
          >
            Obscura encrypts every value at the protocol layer. Pay, lend, and govern on public
            chains — without revealing a single number.
          </motion.p>
        </motion.div>

        <div className="absolute bottom-8 left-1/2 h-px w-32 -translate-x-1/2 overflow-hidden bg-white/12">
          <motion.div className="h-full origin-left bg-lime-accent" style={{ scaleX: barScale }} />
        </div>
      </div>
    </section>
  );
}
