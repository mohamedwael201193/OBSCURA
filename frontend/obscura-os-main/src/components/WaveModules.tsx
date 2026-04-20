import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { Shield, Vote, Server, Lock, Brain, Landmark } from "lucide-react";

const products = [
  {
    icon: Shield,
    name: "ObscuraPay",
    tagline: "Encrypted Financial Infrastructure",
    path: "/pay",
    status: "live",
    features: [
      "Confidential cUSDC transfers with FHE-encrypted amounts",
      "Encrypted escrows with silent failure pattern",
      "Payroll streams to stealth recipient addresses",
      "Cross-chain funding via Circle CCTP bridge",
      "Payroll insurance with on-chain dispute resolution",
      "Stealth addresses via ERC-5564 / ECDH",
    ],
  },
  {
    icon: Vote,
    name: "ObscuraVote",
    tagline: "Coercion-Resistant Governance",
    path: "/vote",
    status: "live",
    features: [
      "Encrypted ballots — votes hidden until tally finalized",
      "FHE.add() tallies without revealing individual choices",
      "Multi-option proposals with configurable deadlines",
      "Anti-coercion revote before deadline",
      "Token-gated proposal creation",
      "Full voting history with cryptographic verification",
    ],
  },
  {
    icon: Landmark,
    name: "ObscuraVault",
    tagline: "MEV-Protected DeFi",
    path: undefined,
    status: "upcoming",
    features: [
      "Sealed-bid auctions — FHE.gt() selects winner privately",
      "MEV-protected yield vaults with encrypted positions",
      "Hidden deposit/withdrawal amounts on-chain",
      "FHE.select() routes tokens without revealing bids",
      "Vault positions feed governance weight",
      "Zero front-running, zero MEV extraction",
    ],
  },
  {
    icon: Lock,
    name: "ObscuraTrust",
    tagline: "Selective Disclosure & Compliance",
    path: undefined,
    status: "upcoming",
    features: [
      "Encrypted identity attributes (ebool, euint8 ciphertexts)",
      "FHE.gte() validates compliance without revealing data",
      "Selective disclosure via FHE.allow(data, auditor)",
      "Time-scoped audit signatures for regulators",
      "Zero persistent exposure to third parties",
      "Institutional-grade privacy with cryptographic proofs",
    ],
  },
  {
    icon: Brain,
    name: "ObscuraMind",
    tagline: "Privacy-Preserving AI Inference",
    path: undefined,
    status: "upcoming",
    features: [
      "ML inference on fully encrypted data",
      "FHE.mul() computes weighted dot products on ciphertext",
      "Cross-module data — Pay, Vault, Vote feed models",
      "Encrypted credit scoring for under-collateralized lending",
      "FHE.square() for polynomial feature computation",
      "Model weights as euint64 — no plaintext exposure",
    ],
  },
];

const WaveModules = () => {
  return (
    <section className="relative py-32 px-8">
      <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none" />

      <div className="max-w-[1400px] mx-auto relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <span className="text-xs tracking-[0.2em] uppercase text-primary text-glow-sm">
            Five Encrypted Modules
          </span>
          <h2 className="font-display text-3xl md:text-4xl mt-3 text-foreground tracking-tight">
            What We <span className="text-primary text-glow">Build</span>
          </h2>
          <p className="text-base text-muted-foreground mt-4 max-w-xl">
            A complete privacy operating system — encrypted payments, governance, DeFi, compliance, and AI — all powered by Fully Homomorphic Encryption on Arbitrum.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product, i) => {
            const isLive = product.status === "live";
            const card = (
              <motion.div
                key={product.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.6 }}
                className={`glass-card p-6 flex flex-col ${!isLive ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between mb-5">
                  <div className={`w-12 h-12 flex items-center justify-center border rounded-lg ${isLive ? "border-primary/20 bg-primary/[0.06]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                    <product.icon className={`w-5 h-5 ${isLive ? "text-primary" : "text-muted-foreground/50"}`} />
                  </div>
                  <span className={`text-[10px] tracking-[0.15em] uppercase px-2.5 py-1 rounded-md ${isLive ? "text-primary bg-primary/10 border border-primary/20" : "text-muted-foreground/40 bg-white/[0.03] border border-white/[0.06]"}`}>
                    {isLive ? "● Live" : "Coming Soon"}
                  </span>
                </div>

                <h3 className="font-display text-lg tracking-wide text-foreground mb-1">
                  {product.name}
                </h3>
                <p className="text-sm text-muted-foreground mb-5">
                  {product.tagline}
                </p>

                <ul className="space-y-2.5 flex-1 mb-6">
                  {product.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <span className={`text-xs mt-1 shrink-0 ${isLive ? "text-primary" : "text-muted-foreground/30"}`}>◆</span>
                      <span className="text-sm text-muted-foreground leading-snug">
                        {feat}
                      </span>
                    </li>
                  ))}
                </ul>

                {isLive ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="w-full py-2.5 text-sm font-medium border border-primary/30 text-primary hover:bg-primary/10 transition-all duration-300 rounded-md"
                  >
                    Launch {product.name}
                  </motion.button>
                ) : (
                  <div className="w-full py-2.5 text-sm font-medium border border-white/[0.06] text-muted-foreground/30 text-center rounded-md">
                    In Development
                  </div>
                )}
              </motion.div>
            );

            return isLive && product.path ? (
              <Link key={product.name} to={product.path}>{card}</Link>
            ) : (
              <div key={product.name}>{card}</div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default WaveModules;
