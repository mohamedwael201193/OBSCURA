import { Link } from "react-router-dom";
import { MoneyGlyph } from "./MoneyGlyph";

export function FinalCTA() {
  return (
    <section className="relative bg-ink text-ink-fg overflow-hidden">
      <div className="absolute inset-0 opacity-25 pointer-events-none">
        <MoneyGlyph className="absolute -right-32 top-1/2 -translate-y-1/2 size-[640px]" />
      </div>
      {/* glow */}
      <div className="absolute inset-0 pointer-events-none"
           style={{ background: "radial-gradient(40% 50% at 20% 50%, oklch(0.5 0.14 150 / 0.4), transparent 70%)" }} />
      <div className="relative mx-auto max-w-[1400px] px-6 md:px-8 py-32 md:py-48">
        <div className="max-w-3xl">
          <div className="tag-bracket mb-6 text-[var(--color-ink-accent)]">▸ Step inside</div>
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight">
            Onchain, but<br />
            <span className="text-[var(--color-ink-accent)]">only for your eyes.</span>
          </h2>
          <p className="mt-8 max-w-xl text-lg text-ink-mute leading-relaxed">
            Join the institutions, DAOs, and operators running their financial
            stack on encrypted rails.
          </p>
          <div className="mt-12 flex flex-wrap gap-3">
            <Link
              to="/pay"
              className="rounded-full bg-[var(--color-ink-accent)] text-[var(--color-ink)] px-7 py-3.5 text-sm font-medium hover:opacity-90 transition shadow-[0_10px_40px_-8px_oklch(0.7_0.16_145_/_0.55)]"
            >
              Launch Obscura →
            </Link>
            <a
              href="#docs"
              className="rounded-full border border-ink-fg/20 px-7 py-3.5 text-sm text-ink-fg hover:bg-ink-fg/10 transition"
            >
              Read the docs
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
