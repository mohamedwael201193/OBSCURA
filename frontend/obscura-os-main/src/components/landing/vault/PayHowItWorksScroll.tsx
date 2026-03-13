import { useRef, useState, type RefObject } from "react";
import type { LucideIcon } from "lucide-react";
import { Inbox, LockKeyhole, Send, Shield, Wallet } from "lucide-react";
import {
  AnimatePresence,
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ObscuraFeatureIcon,
  type ObscuraChipTone,
} from "@/components/landing/ObscuraFeatureIcon";

type PayStep = {
  id: string;
  title: string;
  brief: string;
  icon: LucideIcon;
  tone: ObscuraChipTone;
  hint: string;
};

const STEPS: PayStep[] = [
  {
    id: "wallet",
    title: "Connect wallet",
    brief: "Sign in with the wallet you already use on Arbitrum.",
    icon: Wallet,
    tone: "forest",
    hint: "MetaMask · WalletConnect",
  },
  {
    id: "shield",
    title: "Shield USDC",
    brief: "Move public USDC in — your balance becomes private ocUSDC.",
    icon: Shield,
    tone: "moss",
    hint: "USDC → ocUSDC",
  },
  {
    id: "encrypt",
    title: "Seal the amount",
    brief: "The payment amount is encrypted in your browser before it hits the chain.",
    icon: LockKeyhole,
    tone: "lime",
    hint: "CoFHE · client-side",
  },
  {
    id: "send",
    title: "Send privately",
    brief: "Pay an address or a stealth meta-address — amounts stay hidden.",
    icon: Send,
    tone: "deep",
    hint: "Confidential transfer",
  },
  {
    id: "inbox",
    title: "Track in one place",
    brief: "Receipts, streams, and stealth claims land in your activity inbox.",
    icon: Inbox,
    tone: "forest",
    hint: "Activity · inbox",
  },
];

const STEP_COUNT = STEPS.length;
const SCROLL_PER_STEP_VH = 55;

export function PayHowItWorksScroll() {
  const containerRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion();
  const scroll = usePayScrollStep(containerRef);

  if (reduceMotion) {
    return <PayHowItWorksStatic />;
  }

  return (
    <section
      ref={containerRef}
      className="relative bg-forest text-white"
      style={{ height: `${STEP_COUNT * SCROLL_PER_STEP_VH}vh` }}
      aria-label="How Obscura Pay works"
    >
      <div className="sticky top-0 flex min-h-screen items-center overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0 opacity-60"
          aria-hidden
          style={{
            background:
              "radial-gradient(60% 55% at 72% 42%, rgba(178,235,118,0.14), transparent 65%)",
          }}
        />

        <div className="relative mx-auto flex w-full max-w-[1200px] flex-col gap-10 px-6 py-16 md:px-8 lg:flex-row lg:items-center lg:gap-16 lg:py-20">
          <PayStepRail activeStep={scroll.activeStep} lineScale={scroll.lineScale} />
          <PayStepStage activeStep={scroll.activeStep} />
        </div>

        <ScrollHint opacity={scroll.hintOpacity} />
      </div>
    </section>
  );
}

function usePayScrollStep(containerRef: RefObject<HTMLElement | null>) {
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });

  const progress = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 28,
    mass: 0.15,
  });

  const activeStep = useTransform(progress, (p) => {
    const idx = Math.floor(p * STEP_COUNT);
    return Math.min(STEP_COUNT - 1, Math.max(0, idx));
  });

  const lineScale = useTransform(progress, [0, 1], [0, 1]);
  const hintOpacity = useTransform(progress, [0, 0.08, 0.92, 1], [1, 1, 1, 0]);

  return { progress, activeStep, lineScale, hintOpacity };
}

function PayStepRail({
  activeStep,
  lineScale,
}: {
  activeStep: MotionValue<number>;
  lineScale: MotionValue<number>;
}) {
  const [current, setCurrent] = useState(0);

  useMotionValueEvent(activeStep, "change", (v) => setCurrent(v));

  return (
    <div className="lg:w-[42%] lg:shrink-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-lime-accent/75">
        ▸ How it works
      </p>
      <h3 className="mt-3 font-display text-3xl leading-tight tracking-tight md:text-4xl">
        Five steps.
        <br />
        <span className="text-white/55">One private payment.</span>
      </h3>
      <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/50">
        Scroll to walk through the flow — shield, seal, send, and track without leaving Obscura Pay.
      </p>

      <ol className="relative mt-10 space-y-0">
        <div
          className="absolute bottom-2 left-[11px] top-2 w-px bg-white/12"
          aria-hidden
        />
        <motion.div
          className="absolute bottom-2 left-[11px] top-2 w-px origin-top bg-lime-accent"
          style={{ scaleY: lineScale }}
          aria-hidden
        />

        {STEPS.map((step, i) => {
          const isActive = i === current;
          const isDone = i < current;

          return (
            <li
              key={step.id}
              className={cn(
                "relative flex gap-4 py-3 transition-opacity duration-300",
                isActive ? "opacity-100" : isDone ? "opacity-70" : "opacity-40",
              )}
            >
              <span
                className={cn(
                  "relative z-[1] mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border-2 text-[10px] font-mono font-medium transition-colors",
                  isActive
                    ? "border-lime-accent bg-lime-accent text-forest"
                    : isDone
                      ? "border-lime-accent/60 bg-lime-accent/20 text-lime-accent"
                      : "border-white/20 bg-forest text-white/40",
                )}
              >
                {i + 1}
              </span>
              <div className="min-w-0 pt-0.5">
                <p
                  className={cn(
                    "text-sm font-medium transition-colors",
                    isActive ? "text-white" : "text-white/70",
                  )}
                >
                  {step.title}
                </p>
                {isActive ? (
                  <p className="mt-1 text-xs leading-relaxed text-white/45 lg:hidden">
                    {step.brief}
                  </p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function PayStepStage({
  activeStep,
}: {
  activeStep: MotionValue<number>;
}) {
  const [current, setCurrent] = useState(0);

  useMotionValueEvent(activeStep, "change", (v) => setCurrent(v));
  const step = STEPS[current];

  return (
    <div className="relative flex flex-1 items-center justify-center lg:min-h-[420px]">
      <AnimatePresence mode="wait">
        <motion.article
          key={step.id}
          initial={{ opacity: 0, x: 28, filter: "blur(6px)" }}
          animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, x: -20, filter: "blur(4px)" }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md rounded-3xl border border-white/12 bg-white/[0.07] p-8 shadow-[0_24px_80px_-24px_rgba(0,0,0,0.45)] backdrop-blur-md md:p-10"
        >
          <div className="flex items-start justify-between gap-4">
            <ObscuraFeatureIcon icon={step.icon} tone={step.tone} size="lg" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-lime-accent/80">
              {String(current + 1).padStart(2, "0")} / {String(STEP_COUNT).padStart(2, "0")}
            </span>
          </div>

          <h4 className="mt-8 font-display text-2xl tracking-tight md:text-3xl">{step.title}</h4>
          <p className="mt-3 text-base leading-relaxed text-white/65">{step.brief}</p>

          <div className="mt-8 rounded-xl border border-dashed border-white/20 bg-white/5 px-4 py-3">
            <p className="font-mono text-[10px] uppercase tracking-wider text-white/40">
              In the app
            </p>
            <p className="mt-1 font-mono text-sm text-lime-accent/90">{step.hint}</p>
          </div>

          <StepMiniFlow activeIndex={current} />
        </motion.article>
      </AnimatePresence>
    </div>
  );
}

function StepMiniFlow({ activeIndex }: { activeIndex: number }) {
  return (
    <div className="mt-8 flex items-center gap-0" aria-hidden>
      {STEPS.map((s, i) => {
        const Icon = s.icon;
        const on = i <= activeIndex;
        const current = i === activeIndex;

        return (
          <div key={s.id} className="flex flex-1 items-center">
            <div
              className={cn(
                "flex size-8 shrink-0 items-center justify-center rounded-lg border transition-all duration-300",
                current
                  ? "border-lime-accent bg-lime-accent/20 text-lime-accent"
                  : on
                    ? "border-white/25 bg-white/10 text-white/70"
                    : "border-white/10 bg-transparent text-white/25",
              )}
            >
              <Icon className="size-3.5" strokeWidth={1.75} />
            </div>
            {i < STEPS.length - 1 ? (
              <div
                className={cn(
                  "mx-0.5 h-px flex-1 transition-colors duration-300",
                  i < activeIndex ? "bg-lime-accent/50" : "bg-white/12",
                )}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function ScrollHint({
  opacity,
}: {
  opacity: MotionValue<number>;
}) {
  return (
    <motion.p
      style={{ opacity }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 font-mono text-[9px] uppercase tracking-[0.22em] text-white/35"
    >
      Scroll to continue
    </motion.p>
  );
}

function PayHowItWorksStatic() {
  return (
    <section className="bg-forest px-6 py-20 text-white md:px-8">
      <div className="mx-auto max-w-[1200px]">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-lime-accent/75">
          ▸ How it works
        </p>
        <h3 className="mt-3 font-display text-3xl tracking-tight">Five steps. One private payment.</h3>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map((step, i) => (
            <li
              key={step.id}
              className="rounded-2xl border border-white/12 bg-white/[0.06] p-5"
            >
              <div className="flex items-center gap-3">
                <ObscuraFeatureIcon icon={step.icon} tone={step.tone} size="sm" />
                <span className="font-mono text-[10px] text-white/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-4 font-medium">{step.title}</p>
              <p className="mt-2 text-sm text-white/55">{step.brief}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
