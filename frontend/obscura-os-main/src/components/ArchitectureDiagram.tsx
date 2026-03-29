import { motion } from "framer-motion";
import { Shield, Vote, Vault, Fingerprint, Brain, Layers, ArrowDown } from "lucide-react";

const waves = [
  { icon: Shield, name: "ObscuraPay", category: "Payments", wave: 1, status: "ACTIVE", difficulty: "EASIEST", fhe: "add, sub, allow" },
  { icon: Vote, name: "ObscuraVote", category: "Governance", wave: 2, status: "NEXT", difficulty: "EASY", fhe: "add, allowPublic" },
  { icon: Vault, name: "ObscuraVault", category: "DeFi", wave: 3, status: "30 DAYS", difficulty: "MEDIUM", fhe: "gt, gte, select" },
  { icon: Fingerprint, name: "ObscuraTrust", category: "RWA", wave: 4, status: "PLANNED", difficulty: "HARD", fhe: "eq, allow, allowTransient" },
  { icon: Brain, name: "ObscuraMind", category: "AI", wave: 5, status: "PLANNED", difficulty: "HARDEST", fhe: "mul, div, square" },
];

const infra = [
  { label: "$OBS FHERC20", desc: "Encrypted token" },
  { label: "ObscuraPermissions", desc: "ACL helper" },
  { label: "Privacy Center", desc: "Permit management" },
  { label: "CoFHE / FHE.sol", desc: "Coprocessor SDK" },
];

const ArchitectureDiagram = () => {
  return (
    <section className="relative py-32 px-8 border-t border-border/30 overflow-hidden">
      <div className="absolute inset-0 grid-overlay opacity-5 pointer-events-none" />
      <div
        className="absolute bottom-0 left-0 w-[800px] h-[400px] pointer-events-none"
        style={{
          background: "radial-gradient(circle at 20% 80%, rgba(34, 197, 94, 0.05) 0%, transparent 50%)",
        }}
      />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-mono text-glow-sm">
            System Map
          </span>
          <h2 className="font-display text-3xl md:text-4xl mt-3 text-foreground tracking-tight">
            Architecture <span className="text-primary text-glow">Overview</span>
          </h2>
        </motion.div>

        {/* Dashboard layer */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="relative"
        >
          {/* Top bar — Dashboard */}
          <div className="glass-panel rounded-t-sm border-b-0 p-5 border-glow">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                <span className="font-display text-sm tracking-[0.2em] text-primary text-glow-sm">
                  OBSCURA DASHBOARD
                </span>
              </div>
              <div className="flex items-center gap-4">
                {["Premium Dark UI", "\"What's Private?\" Panel", "Privacy Center"].map((label) => (
                  <span key={label} className="text-[9px] font-mono text-muted-foreground/60 hidden md:inline">
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Wave modules — the 5 columns */}
          <div className="grid grid-cols-2 md:grid-cols-5 border-x border-border/50">
            {waves.map((w, i) => (
              <motion.div
                key={w.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className={`relative p-5 border-r border-b border-border/50 last:border-r-0 group transition-all duration-500 ${
                  w.wave === 1
                    ? "bg-primary/[0.03]"
                    : "hover:bg-secondary/20"
                }`}
              >
                {/* Wave number badge */}
                <div className={`absolute top-3 right-3 text-[8px] font-mono tracking-wider px-1.5 py-0.5 rounded-sm ${
                  w.wave === 1
                    ? "bg-primary/15 text-primary border border-primary/20"
                    : "bg-secondary/50 text-muted-foreground/40"
                }`}>
                  W{w.wave}
                </div>

                {/* Icon */}
                <div className={`w-9 h-9 rounded-sm flex items-center justify-center mb-3 border transition-colors ${
                  w.wave === 1
                    ? "border-primary/30 bg-primary/10 text-primary"
                    : "border-border/40 bg-secondary/30 text-muted-foreground/40 group-hover:border-primary/20 group-hover:text-primary/60"
                }`}>
                  <w.icon className="w-4 h-4" />
                </div>

                {/* Name */}
                <div className={`font-display text-xs tracking-wider mb-1 ${
                  w.wave === 1 ? "text-primary text-glow-sm" : "text-foreground/70"
                }`}>
                  {w.name}
                </div>

                {/* Category */}
                <div className="text-[9px] font-mono text-muted-foreground/50 mb-3">
                  {w.category}
                </div>

                {/* Status + difficulty */}
                <div className="space-y-1.5">
                  <div className={`text-[8px] font-mono tracking-[0.15em] ${
                    w.wave === 1 ? "text-primary" : "text-muted-foreground/30"
                  }`}>
                    {w.status}
                  </div>
                  <div className="text-[8px] font-mono text-muted-foreground/25">
                    {w.difficulty}
                  </div>
                </div>

                {/* FHE ops */}
                <div className="mt-4 pt-3 border-t border-border/30">
                  <div className="text-[7px] tracking-[0.2em] uppercase text-muted-foreground/30 font-mono mb-1">FHE OPS</div>
                  <div className="text-[9px] font-mono text-muted-foreground/50 leading-relaxed">{w.fhe}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Connection arrow */}
          <div className="flex justify-center py-2">
            <ArrowDown className="w-4 h-4 text-primary/30" />
          </div>

          {/* Shared infrastructure bar */}
          <div className="glass-panel border-b-0 rounded-none p-4">
            <div className="flex flex-wrap items-center justify-center gap-6">
              {infra.map((item, i) => (
                <motion.div
                  key={item.label}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.1 }}
                  className="flex items-center gap-2"
                >
                  <Layers className="w-3 h-3 text-primary/50" />
                  <span className="text-[10px] font-mono text-primary">{item.label}</span>
                  <span className="text-[8px] font-mono text-muted-foreground/40">— {item.desc}</span>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Connection arrow */}
          <div className="flex justify-center py-2">
            <ArrowDown className="w-4 h-4 text-primary/30" />
          </div>

          {/* Network layer */}
          <div className="glass-panel rounded-b-sm p-4 border-glow">
            <div className="flex items-center justify-center gap-6">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span className="text-[10px] font-mono text-primary text-glow-sm">Arbitrum Sepolia</span>
                <span className="text-[8px] font-mono text-muted-foreground/40">(primary)</span>
              </div>
              <span className="text-muted-foreground/20">·</span>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                <span className="text-[10px] font-mono text-muted-foreground/60">Base Sepolia</span>
                <span className="text-[8px] font-mono text-muted-foreground/30">(W3+)</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {[
            { label: "FHE Operations", value: "12+", sub: "Unique ops across waves" },
            { label: "Smart Contracts", value: "5", sub: "Core system contracts" },
            { label: "Waves", value: "5", sub: "Progressive deployment" },
            { label: "Grant Pool", value: "$48K", sub: "Total across all waves" },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.6 + i * 0.1 }}
              className="glass-panel rounded-sm p-5 text-center group hover:border-primary/20 transition-all"
            >
              <div className="font-display text-2xl text-primary text-glow mb-1">{stat.value}</div>
              <div className="text-[10px] tracking-[0.15em] uppercase font-mono text-foreground mb-0.5">{stat.label}</div>
              <div className="text-[9px] font-mono text-muted-foreground/50">{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArchitectureDiagram;
