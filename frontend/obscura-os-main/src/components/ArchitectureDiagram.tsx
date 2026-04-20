import { motion } from "framer-motion";
import { ArrowRight, Shield, Vote, Eye, Landmark, Lock, Brain } from "lucide-react";

const flows = [
  {
    icon: Shield,
    title: "Payment Flow",
    color: "text-primary",
    bg: "bg-primary/5",
    borderColor: "border-primary/20",
    steps: [
      { label: "Wrap USDC", desc: "Convert to encrypted cUSDC via FHERC-20" },
      { label: "FHE Encrypt", desc: "Client encrypts amount with cofhe SDK" },
      { label: "On-Chain Transfer", desc: "Ciphertext moves on Arbitrum — Arbiscan shows nothing" },
      { label: "Permit Decrypt", desc: "EIP-712 signature reveals amount to recipient only" },
    ],
  },
  {
    icon: Vote,
    title: "Voting Flow",
    color: "text-cyan-400",
    bg: "bg-cyan-400/5",
    borderColor: "border-cyan-400/20",
    steps: [
      { label: "Create Proposal", desc: "Set options, deadline, and quorum" },
      { label: "Encrypt Vote", desc: "Choice hidden via FHE.asEuint64()" },
      { label: "Tally On-Chain", desc: "FHE.add() sums votes — no individual reveal" },
      { label: "Finalize Result", desc: "FHE.allowPublic() after deadline — aggregate only" },
    ],
  },
  {
    icon: Eye,
    title: "FHE Decrypt Lifecycle",
    color: "text-amber-400",
    bg: "bg-amber-400/5",
    borderColor: "border-amber-400/20",
    steps: [
      { label: "Client Encrypt", desc: "cofhe.encrypt() on browser via SDK" },
      { label: "CoFHE Process", desc: "Coprocessor computes on ciphertext handles" },
      { label: "ACL Check", desc: "Contract verifies FHE.allow() permissions" },
      { label: "Permit → Reveal", desc: "EIP-712 typed signature decrypts value" },
    ],
  },
];

const stats = [
  { label: "FHE Operations", value: "19", sub: "Unique ops across all modules" },
  { label: "Smart Contracts", value: "12+", sub: "Deployed on Arbitrum Sepolia" },
  { label: "Encrypted Types", value: "4", sub: "euint64 · ebool · eaddress · euint8" },
  { label: "Planned Modules", value: "5", sub: "Pay · Vote · Vault · Trust · Mind" },
];

const ArchitectureDiagram = () => {
  return (
    <section className="relative py-32 px-8 border-t border-white/[0.04] overflow-hidden">
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
          <span className="text-xs tracking-[0.2em] uppercase text-primary text-glow-sm">
            How It Works
          </span>
          <h2 className="font-display text-3xl md:text-4xl mt-3 text-foreground tracking-tight">
            Encryption <span className="text-primary text-glow">Flows</span>
          </h2>
          <p className="text-base text-muted-foreground mt-4 max-w-xl">
            Every operation follows a consistent pattern: encrypt on the client, compute on ciphertext, decrypt only for authorized parties.
          </p>
        </motion.div>

        {/* Flow diagrams */}
        <div className="space-y-8">
          {flows.map((flow, fi) => (
            <motion.div
              key={flow.title}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: fi * 0.15, duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className={`glass-panel rounded-lg p-6 border ${flow.borderColor} hover:border-opacity-50 transition-all duration-500`}
            >
              <div className="flex items-center gap-3 mb-6">
                <motion.div 
                  className={`w-9 h-9 rounded-lg flex items-center justify-center border border-white/[0.08] ${flow.bg} ${flow.color}`}
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: "spring", stiffness: 400 }}
                >
                  <flow.icon className="w-4 h-4" />
                </motion.div>
                <h3 className="font-display text-base tracking-wide text-foreground">
                  {flow.title}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {flow.steps.map((step, si) => (
                  <motion.div 
                    key={step.label} 
                    className="flex items-center gap-3"
                    initial={{ opacity: 0, x: -20 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: fi * 0.15 + si * 0.12, duration: 0.5 }}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <motion.span 
                          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium border ${flow.borderColor} ${flow.bg} ${flow.color}`}
                          initial={{ scale: 0 }}
                          whileInView={{ scale: 1 }}
                          viewport={{ once: true }}
                          transition={{ delay: fi * 0.15 + si * 0.15, type: "spring", stiffness: 500 }}
                        >
                          {si + 1}
                        </motion.span>
                        <span className="text-sm font-medium text-foreground">
                          {step.label}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground ml-8">
                        {step.desc}
                      </p>
                    </div>
                    {si < flow.steps.length - 1 && (
                      <motion.div
                        initial={{ scaleX: 0 }}
                        whileInView={{ scaleX: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: fi * 0.15 + si * 0.18, duration: 0.6 }}
                        className="hidden md:flex items-center shrink-0 origin-left"
                      >
                        <div className={`w-6 h-px ${flow.color} opacity-30`} />
                        <ArrowRight className={`w-3.5 h-3.5 ${flow.color} opacity-40`} />
                      </motion.div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 + i * 0.1, type: "spring", stiffness: 300 }}
              whileHover={{ scale: 1.05, borderColor: "hsl(var(--primary) / 0.3)" }}
              className="glass-panel rounded-lg p-5 text-center group hover:border-primary/20 transition-all cursor-default"
            >
              <motion.div 
                className="font-display text-2xl text-primary text-glow mb-1"
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.6 + i * 0.1 }}
              >
                {stat.value}
              </motion.div>
              <div className="text-xs tracking-wide uppercase text-foreground mb-0.5">{stat.label}</div>
              <div className="text-xs text-muted-foreground">{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ArchitectureDiagram;
