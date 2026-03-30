import { motion } from "framer-motion";
import { Shield, Eye, Lock, Zap, Layers, Globe } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "Silent Failure Pattern",
    description: "Unauthorized escrow redemptions return zero tokens via FHE.select() — no revert, no error, completely indistinguishable from success. Privacy through indistinguishability.",
    tag: "CORE",
  },
  {
    icon: Eye,
    title: "\"What's Private?\" Panel",
    description: "Live ciphertext handle IDs, ACL permission states, and per-role decryption access — across every encrypted value on the platform. Encryption made tangible.",
    tag: "UX",
  },
  {
    icon: Lock,
    title: "EIP-712 Permit Decryption",
    description: "Employees sign cryptographic permits to decrypt their own salary. Auditors sign scoped permits for aggregate totals only. No trust — only math.",
    tag: "AUTH",
  },
  {
    icon: Zap,
    title: "Async FHE Stepper",
    description: "Visual progress for CoFHE operations: Encrypting → Computing → Ready. Users see exactly where their transaction is in the FHE pipeline — no latency confusion.",
    tag: "UX",
  },
  {
    icon: Layers,
    title: "Composable Privacy Stack",
    description: "Pay informs Vote weight. Vault positions feed Mind credit scoring. Trust gates premium access. Each module a building block — all powered by $OBS.",
    tag: "ARCH",
  },
  {
    icon: Globe,
    title: "4 Contracts · 1 Dashboard",
    description: "ObscuraToken, ObscuraPay, ObscuraEscrow, and ObscuraConditionResolver — all live on Arbitrum Sepolia, unified under one dark-mode React frontend.",
    tag: "INFRA",
  },
];

const FeaturesGrid = () => {
  return (
    <section className="relative py-32 px-8 border-t border-border/30">
      <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none" />
      <div className="max-w-[1400px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-mono text-glow-sm">
            Infrastructure
          </span>
          <h2 className="font-display text-3xl md:text-4xl mt-3 text-foreground tracking-tight">
            Encryption That <span className="text-primary text-glow">Means Business</span>
          </h2>
          <p className="text-sm font-body text-muted-foreground mt-4 max-w-lg mx-auto">
            Every component engineered to make homomorphic encryption visible, composable, and enterprise-grade — from payroll to AI inference.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="glass-panel rounded-sm p-6 group hover:border-primary/30 transition-all duration-500"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 flex items-center justify-center border border-border/50 rounded-sm bg-secondary/30 group-hover:border-primary/30 transition-colors">
                  <feat.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[8px] tracking-[0.2em] uppercase font-mono text-muted-foreground/50 bg-secondary/50 px-2 py-0.5 rounded-sm">
                  {feat.tag}
                </span>
              </div>
              <h3 className="font-display text-sm tracking-wider text-foreground mb-2">
                {feat.title}
              </h3>
              <p className="text-xs font-body text-muted-foreground leading-relaxed">
                {feat.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesGrid;
