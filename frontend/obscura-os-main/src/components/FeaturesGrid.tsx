import { motion } from "framer-motion";
import { Shield, Eye, Lock, Zap, Layers, Globe } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "FHE-Powered ACL",
    description: "Role-based access control using FHE.allow(), FHE.allowThis(), and FHE.allowTransient() — cryptographic permissions, not trust.",
    tag: "CORE",
  },
  {
    icon: Eye,
    title: "\"What's Private?\" Panel",
    description: "Every page shows ciphertext handle IDs, ACL permissions, and who can decrypt what. Encryption made tangible.",
    tag: "UX",
  },
  {
    icon: Lock,
    title: "EIP-712 Permits",
    description: "Sign-to-decrypt authorization. Employees sign a permit to reveal their salary. Auditors sign to see aggregate totals only.",
    tag: "AUTH",
  },
  {
    icon: Zap,
    title: "Async Stepper UX",
    description: "Visual progress for FHE operations: Encrypting → Computing on-chain → Ready to decrypt. Eliminates latency confusion.",
    tag: "UX",
  },
  {
    icon: Layers,
    title: "Cross-Module Composability",
    description: "Pay feeds Vote weight. Vault positions feed governance. Trust gates premium features. Mind scores everything. All on $OBS.",
    tag: "ARCH",
  },
  {
    icon: Globe,
    title: "Multi-Chain Deploy",
    description: "Primary on Arbitrum Sepolia, expanding to Base Sepolia in Wave 3+. Production-ready multi-chain infrastructure.",
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
            Built for <span className="text-primary text-glow">Institutional</span> Privacy
          </h2>
          <p className="text-sm font-body text-muted-foreground mt-4 max-w-lg mx-auto">
            Every component engineered to make encryption visible, composable, and enterprise-ready.
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
