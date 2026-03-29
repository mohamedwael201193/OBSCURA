import { motion } from "framer-motion";

const handles = [
  { id: "0x8f3a...c2d1", type: "euint64", owner: "Employee", access: ["Contract", "Employee"] },
  { id: "0xa1e7...9f4b", type: "euint64", owner: "Aggregate", access: ["Contract", "Auditor"] },
  { id: "0x3c82...d5e0", type: "ebool", owner: "Permission", access: ["Contract"] },
];

const PrivacyPanel = () => {
  return (
    <section className="relative py-32 px-8 border-t border-border/30">
      <div className="max-w-[1400px] mx-auto">
        <div className="grid md:grid-cols-2 gap-16 items-start">
          {/* Left - Description */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-mono text-glow-sm">
              Transparency Layer
            </span>
            <h2 className="font-display text-3xl md:text-4xl mt-3 text-foreground tracking-tight mb-4">
              What's <span className="text-primary text-glow">Private</span>?
            </h2>
            <p className="text-sm font-body text-muted-foreground leading-relaxed mb-6">
              Every page shows exactly what's encrypted, who can decrypt it, and
              which ciphertext handles are in play. No black boxes — controlled
              revelation.
            </p>
            <div className="space-y-3">
              {["Ciphertext handle tracking", "ACL permission visibility", "EIP-712 permit management", "Async FHE operation stepper"].map((feat, i) => (
                <motion.div
                  key={feat}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.2 + i * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <span className="text-primary text-xs">◆</span>
                  <span className="text-xs font-mono text-muted-foreground">
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
            className="glass-panel rounded-sm border-glow"
          >
            <div className="p-4 border-b border-border/50 flex items-center justify-between">
              <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-mono">
                ◆ Privacy Panel
              </span>
              <span className="text-[9px] font-mono text-muted-foreground/50">
                ObscuraPay v1.0
              </span>
            </div>

            <div className="p-4 space-y-3">
              {handles.map((h, i) => (
                <motion.div
                  key={h.id}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5 + i * 0.15 }}
                  className="p-3 bg-secondary/30 rounded-sm border border-border/30"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-mono text-primary">
                      {h.id}
                    </span>
                    <span className="text-[9px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm">
                      {h.type}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-mono text-muted-foreground/50">
                      ACL:
                    </span>
                    {h.access.map((a) => (
                      <span
                        key={a}
                        className="text-[9px] font-mono text-foreground/70 bg-secondary px-1.5 py-0.5 rounded-sm"
                      >
                        {a}
                      </span>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Async stepper */}
            <div className="p-4 border-t border-border/50">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-[9px] font-mono text-primary">Encrypted</span>
                </div>
                <div className="flex-1 h-px bg-primary/30" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                  <span className="text-[9px] font-mono text-primary">Computing</span>
                </div>
                <div className="flex-1 h-px bg-border" />
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />
                  <span className="text-[9px] font-mono text-muted-foreground/50">Decrypt</span>
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
