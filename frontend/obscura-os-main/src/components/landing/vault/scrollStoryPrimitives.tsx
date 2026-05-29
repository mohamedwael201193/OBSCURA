import type { RefObject, ReactNode } from "react";
import {
  motion,
  useSpring,
  useScroll,
  useTransform,
  type MotionValue,
} from "framer-motion";

export const POP_IN = 0.055;

export function useScrollStoryProgress(containerRef: RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  return useSpring(scrollYProgress, {
    stiffness: 110,
    damping: 32,
    mass: 0.2,
    restDelta: 0.0008,
  });
}

export function Word({
  word,
  index,
  total,
  progress,
  revealStart,
  revealEnd,
  wordReveal = 0.042,
}: {
  word: string;
  index: number;
  total: number;
  progress: MotionValue<number>;
  revealStart: number;
  revealEnd: number;
  wordReveal?: number;
}) {
  const slot = revealEnd - revealStart - wordReveal;
  const step = total > 1 ? slot / (total - 1) : 0;
  const start = revealStart + index * step;
  const end = start + wordReveal;

  const opacity = useTransform(progress, [start, end], [0.14, 1]);
  const y = useTransform(progress, [start, end], [10, 0]);

  return (
    <motion.span
      style={{ opacity, y }}
      className="inline-block text-white will-change-[transform,opacity]"
    >
      {word}
    </motion.span>
  );
}

export function FloatCard({
  progress,
  enterAt,
  exitAt = 0.94,
  className,
  children,
}: {
  progress: MotionValue<number>;
  enterAt: number;
  exitAt?: number;
  className: string;
  children: ReactNode;
}) {
  const opacity = useTransform(
    progress,
    [enterAt, enterAt + POP_IN, exitAt, exitAt + 0.04],
    [0, 1, 1, 0],
  );
  const y = useTransform(progress, [enterAt, enterAt + POP_IN], [18, 0]);
  const scale = useTransform(progress, [enterAt, enterAt + POP_IN], [0.92, 1]);

  return (
    <motion.div
      style={{ opacity, y, scale }}
      className={`absolute will-change-[transform,opacity] ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function StoryTag({ label, value }: { label: string; value: string }) {
  return (
    <div className="relative border border-white/20 bg-white/5 px-3.5 py-2.5 backdrop-blur-sm">
      <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/45">
        ▸ {label}
      </p>
      <p className="mt-1 font-mono text-xs text-white/85">{value}</p>
    </div>
  );
}

export function StoryPill({
  name,
  meta,
  amount,
}: {
  name: string;
  meta: string;
  amount: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-white/12 bg-white/8 px-3.5 py-2.5 backdrop-blur-sm">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600/80 text-white">
        $
      </div>
      <div className="min-w-0">
        <p className="truncate text-[12px] font-medium text-white">{name}</p>
        <p className="font-mono text-[9px] text-white/40">{meta}</p>
      </div>
      <span className="ml-1 shrink-0 font-mono text-[13px] text-white/80">{amount}</span>
    </div>
  );
}
