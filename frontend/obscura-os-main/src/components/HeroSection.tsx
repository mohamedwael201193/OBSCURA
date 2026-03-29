import { motion } from "framer-motion";
import DataTicker from "./DataTicker";

const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/images/obscura-bg.png')" }}
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-background/70" />

      {/* Grid overlay */}
      <div className="absolute inset-0 grid-overlay opacity-30 pointer-events-none" />

      {/* Scanline overlay */}
      <div className="absolute inset-0 scanline-overlay pointer-events-none opacity-40" />

      {/* Green glow from top-right */}
      <div
        className="absolute top-0 right-0 w-[600px] h-[600px] pointer-events-none"
        style={{
          background:
            "radial-gradient(circle at 70% 30%, rgba(34, 197, 94, 0.08) 0%, transparent 60%)",
        }}
      />

      {/* Sweep line animation */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div
          className="absolute top-0 bottom-0 w-px bg-primary/20"
          style={{ animation: "sweep 8s linear infinite" }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 w-full max-w-[1400px] mx-auto px-8 pt-24 flex items-center justify-between">
        {/* Left - Main copy */}
        <div className="max-w-2xl">
          {/* Status line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
            className="flex items-center gap-3 mb-6"
          >
            <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-mono">
              FHE-Powered
            </span>
            <span className="text-muted-foreground/30">|</span>
            <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-mono">
              Arbitrum Sepolia
            </span>
            <span className="text-muted-foreground/30">|</span>
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-mono text-glow-sm">
              Wave 1 Active
            </span>
          </motion.div>

          {/* Headline with glitch */}
          <div className="relative mb-6">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
              className="font-display text-5xl md:text-7xl font-bold leading-[0.95] tracking-tight text-foreground"
              style={{ animation: "flicker 4s ease-in-out infinite" }}
            >
              The Dark
              <br />
              Operating
              <br />
              <span className="relative inline-block">
                <span className="text-primary text-glow">[</span>
                System
                <span className="text-primary text-glow">]</span>
              </span>
            </motion.h1>

            {/* Glitch copies */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1.5 }}
              className="absolute top-0 left-0 font-display text-5xl md:text-7xl font-bold leading-[0.95] tracking-tight pointer-events-none select-none"
              style={{
                animation: "glitch-1 3s infinite linear",
                color: "hsl(var(--primary))",
                opacity: 0.05,
              }}
              aria-hidden="true"
            >
              The Dark
              <br />
              Operating
              <br />
              [System]
            </motion.div>
          </div>

          {/* Tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-sm font-body text-muted-foreground leading-relaxed max-w-md mb-2"
          >
            See only what you're meant to. Encrypted payroll, confidential governance,
            and privacy-preserving DeFi — powered by Fully Homomorphic Encryption.
          </motion.p>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.8 }}
            className="text-xs font-mono text-muted-foreground/50 mb-8"
          >
            Engineered for those who move before the market.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.9, duration: 0.8 }}
            className="flex items-center gap-4"
          >
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="px-6 py-3 text-xs tracking-[0.2em] uppercase font-mono border border-foreground/80 text-foreground hover:bg-foreground/10 transition-all duration-300 rounded-sm"
            >
              Launch Terminal
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="flex items-center gap-2 px-6 py-3 text-xs tracking-[0.2em] uppercase font-mono border border-primary/40 text-primary hover:bg-primary/10 transition-all duration-300 rounded-sm group"
            >
              View Signals
              <span className="group-hover:translate-x-1 transition-transform">
                →
              </span>
            </motion.button>
          </motion.div>

          {/* Bottom status */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.4, duration: 1 }}
            className="mt-12 flex items-center gap-6"
          >
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              <span className="text-[10px] font-mono text-muted-foreground/60 tracking-wider">
                ALL SYSTEMS NOMINAL
              </span>
            </div>
            <span className="text-muted-foreground/20">|</span>
            <span className="text-[10px] font-mono text-muted-foreground/40">
              FHE LATENCY: 2.4s
            </span>
          </motion.div>
        </div>

        {/* Right - Data ticker */}
        <div className="hidden lg:block">
          <DataTicker />
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
