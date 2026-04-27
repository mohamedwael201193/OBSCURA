import { motion } from "framer-motion";

/**
 * Elite animated background — multi-layer composition:
 * 1. Animated mesh gradient (slow drifting orbs)
 * 2. Grid lines (subtle, cyber-tech feel)
 * 3. SVG noise/grain overlay (premium tactile finish)
 * 4. Radial glow at top-center
 *
 * Pure CSS + SVG. No WebGL/canvas. Ultra-light. Pinned behind dashboard.
 */
export const AnimatedBackground = ({ accent = "green" }: { accent?: "green" | "cyan" | "violet" }) => {
  const accentMap = {
    green: { primary: "rgba(34,197,94,0.18)", secondary: "rgba(6,182,212,0.10)" },
    cyan: { primary: "rgba(6,182,212,0.18)", secondary: "rgba(139,92,246,0.10)" },
    violet: { primary: "rgba(139,92,246,0.18)", secondary: "rgba(34,197,94,0.10)" },
  }[accent];

  return (
    <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base layer */}
      <div className="absolute inset-0 bg-[#040406]" />

      {/* Mesh gradient orbs — slow drift */}
      <motion.div
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full blur-3xl"
        style={{ background: accentMap.primary }}
        animate={{ x: [0, 100, -50, 0], y: [0, 80, -40, 0] }}
        transition={{ duration: 28, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -bottom-32 -right-32 w-[700px] h-[700px] rounded-full blur-3xl"
        style={{ background: accentMap.secondary }}
        animate={{ x: [0, -120, 60, 0], y: [0, -80, 40, 0] }}
        transition={{ duration: 34, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute top-1/3 left-1/2 w-[500px] h-[500px] rounded-full blur-3xl -translate-x-1/2"
        style={{ background: "rgba(6,182,212,0.06)" }}
        animate={{ scale: [1, 1.2, 0.9, 1], opacity: [0.4, 0.7, 0.5, 0.4] }}
        transition={{ duration: 22, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 30%, transparent 80%)",
        }}
      />

      {/* Top radial vignette glow */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% 0%, rgba(34,197,94,0.10) 0%, transparent 70%)",
        }}
      />

      {/* SVG grain texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.18] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.6'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Bottom fade */}
      <div className="absolute inset-x-0 bottom-0 h-64 bg-gradient-to-t from-[#040406] to-transparent" />
    </div>
  );
};

export default AnimatedBackground;
