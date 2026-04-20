import { motion } from "framer-motion";
import { Shield, Eye, Lock, Zap, Layers, Globe, Vote, Brain } from "lucide-react";

const features = [
  {
    icon: Shield,
    title: "End-to-End Encryption",
    description: "Every on-chain value is an FHE ciphertext — amounts, addresses, balances. Arbiscan shows nothing. Not by obfuscation, by mathematics.",
    tag: "CORE",
  },
  {
    icon: Eye,
    title: "Stealth Payments",
    description: "Recipients generate one-time addresses via ECDH. Senders publish to the stealth registry — only the intended recipient can detect and claim funds.",
    tag: "PRIVACY",
  },
  {
    icon: Vote,
    title: "Encrypted Governance",
    description: "Ballots encrypted on submission, tallied via FHE.add() without revealing choices. Anti-coercion revote until deadline. Aggregate results only after finalization.",
    tag: "VOTE",
  },
  {
    icon: Zap,
    title: "Cross-Chain Privacy",
    description: "Bridge USDC from Ethereum or Base via Circle CCTP, then wrap into encrypted cUSDC on Arbitrum. Private liquidity from any chain.",
    tag: "BRIDGE",
  },
  {
    icon: Layers,
    title: "Payroll Insurance",
    description: "Underwriters stake cUSDC into coverage pools. Missed payroll triggers on-chain disputes with encrypted evidence. Automatic payouts to covered employees.",
    tag: "INSURANCE",
  },
  {
    icon: Lock,
    title: "Selective Disclosure",
    description: "EIP-712 permits grant per-value decrypt access. Auditors see only aggregates. Regulators get time-scoped views. Zero persistent exposure.",
    tag: "AUTH",
  },
  {
    icon: Globe,
    title: "MEV-Protected DeFi",
    description: "Coming in Wave 3 — sealed-bid auctions and encrypted yield vaults. FHE.gt() selects winners privately. Zero front-running, zero MEV extraction.",
    tag: "VAULT",
  },
  {
    icon: Brain,
    title: "Privacy-Preserving AI",
    description: "Coming in Wave 5 — ML inference on encrypted data. Credit scoring from Pay history, Vault positions, and Vote activity. Model weights never leave ciphertext.",
    tag: "MIND",
  },
];

const FeaturesGrid = () => {
  return (
    <section className="relative py-32 px-8 border-t border-white/[0.04]">
      <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none" />
      <div className="max-w-[1400px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mb-16 text-center"
        >
          <span className="text-xs tracking-[0.2em] uppercase text-primary text-glow-sm">
            Capabilities
          </span>
          <h2 className="font-display text-3xl md:text-4xl mt-3 text-foreground tracking-tight">
            Privacy That <span className="text-primary text-glow">Scales</span>
          </h2>
          <p className="text-base text-muted-foreground mt-4 max-w-lg mx-auto">
            Eight core capabilities — from encrypted transfers to privacy-preserving AI — engineered to make homomorphic encryption practical at scale.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feat, i) => (
            <motion.div
              key={feat.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4, transition: { duration: 0.25 } }}
              className="glass-card p-6 group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 flex items-center justify-center border border-white/[0.08] rounded-lg bg-white/[0.03] group-hover:border-primary/30 transition-colors">
                  <feat.icon className="w-4 h-4 text-primary" />
                </div>
                <span className="text-[11px] tracking-[0.15em] uppercase text-muted-foreground/50 bg-white/[0.03] px-2.5 py-1 rounded-md">
                  {feat.tag}
                </span>
              </div>
              <h3 className="font-display text-base tracking-wide text-foreground mb-2">
                {feat.title}
              </h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
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
