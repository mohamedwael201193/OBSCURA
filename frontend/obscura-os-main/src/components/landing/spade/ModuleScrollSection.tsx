import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { Link } from "react-router-dom";

export interface ModuleScrollSectionProps {
  label: string;
  title: string;
  body: string;
  stat: string;
  statLabel: string;
  cta: string;
  href: string;
  reversed?: boolean;
  accentColor?: string;
}

export default function ModuleScrollSection({
  label,
  title,
  body,
  stat,
  statLabel,
  cta,
  href,
  reversed = false,
  accentColor = "#B2EB76",
}: ModuleScrollSectionProps) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section className="bg-white px-5 py-20 md:px-8 md:py-32 lg:py-40">
      <div
        ref={ref}
        className={`mx-auto flex max-w-[1200px] flex-col items-center gap-12 lg:min-h-screen lg:flex-row lg:gap-20 ${
          reversed ? "lg:flex-row-reverse" : ""
        }`}
      >
        <motion.div
          initial={{ opacity: 0, x: reversed ? 30 : -30 }}
          animate={inView ? { opacity: 1, x: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="flex-1 lg:sticky lg:top-24 lg:self-start"
        >
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-forest/45">{label}</p>
          <h2 className="mt-4 font-spadeDisplay text-3xl font-medium leading-tight tracking-tight text-forest md:text-4xl lg:text-5xl">
            {title}
          </h2>
          <p className="mt-6 max-w-md font-spadeBody text-base leading-relaxed text-forest/65 md:text-lg">
            {body}
          </p>
          <div className="mt-8 flex items-baseline gap-3">
            <span className="font-spadeDisplay text-4xl font-semibold text-forest md:text-5xl">
              {stat}
            </span>
            <span className="max-w-[140px] text-sm text-forest/50">{statLabel}</span>
          </div>
          <Link
            to={href}
            className="mt-8 inline-flex items-center gap-2 rounded-full border border-forest/20 px-5 py-2.5 text-sm font-medium text-forest transition-colors hover:border-forest/40"
          >
            {cta}
            <span aria-hidden="true">→</span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-1 items-center justify-center"
        >
          <div
            className="relative aspect-[4/3] w-full max-w-lg overflow-hidden rounded-2xl border border-forest/10 bg-sage-1"
            style={{ boxShadow: `0 24px 48px -12px ${accentColor}33` }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-forest/5 to-transparent" />
            <div className="flex h-full flex-col justify-between p-6 md:p-8">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: accentColor }}
                />
                <span className="font-mono text-[10px] uppercase tracking-wider text-forest/40">
                  {label}
                </span>
              </div>
              <div className="space-y-3">
                <div className="h-2 w-3/4 rounded bg-forest/10" />
                <div className="h-2 w-1/2 rounded bg-forest/10" />
                <div className="h-2 w-2/3 rounded bg-forest/10" />
              </div>
              <div className="rounded-lg border border-forest/10 bg-white/80 p-4 backdrop-blur-sm">
                <p className="font-mono text-xs text-forest/50">FHE encrypted</p>
                <p className="mt-1 font-spadeDisplay text-xl font-semibold text-forest">
                  {stat}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
