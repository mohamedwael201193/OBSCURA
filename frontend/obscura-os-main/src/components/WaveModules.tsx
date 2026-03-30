import { motion } from "framer-motion";

const waves = [
  {
    wave: 1,
    name: "ObscuraPay",
    category: "Payments",
    status: "ACTIVE",
    fheOps: "add, eq, gte, select, asEaddress",
    description: "Complete encrypted payment platform. 4 contracts live — payroll, P2P transfers, encrypted escrow engine with silent failure, conditional release. Daily $OBS faucet. Arbiscan shows nothing.",
    active: true,
  },
  {
    wave: 2,
    name: "ObscuraVote",
    category: "Governance",
    status: "WAVE 2",
    fheOps: "add, allowPublic",
    description: "Coercion-resistant on-chain governance. Votes encrypted — FHE.add() tallies without revealing individual choices. Anti-coercion revote window. $OBS weighted voting power.",
    active: false,
  },
  {
    wave: 3,
    name: "ObscuraVault",
    category: "DeFi",
    status: "WAVE 3",
    fheOps: "gt, gte, select, add, sub",
    description: "Sealed-bid auctions and MEV-protected yield vaults. FHE.gt() selects auction winners without revealing losing bids. Zero front-running. Zero MEV extraction.",
    active: false,
  },
  {
    wave: 4,
    name: "ObscuraTrust",
    category: "RWA / Compliance",
    status: "WAVE 4",
    fheOps: "eq, gte, allow, allowTransient",
    description: "Encrypted identity and institutional compliance. FHE.gte() validates KYC thresholds without revealing data. Selective disclosure via FHE.allow() scopes regulatory access cryptographically.",
    active: false,
  },
  {
    wave: 5,
    name: "ObscuraMind",
    category: "AI Inference",
    status: "WAVE 5",
    fheOps: "mul, add, div, gte, square",
    description: "Privacy-preserving ML inference on encrypted data. Model weights as euint64 — FHE.mul() computes dot products on ciphertext. Outputs encrypted credit scores for under-collateralized lending.",
    active: false,
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
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-mono text-glow-sm">
            Architecture
          </span>
          <h2 className="font-display text-3xl md:text-4xl mt-3 text-foreground tracking-tight">
            Five Encrypted
            <span className="text-primary text-glow"> Modules</span>
          </h2>
          <p className="text-sm font-body text-muted-foreground mt-4 max-w-xl">
            Each module adds a new encrypted capability. All composable — payment data feeds governance, vault positions inform AI scoring, compliance gates premium access.
          </p>
        </motion.div>

        <div className="grid gap-3">
          {waves.map((wave, i) => (
            <motion.div
              key={wave.name}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              className={`glass-panel rounded-sm p-5 flex items-center justify-between group hover:border-primary/30 transition-all duration-500 ${
                wave.active ? "border-primary/20 border-glow" : ""
              }`}
            >
              <div className="flex items-center gap-6">
                <span
                  className={`font-display text-2xl ${
                    wave.active
                      ? "text-primary text-glow"
                      : "text-muted-foreground/30"
                  }`}
                >
                  {String(wave.wave).padStart(2, "0")}
                </span>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-display text-sm tracking-wider text-foreground">
                      {wave.name}
                    </span>
                    <span
                      className={`text-[9px] tracking-[0.2em] uppercase font-mono px-2 py-0.5 rounded-sm ${
                        wave.active
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {wave.status}
                    </span>
                  </div>
                  <p className="text-xs font-body text-muted-foreground mt-1">
                    {wave.description}
                  </p>
                </div>
              </div>

              <div className="hidden md:flex items-center gap-8">
                <div className="text-right">
                  <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/50 font-mono block">
                    FHE OPS
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {wave.fheOps}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/50 font-mono block">
                    Category
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground">
                    {wave.category}
                  </span>
                </div>
                {!wave.active && (
                  <span className="text-muted-foreground/20 text-sm">🔒</span>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WaveModules;
