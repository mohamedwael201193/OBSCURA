import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import SideRulers from "./SideRulers";
import MoneyGlyph from "./MoneyGlyph";
import FloatingDataCards from "./FloatingDataCards";

/** Sage inset from ruler ticks — tight like spade.com */
const SAGE_INSET = "px-5 sm:px-6 md:px-7 lg:px-8";

export default function SpadeHeroSection() {
  return (
    <section className="relative overflow-x-clip bg-white pb-10 pt-0 lg:pb-12">
      <div className="relative mx-auto w-full max-w-[1400px]">
        <SideRulers />

        <div className={`relative z-10 ${SAGE_INSET}`}>
          <div className="overflow-hidden rounded-[1.5rem] bg-sage-1 shadow-[0_1px_0_rgba(24,40,14,0.05)] ring-1 ring-forest/[0.05] md:rounded-[1.75rem] lg:rounded-[2rem]">
            <div className="flex min-h-[min(90vh,920px)] flex-col px-3 pt-8 pb-8 sm:px-4 sm:pt-9 sm:pb-9 md:px-5 md:pt-10 md:pb-10 lg:pt-11 lg:pb-11">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
                className="mx-auto max-w-[18ch] shrink-0 text-center font-display text-4xl font-normal leading-[1.05] tracking-tight text-forest md:max-w-none md:text-6xl lg:text-[5.25rem]"
              >
                Private money,
                <br />
                computed in the open.
              </motion.h1>

              <div className="relative mt-5 flex flex-1 flex-col justify-center md:mt-6">
                <div className="relative mx-auto w-full max-w-[960px] flex-1">
                  <div className="relative min-h-[clamp(380px,58vh,580px)] w-full">
                    <FloatingDataCards variant="wide" />

                    <div className="absolute inset-0 z-10 flex items-center justify-center pb-2">
                      <MoneyGlyph className="h-[min(100%,clamp(320px,52vw,520px))] w-full max-w-[min(100%,620px)]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.45, duration: 0.75 }}
            className="mx-auto mt-8 max-w-xl text-center font-body text-base leading-relaxed text-forest/65 md:mt-10 md:text-lg"
          >
            Homomorphic finance for public chains — Pay, Credit, and Vote on one encrypted engine.
            Balances, ballots, and transfers stay sealed until you grant a permit.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.75 }}
            className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4"
          >
            <Link
              to="/pay"
              className="inline-flex min-w-[200px] items-center justify-center rounded-full bg-forest px-8 py-3.5 font-body text-sm font-medium text-lime-accent transition-opacity hover:opacity-90"
            >
              Open Obscura →
            </Link>
            <a
              href="#how"
              className="inline-flex min-w-[200px] items-center justify-center rounded-full border border-forest/18 bg-white px-8 py-3.5 font-body text-sm font-medium text-forest transition-colors hover:border-forest/35"
            >
              See how privacy works
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
