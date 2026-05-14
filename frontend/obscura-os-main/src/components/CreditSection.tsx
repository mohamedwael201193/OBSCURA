/**
 * CreditSection — landing page section showcasing ObscuraCredit Wave 4.
 * Animated FHE lending-flow SVG + feature grid.
 */
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock, TrendingUp, Gavel, BarChart2, RefreshCw, Shield, ArrowRight, Landmark } from "lucide-react";

const FLOW_NODES = [
  { id: "client",  label: "Client",       sub: "cofhejs encrypt",  x: 0,   y: 50 },
  { id: "market",  label: "Credit Market",sub: "euint64 handle",   x: 200, y: 50 },
  { id: "cofhe",   label: "CoFHE",        sub: "compute on cipher",x: 400, y: 50 },
  { id: "settle",  label: "Settle",       sub: "awaitCoFHESettle", x: 600, y: 50 },
  { id: "reveal",  label: "Reveal",       sub: "EIP-712 permit",   x: 800, y: 50 },
];

const ARROWS = [
  { from: 0, to: 1, label: "InEuint64" },
  { from: 1, to: 2, label: "euint64 handle" },
  { from: 2, to: 3, label: "async settle" },
  { from: 3, to: 4, label: "permit decrypt" },
];

const STATS = [
  { value: "4", label: "Markets" },
  { value: "2", label: "Vaults" },
  { value: "18", label: "Contracts" },
  { value: "9", label: "CreditPage Tabs" },
];

const FEATURES = [
  {
    icon: Lock,
    title: "Encrypted Positions",
    body: "Per-user euint64 collateral + debt. Nobody — including the deployer — reads your position without an EIP-712 permit.",
    accent: "from-cyan-500/20 to-cyan-500/5",
    border: "border-cyan-500/20",
    iconColor: "text-cyan-400",
  },
  {
    icon: Shield,
    title: "Borrow Under Stealth",
    body: "eaddress destination in every borrow. Receiver identity is an on-chain ciphertext — zero calldata exposure.",
    accent: "from-violet-500/20 to-violet-500/5",
    border: "border-violet-500/20",
    iconColor: "text-violet-400",
  },
  {
    icon: Gavel,
    title: "Sealed Auctions",
    body: "Liquidation bids are FHE-encrypted until deadline. No MEV frontrunning. Winning amount reveals only at settlement.",
    accent: "from-amber-500/20 to-amber-500/5",
    border: "border-amber-500/20",
    iconColor: "text-amber-400",
  },
  {
    icon: BarChart2,
    title: "Credit Score",
    body: "Aggregates Pay/Vote/AddressBook on-chain activity into a euint64 score. Attest to a market for better terms.",
    accent: "from-emerald-500/20 to-emerald-500/5",
    border: "border-emerald-500/20",
    iconColor: "text-emerald-400",
  },
  {
    icon: RefreshCw,
    title: "Auto-Hooks",
    body: "PayStream auto-repays your debt each cycle. InsuranceSubscription auto-tops collateral. Set-and-forget privacy.",
    accent: "from-sky-500/20 to-sky-500/5",
    border: "border-sky-500/20",
    iconColor: "text-sky-400",
  },
  {
    icon: TrendingUp,
    title: "Vaults — Curated Risk",
    body: "Conservative + Aggressive vaults fan liquidity to markets. Vault shares encrypted — only you know your deposit.",
    accent: "from-pink-500/20 to-pink-500/5",
    border: "border-pink-500/20",
    iconColor: "text-pink-400",
  },
];

const nodeVariant = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: (i: number) => ({ opacity: 1, scale: 1, transition: { delay: i * 0.15, duration: 0.5, type: "spring" } }),
};

const arrowVariant = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: (i: number) => ({ pathLength: 1, opacity: 1, transition: { delay: i * 0.15 + 0.3, duration: 0.6 } }),
};

const NODE_W = 110;
const NODE_H = 62;
const SVG_W = 940;
const SVG_H = 160;

const CreditSection = () => {
  return (
    <section className="relative py-32 px-8 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[300px] bg-violet-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 grid-overlay opacity-[0.06]" />
      </div>

      <div className="max-w-[1400px] mx-auto relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="mb-14"
        >
          <div className="flex items-center gap-2 mb-3">
            <Landmark className="w-4 h-4 text-violet-400" />
            <span className="text-xs tracking-[0.22em] uppercase text-violet-400 font-mono">Wave 4 — Now Live</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl text-foreground tracking-tight">
            Obscura<span className="text-violet-400">Credit</span>
          </h2>
          <p className="text-base text-muted-foreground mt-3 max-w-2xl">
            The first confidential lending protocol on Fhenix CoFHE. Morpho-inspired 2-layer model — encrypted collateral,
            debt, vault shares. Borrow positions are <span className="text-violet-300 font-mono text-sm">euint64</span> ciphertexts.
            No plaintext on Arbiscan. Zero admin keys after deploy.
          </p>
        </motion.div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="grid grid-cols-4 gap-4 mb-16"
        >
          {STATS.map((s) => (
            <div key={s.label} className="glass-card p-5 text-center">
              <div className="font-display text-3xl text-violet-300">{s.value}</div>
              <div className="text-xs text-muted-foreground mt-1 tracking-wide uppercase">{s.label}</div>
            </div>
          ))}
        </motion.div>

        {/* FHE Lending Flow SVG */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mb-16 glass-card p-6 overflow-x-auto"
        >
          <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-mono mb-4">
            FHE Lending Flow — Encrypt → Submit → Compute → Settle → Reveal
          </div>
          <svg
            viewBox={`0 0 ${SVG_W} ${SVG_H}`}
            className="w-full min-w-[640px]"
            style={{ height: SVG_H }}
          >
            {/* Arrows */}
            {ARROWS.map((a, i) => {
              const fromNode = FLOW_NODES[a.from];
              const toNode = FLOW_NODES[a.to];
              const x1 = fromNode.x + NODE_W;
              const x2 = toNode.x;
              const y = fromNode.y + NODE_H / 2;
              const midX = (x1 + x2) / 2;
              return (
                <g key={i}>
                  <motion.path
                    d={`M ${x1} ${y} L ${x2} ${y}`}
                    stroke="rgba(139,92,246,0.35)"
                    strokeWidth="1.5"
                    fill="none"
                    strokeDasharray="4 3"
                    custom={i}
                    variants={arrowVariant}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                  />
                  {/* Arrowhead */}
                  <motion.polygon
                    points={`${x2},${y} ${x2 - 8},${y - 4} ${x2 - 8},${y + 4}`}
                    fill="rgba(139,92,246,0.5)"
                    custom={i}
                    variants={arrowVariant}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true }}
                  />
                  {/* Edge label */}
                  <text
                    x={midX}
                    y={y - 10}
                    textAnchor="middle"
                    fontSize="9"
                    fill="rgba(255,255,255,0.28)"
                    fontFamily="monospace"
                  >
                    {a.label}
                  </text>
                </g>
              );
            })}

            {/* Nodes */}
            {FLOW_NODES.map((n, i) => (
              <motion.g
                key={n.id}
                custom={i}
                variants={nodeVariant}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
              >
                {/* Node box */}
                <rect
                  x={n.x}
                  y={n.y}
                  width={NODE_W}
                  height={NODE_H}
                  rx={8}
                  fill="rgba(139,92,246,0.08)"
                  stroke="rgba(139,92,246,0.3)"
                  strokeWidth="1"
                />
                {/* Pulsing dot */}
                <circle cx={n.x + 10} cy={n.y + 11} r={3} fill="rgba(139,92,246,0.7)">
                  <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite" begin={`${i * 0.4}s`} />
                </circle>
                {/* Label */}
                <text
                  x={n.x + NODE_W / 2}
                  y={n.y + 28}
                  textAnchor="middle"
                  fontSize="12"
                  fontWeight="600"
                  fill="rgba(255,255,255,0.85)"
                  fontFamily="sans-serif"
                >
                  {n.label}
                </text>
                {/* Sublabel */}
                <text
                  x={n.x + NODE_W / 2}
                  y={n.y + 44}
                  textAnchor="middle"
                  fontSize="9"
                  fill="rgba(139,92,246,0.7)"
                  fontFamily="monospace"
                >
                  {n.sub}
                </text>
              </motion.g>
            ))}
          </svg>
        </motion.div>

        {/* 2-Layer Architecture */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="mb-16 glass-card p-6"
        >
          <div className="text-[10px] tracking-[0.2em] uppercase text-white/40 font-mono mb-5">
            2-Layer Architecture
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="rounded-xl border border-violet-500/20 bg-violet-500/5 p-5">
              <div className="text-xs tracking-widest uppercase text-violet-400 font-mono mb-3">Layer 1 — Markets</div>
              <p className="text-sm text-white/60 mb-3">Isolated lending pairs. Each market is one (collateral, loan) asset combo with its own LLTV, IRM, and oracle. Positions are <code className="text-violet-300 text-xs">euint64</code> end-to-end.</p>
              <div className="space-y-1.5">
                {["cUSDC↔cUSDC · 77% LLTV","cUSDC↔cUSDC · 86% LLTV","cOBS↔cUSDC","cWETH↔cUSDC"].map(m => (
                  <div key={m} className="flex items-center gap-2 text-xs text-white/50 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-violet-400/60 shrink-0" />
                    {m}
                  </div>
                ))}
              </div>
            </div>
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
              <div className="text-xs tracking-widest uppercase text-cyan-400 font-mono mb-3">Layer 2 — Vaults</div>
              <p className="text-sm text-white/60 mb-3">Curated risk baskets that fan liquidity to underlying markets. Per-LP shares are encrypted — only you know your deposit size.</p>
              <div className="space-y-1.5">
                {["Conservative Vault — single market","Aggressive Vault — multi-market"].map(v => (
                  <div key={v} className="flex items-center gap-2 text-xs text-white/50 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60 shrink-0" />
                    {v}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 mb-12">
          {FEATURES.map((f, i) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.55 }}
                className={`glass-card p-5 border ${f.border} bg-gradient-to-b ${f.accent}`}
              >
                <Icon className={`w-5 h-5 ${f.iconColor} mb-3`} />
                <h3 className="text-sm font-semibold text-white/90 mb-1.5">{f.title}</h3>
                <p className="text-xs text-white/50 leading-relaxed">{f.body}</p>
              </motion.div>
            );
          })}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            to="/credit"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-violet-600/20 border border-violet-500/40 text-violet-200 hover:bg-violet-600/30 transition-colors font-medium text-sm"
          >
            Open ObscuraCredit <ArrowRight className="w-4 h-4" />
          </Link>
          <span className="text-xs text-white/30 font-mono">43 contracts · Arbitrum Sepolia</span>
        </motion.div>
      </div>
    </section>
  );
};

export default CreditSection;
