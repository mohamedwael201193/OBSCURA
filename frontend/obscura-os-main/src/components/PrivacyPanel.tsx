import { motion } from "framer-motion";

const handles = [
  { id: "0x8f3a...c2d1", type: "euint64", owner: "cUSDC Balance", access: ["Contract", "Owner"] },
  { id: "0xa1e7...9f4b", type: "euint64", owner: "Escrow Amount", access: ["Contract", "Depositor", "Recipient"] },
  { id: "0x3c82...d5e0", type: "euint8", owner: "Vote Choice", access: ["Contract"] },
  { id: "0x7b19...e3a2", type: "eaddress", owner: "Stealth Addr", access: ["Contract", "Recipient"] },
];

const PrivacyPanel = () => {
  return (
    <section className="relative py-32 px-8 border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          {/* Left - Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-xs tracking-[0.2em] uppercase text-primary text-glow-sm">
              Transparency Layer
            </span>
            <h2 className="font-display text-3xl md:text-4xl mt-3 text-foreground tracking-tight mb-4">
              What's <span className="text-primary text-glow">Private</span>?
            </h2>
            <p className="text-base text-muted-foreground leading-relaxed mb-6">
              Every page shows exactly what's encrypted, who can decrypt it, and
              which ciphertext handles are in play. No black boxes — controlled
              revelation.
            </p>
            <div className="space-y-3">
              {["Ciphertext handle tracking per transaction", "ACL permission visibility for every value", "EIP-712 permit-based decryption", "Async FHE operation progress stepper"].map((feat, i) => (
                <motion.div
                  key={feat}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-primary text-sm">◆</span>
                  <span className="text-sm text-muted-foreground">
                    {feat}
                  </span>
                </motion.div>
              ))}
            </div>
          </motion.div>

          {/* Right - Mock Panel */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="glass-panel rounded-lg border-glow"
          >
            <div className="p-5 border-b border-white/[0.06] flex items-center justify-between">
              <span className="text-xs tracking-[0.15em] uppercase text-primary">
                ◆ Privacy Panel
              </span>
              <span className="text-xs text-muted-foreground/50">
                Live Preview
              </span>
            </div>

            <div className="p-4 space-y-3">
              {handles.map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.12 }}
                  className="p-3 bg-white/[0.02] rounded-md border border-white/[0.05]"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-primary">
                      {h.id}
                    </span>
                    <span className="text-[11px] font-mono text-muted-foreground bg-white/[0.04] px-2 py-0.5 rounded-md">
                      {h.type}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">
                      {h.owner}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {h.access.map((a) => (
                        <span
                          key={a}
                          className="text-[11px] text-foreground/70 bg-white/[0.04] px-2 py-0.5 rounded-md"
                        >
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Async stepper */}
            <div className="p-4 border-t border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                  <span className="text-xs text-primary">Encrypted</span>
                </div>
                <div className="flex-1 h-px bg-primary/30" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
                  <span className="text-xs text-primary">Computing</span>
                </div>
                <div className="flex-1 h-px bg-white/[0.06]" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-muted-foreground/30" />
                  <span className="text-xs text-muted-foreground/50">Decrypt</span>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default PrivacyPanel;
