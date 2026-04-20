import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const PitchCTA = () => {
  return (
    <section className="relative py-32 px-8 border-t border-white/[0.04] overflow-hidden">
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(circle at 50% 50%, rgba(34, 197, 94, 0.04) 0%, transparent 50%)",
        }}
      />
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-20" />

      <div className="max-w-3xl mx-auto text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <span className="text-xs tracking-[0.2em] uppercase text-primary text-glow-sm block mb-6">
            ◆ Built on Fhenix CoFHE · Live on Arbitrum Sepolia
          </span>
          <h2 className="font-display text-3xl md:text-5xl text-foreground tracking-tight leading-tight mb-6">
            Five Modules. Fully Encrypted.
            <br />
            <span className="text-primary text-glow">Arbiscan Shows Nothing.</span>
          </h2>
          <p className="text-base text-muted-foreground leading-relaxed mb-4 max-w-xl mx-auto">
            Encrypted payroll, confidential governance, MEV-protected DeFi,
            selective compliance, and privacy-preserving AI — the complete
            on-chain privacy operating system.
          </p>
          <p className="text-sm text-muted-foreground/70 leading-relaxed mb-10 max-w-xl mx-auto">
            Every on-chain value is a ciphertext handle. Only the authorized party can decrypt.
            Not by obfuscation — by mathematics. See only what you're meant to.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link to="/pay">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 text-sm tracking-wide font-medium bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 rounded-md border-glow"
              >
                Try ObscuraPay
              </motion.button>
            </Link>
            <Link to="/vote">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 text-sm tracking-wide font-medium border border-white/[0.1] text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300 rounded-md"
              >
                Try ObscuraVote
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PitchCTA;
