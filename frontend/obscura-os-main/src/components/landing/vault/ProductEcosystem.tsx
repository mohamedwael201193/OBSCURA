import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowUpRight } from "lucide-react";
import {
  ObscuraFeatureIcon,
  PRODUCT_MODULE_ICONS,
} from "@/components/landing/ObscuraFeatureIcon";

const PRODUCTS = [
  {
    to: "/pay",
    name: "Pay",
    tagline: "Private banking, onchain.",
    body: "Stealth sends, shielded payroll, encrypted streams. Settle in stable value, reveal only to who you choose.",
    accent: "from-[oklch(0.96_0.05_150)] to-[oklch(0.92_0.06_150)]",
    accentDark: "dark:from-[oklch(0.3_0.06_150)] dark:to-[oklch(0.24_0.05_150)]",
    preview: <PayPreview />,
  },
  {
    to: "/credit",
    name: "Credit",
    tagline: "Encrypted lending terminal.",
    body: "Supply, borrow, and manage collateral with hidden positions. Public solvency, private balance sheet.",
    accent: "from-[oklch(0.96_0.04_85)] to-[oklch(0.92_0.05_85)]",
    accentDark: "dark:from-[oklch(0.3_0.06_85)] dark:to-[oklch(0.24_0.05_85)]",
    preview: <CreditPreview />,
  },
  {
    to: "/vote",
    name: "Vote",
    tagline: "Coercion-resistant governance.",
    body: "Confidential ballots, weighted by encrypted stake. Aggregate tallies revealed only after finalization.",
    accent: "from-[oklch(0.96_0.04_290)] to-[oklch(0.92_0.05_290)]",
    accentDark: "dark:from-[oklch(0.3_0.06_290)] dark:to-[oklch(0.24_0.05_290)]",
    preview: <VotePreview />,
  },
];

export function ProductEcosystem() {
  return (
    <section className="relative bg-surface py-32 md:py-48 border-y border-border-subtle">
      <div className="mx-auto max-w-[1400px] px-6 md:px-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-20">
          <div className="max-w-2xl">
            <div className="tag-bracket mb-5">▸ The ecosystem</div>
            <h2 className="font-display text-4xl md:text-6xl leading-[1.05] tracking-tight">
              Three products,<br />
              <span className="text-brand">one privacy engine.</span>
            </h2>
          </div>
          <p className="md:text-right max-w-md text-muted-foreground">
            Composable encrypted modules covering the full spectrum of
            organizational activity.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {PRODUCTS.map((p, i) => (
            <motion.div
              key={p.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.6, delay: i * 0.1, ease: [0.22, 1, 0.36, 1] }}
            >
              <Link
                to={p.to}
                className="group relative block overflow-hidden rounded-3xl border border-border-subtle bg-surface-elevated shadow-[var(--shadow-card)] hover:shadow-[var(--shadow-float)] transition-shadow"
              >
                <div className={`relative aspect-[4/3] overflow-hidden bg-gradient-to-br ${p.accent} ${p.accentDark}`}>
                  <div className="absolute inset-0 flex items-center justify-center p-6">
                    {p.preview}
                  </div>
                </div>

                <div className="p-7">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <ObscuraFeatureIcon
                        icon={PRODUCT_MODULE_ICONS[i].icon}
                        tone={PRODUCT_MODULE_ICONS[i].tone}
                      />
                      <div>
                        <div className="font-display text-2xl tracking-tight">Obscura {p.name}</div>
                        <div className="text-sm text-muted-foreground">{p.tagline}</div>
                      </div>
                    </div>
                    <ArrowUpRight className="size-5 text-muted-foreground group-hover:text-brand transition" />
                  </div>
                  <p className="mt-5 text-sm text-muted-foreground leading-relaxed">{p.body}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PayPreview() {
  return (
    <div className="w-full max-w-xs rounded-2xl bg-surface-elevated/95 backdrop-blur shadow-[var(--shadow-float)] p-5 border border-border-subtle">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Encrypted balance</div>
      <div className="mt-1 font-display text-4xl tabular-nums">$ ●●●●●●</div>
      <div className="mt-4 flex gap-2">
        <div className="flex-1 rounded-xl bg-brand text-brand-ink text-center py-2 text-xs font-medium">Send</div>
        <div className="flex-1 rounded-xl border border-border text-foreground text-center py-2 text-xs font-medium">Reveal</div>
      </div>
      <div className="mt-4 space-y-1.5">
        <Row label="Payroll · Acme" value="—————" />
        <Row label="Stealth · 0x8a…f2" value="—————" />
      </div>
    </div>
  );
}

function CreditPreview() {
  return (
    <div className="w-full max-w-xs rounded-2xl bg-surface-elevated/95 backdrop-blur shadow-[var(--shadow-float)] p-5 border border-border-subtle">
      <div className="flex items-center justify-between">
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Health factor</div>
        <div className="text-[10px] font-medium text-brand">Healthy</div>
      </div>
      <div className="mt-3 h-2 rounded-full bg-border overflow-hidden">
        <div className="h-full w-[78%] bg-brand rounded-full" />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-lg bg-surface p-2.5">
          <div className="text-muted-foreground">Supply</div>
          <div className="font-display text-lg">●●●●</div>
        </div>
        <div className="rounded-lg bg-surface p-2.5">
          <div className="text-muted-foreground">Borrow</div>
          <div className="font-display text-lg">●●●●</div>
        </div>
      </div>
    </div>
  );
}

function VotePreview() {
  return (
    <div className="w-full max-w-xs rounded-2xl bg-surface-elevated/95 backdrop-blur shadow-[var(--shadow-float)] p-5 border border-border-subtle">
      <div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Proposal #014</div>
      <div className="mt-1 font-display text-lg leading-tight">Fund encrypted bridge audit</div>
      <div className="mt-4 space-y-2">
        {["For", "Against", "Abstain"].map((l, i) => (
          <div key={l} className="space-y-1">
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>{l}</span>
              <span className="font-mono">●●●●</span>
            </div>
            <div className="h-1.5 rounded-full bg-border overflow-hidden">
              <div
                className="h-full bg-brand rounded-full"
                style={{ width: ["64%", "22%", "14%"][i] }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-center text-xs py-1.5 border-b border-border-subtle last:border-0">
      <span className="text-muted-foreground truncate">{label}</span>
      <span className="font-mono tabular-nums">{value}</span>
    </div>
  );
}
