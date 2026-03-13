import { motion } from "framer-motion";

/**
 * Calm, subtle ambient background for dashboard pages.
 * - Solid dark base
 * - Soft top-right emerald glow (very low opacity)
 * - Faint dotted grid
 * - Bottom vignette for depth
 *
 * No orbs, no fast loops. Designed to be visible only as atmosphere.
 */
const AmbientBackground = () => {
  return (
    <div aria-hidden="true" className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
      {/* Base */}
      <div className="absolute inset-0 bg-[#06090c]" />

      {/* Soft emerald wash, top-right */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2 }}
        className="absolute -top-40 -right-40 w-[640px] h-[640px] rounded-full"
        style={{
          background:
            "radial-gradient(circle at center, rgba(16,185,129,0.10), rgba(16,185,129,0) 70%)",
          filter: "blur(40px)",
        }}
      />

      {/* Dotted grid */}
      <div
        className="absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage:
            "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "26px 26px",
          maskImage:
            "radial-gradient(ellipse 80% 60% at 50% 35%, black 40%, transparent 100%)",
          WebkitMaskImage:
            "radial-gradient(ellipse 80% 60% at 50% 35%, black 40%, transparent 100%)",
        }}
      />

      {/* Bottom vignette */}
      <div className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-black to-transparent" />
    </div>
  );
};

export default AmbientBackground;
