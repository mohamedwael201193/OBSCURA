import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Target, TrendingUp, Users, Building2, Code2, Briefcase, Heart, ExternalLink, CheckCircle2, XCircle, MinusCircle } from "lucide-react";
import ObscuraNav from "@/components/ObscuraNav";
import ObscuraFooter from "@/components/ObscuraFooter";

const verticals = [
  {
    icon: Building2,
    title: "DAO Treasuries",
    pain: "Public payouts dox contributor salaries forever",
    fit: "Confidential streams + on-chain audit trail without amounts",
  },
  {
    icon: Code2,
    title: "Remote-First Crypto Startups",
    pain: "Doxxing payroll on Etherscan kills hiring leverage",
    fit: "Stealth recipient per cycle, encrypted amounts, real cUSDC",
  },
  {
    icon: Briefcase,
    title: "Web3 Agencies & Studios",
    pain: "Clients see contractor rates and copy them",
    fit: "Insurance-backed recurring streams + cross-chain funding",
  },
  {
    icon: Users,
    title: "Independent Contractors",
    pain: "Payment delays + no recourse on missed invoices",
    fit: "Confidential coverage policies pay out automatically",
  },
  {
    icon: Heart,
    title: "OSS Grant Programs",
    pain: "Contributor identity correlation across grants",
    fit: "Stealth meta-addresses break the social graph",
  },
];

const matrix = [
  { name: "Obscura Pay v4", encryptedAmount: true, recurringStream: true, stealth: true, crossChain: true, insurance: true, real: true },
  { name: "Zalary", encryptedAmount: true, recurringStream: true, stealth: false, crossChain: false, insurance: false, real: true },
  { name: "CipherRoll", encryptedAmount: true, recurringStream: false, stealth: false, crossChain: false, insurance: false, real: true },
  { name: "Z0tz", encryptedAmount: true, recurringStream: false, stealth: false, crossChain: false, insurance: false, real: false },
  { name: "Walnut", encryptedAmount: true, recurringStream: false, stealth: false, crossChain: false, insurance: false, real: true },
];

const cell = (v: boolean) =>
  v ? <CheckCircle2 className="w-4 h-4 text-primary inline" /> : <XCircle className="w-4 h-4 text-muted-foreground/40 inline" />;

export default function PMFPage() {
  return (
    <div className="min-h-screen bg-background">
      <ObscuraNav />

      <div className="pt-24 px-6 pb-16 max-w-[1200px] mx-auto space-y-16">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-mono">
            ◆ Wave 2 PMF Brief
          </span>
          <h1 className="font-display text-4xl md:text-5xl text-foreground tracking-tight">
            Confidential payroll, <span className="text-primary text-glow">made boringly real.</span>
          </h1>
          <p className="text-base font-body text-muted-foreground max-w-2xl mx-auto">
            Five verticals where doxxing payroll on a public chain is an existential problem — and why
            ObscuraPay v4 is the first product that solves all of them with one stack.
          </p>
        </motion.section>

        {/* Problem */}
        <section className="glass-panel rounded-sm p-8 space-y-4">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            <h2 className="font-display text-xl text-foreground">The Problem</h2>
          </div>
          <p className="text-sm font-body text-muted-foreground">
            Today, every USDC payroll transfer on Arbitrum, Base, or Optimism reveals: <strong className="text-foreground">who got paid, how much, when, and how often</strong>. Salaries become public. Contributors become identifiable. Funding rounds get reverse-engineered from token outflows. Regulators and competitors both win — recipients lose.
          </p>
          <p className="text-sm font-body text-muted-foreground">
            Existing &ldquo;privacy payroll&rdquo; tools encrypt amounts but still publish recipient addresses, ship without insurance, ignore cross-chain funding, or lean on mocks. Obscura v4 ships all five primitives — encrypted amounts, recurring streams, stealth recipients, cross-chain hooks, and on-chain insurance — on real Reineira contracts on Arbitrum Sepolia today.
          </p>
        </section>

        {/* TAM */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <TrendingUp className="w-4 h-4 text-primary" />
            <h2 className="font-display text-xl text-foreground">Market</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { label: "TAM", value: "$25B", note: "Total DAO + crypto-native treasuries paying contributors" },
              { label: "SAM", value: "$1.2B", note: "Remote crypto payroll handled in stablecoins annually" },
              { label: "SOM (Wave 2)", value: "$50M", note: "Reachable in 12 months via DAO / agency deals" },
            ].map((m) => (
              <div key={m.label} className="glass-panel rounded-sm p-6 text-center">
                <div className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-mono mb-2">
                  {m.label}
                </div>
                <div className="font-display text-3xl text-primary text-glow mb-2">{m.value}</div>
                <div className="text-[10px] font-mono text-muted-foreground/70">{m.note}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Verticals */}
        <section>
          <h2 className="font-display text-xl text-foreground mb-6">Target Verticals</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {verticals.map((v) => (
              <div key={v.title} className="glass-panel rounded-sm p-6 space-y-2">
                <div className="flex items-center gap-2">
                  <v.icon className="w-4 h-4 text-primary" />
                  <h3 className="font-display text-sm tracking-wider text-foreground">{v.title}</h3>
                </div>
                <div className="text-[10px] font-mono text-muted-foreground/80">
                  <span className="text-destructive/80">PAIN: </span>{v.pain}
                </div>
                <div className="text-[10px] font-mono text-muted-foreground/80">
                  <span className="text-primary">OBSCURA: </span>{v.fit}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Differentiation matrix */}
        <section>
          <h2 className="font-display text-xl text-foreground mb-6">Why We Win</h2>
          <div className="glass-panel rounded-sm overflow-x-auto">
            <table className="w-full text-[10px] font-mono">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left p-3 text-muted-foreground tracking-[0.15em] uppercase">Project</th>
                  <th className="p-3 text-muted-foreground tracking-[0.15em] uppercase">Encrypted $</th>
                  <th className="p-3 text-muted-foreground tracking-[0.15em] uppercase">Recurring</th>
                  <th className="p-3 text-muted-foreground tracking-[0.15em] uppercase">Stealth</th>
                  <th className="p-3 text-muted-foreground tracking-[0.15em] uppercase">Cross-Chain</th>
                  <th className="p-3 text-muted-foreground tracking-[0.15em] uppercase">Insurance</th>
                  <th className="p-3 text-muted-foreground tracking-[0.15em] uppercase">Real (no mocks)</th>
                </tr>
              </thead>
              <tbody>
                {matrix.map((row) => (
                  <tr key={row.name} className={row.name.startsWith("Obscura") ? "bg-primary/5" : ""}>
                    <td className="p-3 text-foreground">{row.name}</td>
                    <td className="p-3 text-center">{cell(row.encryptedAmount)}</td>
                    <td className="p-3 text-center">{cell(row.recurringStream)}</td>
                    <td className="p-3 text-center">{cell(row.stealth)}</td>
                    <td className="p-3 text-center">{cell(row.crossChain)}</td>
                    <td className="p-3 text-center">{cell(row.insurance)}</td>
                    <td className="p-3 text-center">{row.real ? cell(true) : <MinusCircle className="w-4 h-4 text-yellow-500/60 inline" />}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* CTA */}
        <section className="glass-panel rounded-sm p-8 text-center space-y-4 border-glow">
          <h2 className="font-display text-2xl text-foreground">Talk to a real user</h2>
          <p className="text-sm font-body text-muted-foreground max-w-xl mx-auto">
            Are you running a DAO, agency, or remote payroll desk paying in stablecoins? We&apos;re running
            5 design-partner pilots in Wave 2 — encrypted streams, free for the first quarter.
          </p>
          <div className="flex justify-center gap-3">
            <a
              href="https://cal.com/obscura/pmf"
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3 text-xs tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 inline-flex items-center gap-2"
            >
              Book a 20-min call <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <Link
              to="/pay"
              className="px-6 py-3 text-xs tracking-[0.2em] uppercase font-mono border border-primary/40 text-primary rounded-sm hover:bg-primary/5"
            >
              Try the App
            </Link>
          </div>
        </section>
      </div>

      <ObscuraFooter />
    </div>
  );
}
