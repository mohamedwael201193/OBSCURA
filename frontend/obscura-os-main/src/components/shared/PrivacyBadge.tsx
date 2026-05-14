/**
 * PrivacyBadge — FHE Live status pill for the NavBar.
 * Shows network + library version. Cyan accent.
 */
import { Lock } from "lucide-react";
import { motion } from "framer-motion";

interface Props {
  className?: string;
}

export default function PrivacyBadge({ className = "" }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5, duration: 0.4 }}
      className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-cyan-500/20 bg-cyan-950/30 ${className}`}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-1.5 w-1.5">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60" />
        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-400" />
      </span>
      <Lock className="w-2.5 h-2.5 text-cyan-400" />
      <span className="text-[9px] font-semibold tracking-[0.12em] uppercase text-cyan-300 whitespace-nowrap">
        FHE Live · cofhejs 0.5 · Arb Sepolia
      </span>
    </motion.div>
  );
}
