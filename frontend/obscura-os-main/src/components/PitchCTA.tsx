import { motion } from "framer-motion";
import { Link } from "react-router-dom";

const PitchCTA = () => {
  return (
    <section className="relative py-32 px-8 border-t border-border/30 overflow-hidden">
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
          <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-mono text-glow-sm block mb-6">
            The $500M Privacy Problem
          </span>
          <h2 className="font-display text-3xl md:text-5xl text-foreground tracking-tight leading-tight mb-6">
            OBSCURA doesn't retrofit privacy.
            <br />
            <span className="text-primary text-glow">It was born in the dark.</span>
          </h2>
          <p className="text-sm font-body text-muted-foreground leading-relaxed mb-10 max-w-xl mx-auto">
            Public blockchains have a $500M privacy architecture problem. Institutions cannot run payrolls,
            manage treasuries, or execute trades on transparent rails — not "won't," <em>can't</em>.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link to="/pay">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 text-xs tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 rounded-sm border-glow"
              >
                Launch ObscuraPay
              </motion.button>
            </Link>
            <Link to="/docs">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="px-8 py-3.5 text-xs tracking-[0.2em] uppercase font-mono border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300 rounded-sm"
              >
                Read Documentation
              </motion.button>
            </Link>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PitchCTA;
