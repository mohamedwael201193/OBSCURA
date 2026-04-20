import { motion } from "framer-motion";

const stack = [
  { label: "Blockchain", value: "Arbitrum Sepolia · Chain ID 421614" },
  { label: "FHE Protocol", value: "Fhenix CoFHE · cofhe-contracts" },
  { label: "Contracts", value: "12+ deployed · Solidity 0.8.25" },
  { label: "Token", value: "cUSDC — FHERC20 encrypted stablecoin" },
  { label: "Frontend", value: "React 18 · Vite 5 · TypeScript 5.8" },
  { label: "Wallet / Tx", value: "wagmi 3.6 · viem 2 · @cofhe/sdk" },
  { label: "Modules", value: "Pay · Vote · Vault · Trust · Mind" },
  { label: "Privacy", value: "EIP-712 permits · Per-value ACL" },
  { label: "Tagline", value: "See Only What You're Meant To" },
];

const TechStack = () => {
  return (
    <section className="relative py-24 px-8 border-t border-white/[0.04]">
      <div className="max-w-[1400px] mx-auto">
        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="glass-panel rounded-lg overflow-hidden"
        >
          <div className="p-5 border-b border-white/[0.06]">
            <span className="text-xs tracking-[0.15em] uppercase text-primary">
              ◆ Tech Stack
            </span>
          </div>
          <div className="grid md:grid-cols-3 divide-x divide-white/[0.04]">
            {stack.map((item, i) => (
              <motion.div
                key={item.label}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="p-5 border-b border-white/[0.04] hover:bg-white/[0.01] transition-colors"
              >
                <span className="text-xs tracking-[0.15em] uppercase text-muted-foreground block mb-1.5">
                  {item.label}
                </span>
                <span className="text-sm text-foreground">
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
