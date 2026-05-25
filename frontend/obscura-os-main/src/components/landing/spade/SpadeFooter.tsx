import { useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useScroll, useSpring, useTransform, type MotionValue } from "framer-motion";
import { ArrowRight } from "lucide-react";
import ObscuraLogo from "@/components/brand/ObscuraLogo";
import { cn } from "@/lib/utils";

const USE_CASES = [
  { label: "Private payments", href: "/pay" },
  { label: "Encrypted credit", href: "/credit" },
  { label: "Sealed governance", href: "/vote" },
  { label: "View permits", href: "/docs" },
];

const MODULES = [
  { label: "ObscuraPay", href: "/pay" },
  { label: "ObscuraCredit", href: "/credit" },
  { label: "ObscuraVote", href: "/vote" },
  { label: "Ecosystem", href: "/ecosystem" },
];

const COMPANY = [
  { label: "How it works", href: "#how" },
  { label: "Docs", href: "/docs" },
  { label: "Privacy", href: "/privacy" },
  { label: "Security", href: "#how" },
];

const TICKER_ITEMS = [
  "FHE",
  "EIP-712",
  "PERMIT",
  "ENCRYPTED BALANCES",
  "HOMOMORPHIC",
  "ARBITRUM SEPOLIA",
  "PAY",
  "CREDIT",
  "VOTE",
  "OBSCURA",
  "ZERO-KNOWLEDGE READY",
  "SEALED BALLOTS",
];

function FloatingFooterCoin({
  className,
  scrollY,
}: {
  className?: string;
  scrollY: MotionValue<number>;
}) {
  return (
    <motion.div
      style={{ y: scrollY }}
      className={cn(
        "footer-wire-coin pointer-events-none absolute will-change-transform",
        className,
      )}
      aria-hidden
    />
  );
}

function FooterCtaBand() {
  const bandRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: bandRef,
    offset: ["start end", "end start"],
  });

  const smooth = useSpring(scrollYProgress, {
    stiffness: 90,
    damping: 28,
    mass: 0.25,
  });

  const leftY = useTransform(smooth, [0, 0.33, 0.66, 1], [32, -8, -32, 8]);
  const rightY = useTransform(smooth, [0, 0.33, 0.66, 1], [-28, 10, 28, -10]);

  return (
    <div
      ref={bandRef}
      className="relative overflow-hidden px-5 py-16 sm:px-8 md:py-20 lg:px-10 lg:py-24"
    >
      <FloatingFooterCoin
        scrollY={leftY}
        className="left-[2%] top-[8%] h-[clamp(100px,18vw,200px)] w-[clamp(100px,18vw,200px)] -rotate-12 opacity-90"
      />
      <FloatingFooterCoin
        scrollY={rightY}
        className="right-[3%] top-[32%] h-[clamp(130px,24vw,280px)] w-[clamp(130px,24vw,280px)] rotate-6 opacity-85"
      />

      <div className="relative z-10 mx-auto max-w-[1400px]">
        <ObscuraLogo size="md" tone="dark" className="mb-8" />
        <h2 className="max-w-3xl font-display text-[clamp(2rem,5vw,3.75rem)] font-normal leading-[1.08] tracking-tight">
          Add <span className="text-lime-accent">privacy</span> to every layer of onchain finance
        </h2>
        <p className="mt-4 max-w-lg font-body text-sm leading-relaxed text-white/55 md:text-base">
          One FHE engine for payments, credit, and governance — encrypted by default on public
          chains.
        </p>
        <Link
          to="/pay"
          className="mt-8 inline-flex items-center justify-center rounded-full bg-lime-accent px-8 py-3.5 font-body text-sm font-semibold text-forest transition-transform hover:scale-[1.02] active:scale-[0.98]"
        >
          Open Obscura
        </Link>
      </div>
    </div>
  );
}

function FooterScrollTicker() {
  const track = [...TICKER_ITEMS, ...TICKER_ITEMS];

  return (
    <div className="border-t border-white/10 bg-forest py-5">
      <div className="marquee-mask overflow-hidden">
        <div className="footer-marquee-track flex w-max items-center gap-10 px-4">
          {track.map((label, i) => (
            <span
              key={`${label}-${i}`}
              className="shrink-0 font-mono text-[11px] uppercase tracking-[0.28em] text-lime-accent/75"
            >
              {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function SpadeFooter() {
  return (
    <footer id="docs" className="relative overflow-hidden bg-forest text-white">
      <FooterCtaBand />

      <div className="border-t border-white/10 px-5 py-14 sm:px-8 lg:px-10">
        <div className="mx-auto grid max-w-[1400px] gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-10">
          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-lime-accent">
              Use cases
            </h3>
            <ul className="mt-5 space-y-3">
              {USE_CASES.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="font-display text-xl text-white/90 transition-colors hover:text-lime-accent md:text-2xl"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-lime-accent">
              Modules
            </h3>
            <ul className="mt-5 space-y-3">
              {MODULES.map((link) => (
                <li key={link.href}>
                  <Link
                    to={link.href}
                    className="font-display text-xl text-white/90 transition-colors hover:text-lime-accent md:text-2xl"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-lime-accent">
              Company
            </h3>
            <ul className="mt-5 space-y-3">
              {COMPANY.map((link) => (
                <li key={link.href}>
                  {link.href.startsWith("#") ? (
                    <a
                      href={link.href}
                      className="font-display text-xl text-white/90 transition-colors hover:text-lime-accent md:text-2xl"
                    >
                      {link.label}
                    </a>
                  ) : (
                    <Link
                      to={link.href}
                      className="font-display text-xl text-white/90 transition-colors hover:text-lime-accent md:text-2xl"
                    >
                      {link.label}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-mono text-[10px] uppercase tracking-[0.22em] text-lime-accent">
              Stay in the loop
            </h3>
            <p className="mt-5 font-mono text-sm leading-relaxed text-white/55">
              Sign up for product updates on encrypted finance.
            </p>
            <form
              className="mt-4 flex border border-white/20"
              onSubmit={(e) => e.preventDefault()}
            >
              <input
                type="email"
                placeholder="Email address"
                aria-label="Email address"
                className="min-w-0 flex-1 bg-transparent px-3 py-3 font-mono text-xs text-lime-accent/90 placeholder:text-lime-accent/45 focus:outline-none"
              />
              <button
                type="submit"
                className="flex shrink-0 items-center justify-center border-l border-white/20 px-4 text-lime-accent transition-colors hover:bg-white/5"
                aria-label="Subscribe"
              >
                <ArrowRight className="size-4" strokeWidth={1.5} />
              </button>
            </form>
          </div>
        </div>
      </div>

      <FooterScrollTicker />

      <div className="border-t border-white/10 px-5 py-6 sm:px-8 lg:px-10">
        <p className="mx-auto max-w-[1400px] font-mono text-[10px] uppercase tracking-[0.18em] text-white/35">
          © {new Date().getFullYear()} OBSCURA · FHE on Arbitrum Sepolia
        </p>
      </div>
    </footer>
  );
}
