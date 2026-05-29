import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import { PayHowItWorksScroll } from "./PayHowItWorksScroll";

const ease = [0.16, 1, 0.3, 1] as const;

export function PayProductSection() {
  return (
    <section id="pay" className="relative">
      <div className="border-y border-border-subtle bg-surface py-32 md:py-44">
        <div className="mx-auto max-w-[1400px] px-6 md:px-8">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.75, ease }}
            className="max-w-3xl"
          >
            <div className="tag-bracket mb-5">▸ Obscura Pay</div>
            <h2 className="font-display text-4xl leading-[1.05] tracking-tight md:text-5xl">
              Private stablecoin payments,<br />
              <span className="text-brand">built for public chains.</span>
            </h2>
            <p className="mt-6 text-lg leading-relaxed text-muted-foreground">
              Obscura Pay is a privacy-first payment layer on Arbitrum. Amounts and balances can stay
              encrypted with FHE while you still settle in stable value — with a second path for
              everyday USDC when you want speed and familiarity.
            </p>
            <Link
              to="/pay"
              className="mt-8 inline-flex items-center gap-2 rounded-full bg-brand px-6 py-3 text-sm font-medium text-brand-ink transition-opacity hover:opacity-90"
            >
              Open Obscura Pay
              <ArrowUpRight className="size-4" />
            </Link>
          </motion.div>
        </div>
      </div>

      <PayHowItWorksScroll />
    </section>
  );
}
