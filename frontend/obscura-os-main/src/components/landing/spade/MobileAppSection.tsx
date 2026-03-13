import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { Banknote, Shield, Smartphone, Vote } from "lucide-react";

const SCREENSHOTS = [
  { src: "/images/mobile-app-splash.png", alt: "Obscura mobile splash screen" },
  { src: "/images/mobile-app-pay.png", alt: "Obscura Pay mobile workspace" },
] as const;

const DOWNLOAD_URL = "https://github.com/NeoCrafts-cpu/obscura-mobile/releases/latest";

function PhoneMockup() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % SCREENSHOTS.length);
    }, 4500);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-[300px] lg:max-w-[320px]">
      <div
        className="pointer-events-none absolute -inset-8 rounded-full opacity-70 blur-3xl"
        style={{
          background:
            "radial-gradient(ellipse at 50% 55%, rgba(178,235,118,0.18), transparent 65%)",
        }}
      />
      <div className="relative rotate-[-4deg] transition-transform duration-500 hover:rotate-0 lg:rotate-[-6deg] lg:hover:rotate-[-2deg]">
        <div className="rounded-[2.75rem] border border-white/12 bg-[#141814] p-2 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.65)]">
          <div className="relative overflow-hidden rounded-[2.25rem] border border-white/8 bg-black">
            <div className="pointer-events-none absolute left-1/2 top-2.5 z-20 h-6 w-[88px] -translate-x-1/2 rounded-full bg-black" />
            <div className="relative aspect-[9/19.5] w-full">
              <AnimatePresence mode="wait">
                <motion.img
                  key={SCREENSHOTS[index].src}
                  src={SCREENSHOTS[index].src}
                  alt={SCREENSHOTS[index].alt}
                  initial={{ opacity: 0, scale: 1.02 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.45, ease: "easeInOut" }}
                  className="absolute inset-0 h-full w-full object-cover object-top"
                />
              </AnimatePresence>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-center gap-2">
          {SCREENSHOTS.map((shot, i) => (
            <button
              key={shot.src}
              type="button"
              onClick={() => setIndex(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === index ? "w-6 bg-lime-accent" : "w-1.5 bg-white/25 hover:bg-white/40"
              }`}
              aria-label={`Show screenshot ${i + 1}`}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Shield,
    tone: "text-lime-accent",
    title: "Private Pay treasury",
    body: "Shield USDC, send encrypted payments, and manage stealth inbox — all from your phone.",
  },
  {
    icon: Vote,
    tone: "text-violet-300",
    title: "Vote & Credit on the go",
    body: "Cast encrypted votes and monitor credit health with the same FHE stack as the web app.",
  },
] as const;

export default function MobileAppSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, margin: "-10%" });

  return (
    <section
      ref={sectionRef}
      id="mobile-app"
      className="relative overflow-hidden border-y border-white/10 bg-forest px-4 py-16 text-white sm:px-5 md:py-24 lg:px-8 lg:py-28"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(80% 50% at 20% 50%, rgba(178,235,118,0.12), transparent 55%), radial-gradient(60% 40% at 90% 20%, rgba(255,255,255,0.06), transparent 50%)",
        }}
      />

      <div className="relative mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] lg:gap-16 xl:gap-20">
        <motion.div
          initial={{ opacity: 0, x: -32 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="order-2 lg:order-1"
        >
          <PhoneMockup />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.85, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
          className="order-1 lg:order-2"
        >
          <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-lime-accent/80">
            Mobile suite
          </p>
          <h2 className="mt-4 font-display text-3xl font-medium leading-[1.08] tracking-tight text-white md:text-4xl lg:text-[2.75rem]">
            Privacy in your{" "}
            <span className="text-lime-accent">pocket</span>
          </h2>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-white/55 md:text-[17px]">
            Take Obscura Pay, Vote, and Credit anywhere. Balances stay encrypted on Arbitrum
            Sepolia — the same FHE primitives as the web app, tuned for thumb-sized workflows and
            WalletConnect on real devices.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href={DOWNLOAD_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex min-h-[48px] items-center gap-3 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:border-white/25 hover:bg-white/[0.08]"
            >
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
                <path
                  fill="currentColor"
                  d="M3.6 2.4A1.8 1.8 0 0 0 2 4.2v15.6a1.8 1.8 0 0 0 1.6 1.8l9.1-9.9-9.1-9.3Zm11.1 7.5 2.5-2.7a8.6 8.6 0 0 1 2.4 5.9 8.6 8.6 0 0 1-2.4 5.9l-2.5-2.7 3.4-3.7-3.4-3.7ZM12 12.8 4.8 20.6A1.8 1.8 0 0 0 6.4 22h11.2a1.8 1.8 0 0 0 1.6-1.4L12 12.8Zm8.8-1.4L17.4 8.7l2.5-2.7A8.6 8.6 0 0 1 22 12a8.6 8.6 0 0 1-2.1 6l-2.5-2.7 3.4-3.7Z"
                />
              </svg>
              <span>
                <span className="block text-[10px] font-normal uppercase tracking-wider text-white/45">
                  Get it on
                </span>
                Google Play / APK
              </span>
            </a>
            <p className="w-full text-xs text-white/40 sm:w-auto">
              Download the latest APK from GitHub Releases. For Play Store, upload the signed{" "}
              <code className="rounded bg-white/10 px-1 py-0.5 font-mono text-[10px]">.aab</code>{" "}
              from the same release (see repo PLAY_STORE.md).
            </p>
            <div
              className="inline-flex min-h-[48px] cursor-not-allowed items-center gap-3 rounded-xl border border-white/8 bg-white/[0.02] px-4 py-2.5 text-sm text-white/35"
              aria-disabled
            >
              <svg viewBox="0 0 24 24" className="size-5 shrink-0" aria-hidden>
                <path
                  fill="currentColor"
                  d="M17.05 12.64c-.02-2.14 1.75-3.16 1.83-3.21-1-.15-2-.6-2.56-1.22-.58-.64-.88-1.48-.86-2.38.02-1.02.44-1.96 1.18-2.58.67-.56 1.54-.86 2.44-.86.93 0 1.72.31 2.2.31.46 0 1.34-.3 2.24-.3 1.72 0 3.28 1.04 4.1 2.64-3.5 1.92-2.94 6.94.58 8.24-.48 1.24-1.04 2.46-1.88 3.58-1.28 1.68-2.76 3.36-4.74 3.4-1.98.04-2.62-1.18-4.88-1.18-2.26 0-2.98 1.14-4.86 1.2-1.98.06-3.5-1.64-4.78-3.32-2.58-3.38-2.86-8.24-1.2-11.86 1.16-2.28 3.22-3.72 5.46-3.76 1.7-.04 3.3 1.14 4.32 1.14.98 0 2.82-1.4 4.76-1.2Z"
                />
              </svg>
              <span>
                <span className="block text-[10px] font-normal uppercase tracking-wider text-white/30">
                  Coming soon
                </span>
                App Store
              </span>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-x-8 gap-y-2 font-mono text-[10px] uppercase tracking-[0.18em] text-white/40">
            <span className="inline-flex items-center gap-2">
              <Smartphone className="size-3.5 text-lime-accent/80" />
              Pay · Vote · Credit
            </span>
            <span className="inline-flex items-center gap-2">
              <Banknote className="size-3.5 text-lime-accent/80" />
              FHE encrypted
            </span>
          </div>

          <div className="mt-10 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((feature, i) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 16 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.6, delay: 0.2 + i * 0.08 }}
                  className="rounded-2xl border border-white/10 bg-white/[0.03] p-5 backdrop-blur-sm"
                >
                  <div className={`mb-3 flex size-9 items-center justify-center rounded-xl bg-white/[0.06] ${feature.tone}`}>
                    <Icon className="size-4" strokeWidth={1.75} />
                  </div>
                  <h3 className="font-display text-base font-medium text-white">{feature.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-white/50">{feature.body}</p>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
