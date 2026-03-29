import { motion } from "framer-motion";

const stack = [
  { label: "Blockchain", value: "Arbitrum Sepolia" },
  { label: "Contracts", value: "Solidity 0.8.25 + FHE.sol" },
  { label: "Token", value: "$OBS FHERC20" },
  { label: "Frontend", value: "React + @cofhe/sdk" },
  { label: "Testing", value: "Hardhat + CoFHE Mock" },
  { label: "Payments", value: "Privara SDK" },
];

const TechStack = () => {
  return (
    <section className="relative py-24 px-8 border-t border-border/30">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass-panel rounded-sm overflow-hidden"
        >
          <div className="p-4 border-b border-border/50">
            <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-mono">
              ◆ Tech Stack
            </span>
          </div>
          <div className="grid md:grid-cols-3 divide-x divide-border/30">
            {stack.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-5 border-b border-border/30 hover:bg-secondary/20 transition-colors"
              >
                <span className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground/50 font-mono block mb-1">
                  {item.label}
                </span>
                <span className="text-xs font-mono text-foreground">
                  {item.value}
                </span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default TechStack;
