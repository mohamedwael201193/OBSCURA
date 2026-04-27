import { motion } from "framer-motion";
import { Lock, Wallet, Building2, Send, Eye, Shield } from "lucide-react";

/**
 * FHE Payment Flow Diagram — animated SVG that visually explains:
 *   Your Browser → Encrypts Amount → Smart Contract (FHE) → Recipient
 *
 * Non-Web3 users see: my data is sealed in my browser, the chain processes
 * the SEALED envelope, only the recipient can open it. No technical jargon needed.
 */
export const FHEFlowDiagram = () => {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-black/40 via-black/30 to-emerald-500/[0.03] p-6 lg:p-8 backdrop-blur-sm">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-emerald-400">How Privacy Works</span>
        </div>
        <h3 className="font-display text-xl text-foreground">Your money. Sealed end-to-end.</h3>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-2xl">
          Every amount you send is locked inside an encrypted envelope on your device. The blockchain processes the
          envelope <em>without ever opening it</em>. Only you and the recipient can unseal it.
        </p>
      </div>

      {/* Diagram */}
      <div className="relative">
        <svg viewBox="0 0 800 220" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="flow-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(34,197,94,0)" />
              <stop offset="50%" stopColor="rgba(34,197,94,0.6)" />
              <stop offset="100%" stopColor="rgba(6,182,212,0)" />
            </linearGradient>
            <linearGradient id="node-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.06)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0.02)" />
            </linearGradient>
            <radialGradient id="pulse-glow">
              <stop offset="0%" stopColor="rgba(34,197,94,0.5)" />
              <stop offset="100%" stopColor="rgba(34,197,94,0)" />
            </radialGradient>
            <filter id="glow-filter" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Connection line: browser → contract → recipient */}
          <line x1="120" y1="110" x2="400" y2="110" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />
          <line x1="400" y1="110" x2="680" y2="110" stroke="rgba(255,255,255,0.08)" strokeWidth="1" strokeDasharray="3 3" />

          {/* Animated traveling sealed packet (browser → contract) */}
          <motion.g
            initial={{ x: 120, opacity: 0 }}
            animate={{ x: [120, 400, 400, 680], opacity: [0, 1, 1, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", times: [0, 0.4, 0.6, 1] }}
          >
            <circle cx="0" cy="110" r="18" fill="url(#pulse-glow)" />
            <circle cx="0" cy="110" r="8" fill="rgb(34,197,94)" filter="url(#glow-filter)" />
            <text x="0" y="113" textAnchor="middle" fontSize="9" fill="black" fontWeight="700" fontFamily="monospace">
              🔒
            </text>
          </motion.g>

          {/* NODE 1: Browser */}
          <g>
            <motion.circle
              cx="80"
              cy="110"
              r="55"
              fill="url(#node-grad)"
              stroke="rgba(34,197,94,0.4)"
              strokeWidth="1"
              animate={{ r: [55, 58, 55] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <circle cx="80" cy="110" r="40" fill="rgba(34,197,94,0.05)" stroke="rgba(34,197,94,0.2)" strokeWidth="1" />
          </g>

          {/* NODE 2: Smart contract (FHE chain) */}
          <g>
            <motion.rect
              x="345"
              y="60"
              width="110"
              height="100"
              rx="12"
              fill="url(#node-grad)"
              stroke="rgba(6,182,212,0.4)"
              strokeWidth="1"
              animate={{ y: [60, 58, 60] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* lock icon center */}
            <text x="400" y="115" textAnchor="middle" fontSize="36" fill="rgba(6,182,212,0.6)" fontFamily="monospace">
              ◇
            </text>
            {/* Operation labels floating around */}
            <motion.text
              x="400" y="78" textAnchor="middle" fontSize="9" fill="rgba(6,182,212,0.7)" fontFamily="monospace"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 0 }}
            >
              FHE.add
            </motion.text>
            <motion.text
              x="400" y="148" textAnchor="middle" fontSize="9" fill="rgba(6,182,212,0.7)" fontFamily="monospace"
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 2.5, repeat: Infinity, delay: 1 }}
            >
              FHE.select
            </motion.text>
          </g>

          {/* NODE 3: Recipient */}
          <g>
            <motion.circle
              cx="720"
              cy="110"
              r="55"
              fill="url(#node-grad)"
              stroke="rgba(34,197,94,0.4)"
              strokeWidth="1"
              animate={{ r: [55, 58, 55] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            />
            <circle cx="720" cy="110" r="40" fill="rgba(34,197,94,0.05)" stroke="rgba(34,197,94,0.2)" strokeWidth="1" />
          </g>

          {/* Flow direction arrows */}
          <motion.path
            d="M 145 110 L 340 110"
            stroke="url(#flow-line)"
            strokeWidth="1.5"
            fill="none"
            animate={{ strokeDashoffset: [0, -12] }}
            style={{ strokeDasharray: "6 6" }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />
          <motion.path
            d="M 460 110 L 660 110"
            stroke="url(#flow-line)"
            strokeWidth="1.5"
            fill="none"
            animate={{ strokeDashoffset: [0, -12] }}
            style={{ strokeDasharray: "6 6" }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear", delay: 0.5 }}
          />
        </svg>

        {/* Overlay icon labels positioned over the SVG nodes */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute" style={{ left: "10%", top: "50%", transform: "translate(-50%, -50%)" }}>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-black/60 border border-emerald-500/40 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
          <div className="absolute" style={{ left: "50%", top: "50%", transform: "translate(-50%, -50%)" }}>
            <div className="flex flex-col items-center gap-1">
              <div className="w-9 h-9 rounded-md bg-black/60 border border-cyan-500/40 flex items-center justify-center">
                <Lock className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
          </div>
          <div className="absolute" style={{ left: "90%", top: "50%", transform: "translate(-50%, -50%)" }}>
            <div className="flex flex-col items-center gap-1">
              <div className="w-10 h-10 rounded-full bg-black/60 border border-emerald-500/40 flex items-center justify-center">
                <Eye className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Step labels under diagram */}
      <div className="grid grid-cols-3 gap-3 mt-6">
        {[
          { label: "Step 1 — You", desc: "Your wallet seals the amount in an encrypted envelope before it leaves your device.", color: "emerald" },
          { label: "Step 2 — Chain", desc: "The smart contract does math on the envelope without ever opening it.", color: "cyan" },
          { label: "Step 3 — Recipient", desc: "Only the intended recipient holds the key to unseal and see the amount.", color: "emerald" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            className={`p-3 rounded-lg bg-black/30 border border-white/[0.04] hover:border-${s.color}-500/30 transition-colors`}
          >
            <div className={`text-[10px] tracking-[0.2em] uppercase text-${s.color}-400 font-mono`}>{s.label}</div>
            <div className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">{s.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/**
 * Vote Flow Diagram — explains coercion-resistant voting:
 *   Voter → Sealed ballot → Tally adder → Public result (after deadline)
 */
export const VoteFlowDiagram = () => {
  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-white/[0.06] bg-gradient-to-br from-black/40 via-black/30 to-violet-500/[0.03] p-6 lg:p-8 backdrop-blur-sm">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-1.5 h-1.5 rounded-full bg-violet-400 animate-pulse" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-violet-400">How Encrypted Voting Works</span>
        </div>
        <h3 className="font-display text-xl text-foreground">Cast in private. Counted in public.</h3>
        <p className="text-sm text-muted-foreground/70 mt-1 max-w-2xl">
          Your individual choice is sealed forever — even after the result is revealed. Only the <em>aggregate</em> tally
          becomes public when the deadline passes. You can revote anytime, defeating coercion.
        </p>
      </div>

      <div className="relative">
        <svg viewBox="0 0 800 240" className="w-full h-auto" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="vote-line" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="rgba(139,92,246,0)" />
              <stop offset="50%" stopColor="rgba(139,92,246,0.6)" />
              <stop offset="100%" stopColor="rgba(34,197,94,0)" />
            </linearGradient>
            <radialGradient id="vote-pulse">
              <stop offset="0%" stopColor="rgba(139,92,246,0.5)" />
              <stop offset="100%" stopColor="rgba(139,92,246,0)" />
            </radialGradient>
          </defs>

          {/* Three voters → ballot box → tally → public result */}
          {/* Voters */}
          {[60, 110, 160].map((cy, i) => (
            <motion.g
              key={cy}
              initial={{ opacity: 0.5 }}
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity, delay: i * 0.4 }}
            >
              <circle cx="80" cy={cy} r="22" fill="rgba(255,255,255,0.04)" stroke="rgba(139,92,246,0.4)" strokeWidth="1" />
            </motion.g>
          ))}

          {/* Connection lines voters → ballot box */}
          {[60, 110, 160].map((cy) => (
            <line key={cy} x1="105" y1={cy} x2="320" y2="110" stroke="rgba(255,255,255,0.06)" strokeWidth="1" strokeDasharray="3 3" />
          ))}

          {/* Animated sealed ballots flying to the box */}
          {[60, 110, 160].map((startY, i) => (
            <motion.g
              key={`ballot-${i}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: [0, 1, 1, 0] }}
              transition={{ duration: 3, repeat: Infinity, delay: i * 0.6, ease: "easeInOut" }}
            >
              <motion.rect
                width="14"
                height="10"
                rx="2"
                fill="rgba(139,92,246,0.85)"
                animate={{ x: [105, 320], y: [startY - 5, 105] }}
                transition={{ duration: 3, repeat: Infinity, delay: i * 0.6, ease: "easeInOut" }}
              />
            </motion.g>
          ))}

          {/* Ballot box */}
          <g>
            <motion.rect
              x="320"
              y="60"
              width="110"
              height="100"
              rx="10"
              fill="rgba(139,92,246,0.08)"
              stroke="rgba(139,92,246,0.4)"
              strokeWidth="1"
              animate={{ y: [60, 58, 60] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <text x="375" y="115" textAnchor="middle" fontSize="28" fill="rgba(139,92,246,0.6)">
              ⬚
            </text>
            <text x="375" y="148" textAnchor="middle" fontSize="9" fill="rgba(139,92,246,0.7)" fontFamily="monospace">
              FHE.add
            </text>
          </g>

          {/* Result panel */}
          <g>
            <motion.rect
              x="540"
              y="60"
              width="180"
              height="100"
              rx="10"
              fill="rgba(34,197,94,0.06)"
              stroke="rgba(34,197,94,0.4)"
              strokeWidth="1"
              animate={{ y: [60, 58, 60] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 1.5 }}
            />
            {/* Bar chart bars */}
            {[
              { x: 560, h: 50, color: "rgba(34,197,94,0.6)", delay: 0 },
              { x: 600, h: 35, color: "rgba(6,182,212,0.6)", delay: 0.2 },
              { x: 640, h: 60, color: "rgba(139,92,246,0.6)", delay: 0.4 },
              { x: 680, h: 25, color: "rgba(245,158,11,0.6)", delay: 0.6 },
            ].map((bar, i) => (
              <motion.rect
                key={i}
                x={bar.x}
                y={140 - bar.h}
                width="20"
                height={bar.h}
                rx="2"
                fill={bar.color}
                initial={{ scaleY: 0, transformOrigin: "bottom" }}
                animate={{ scaleY: 1 }}
                transition={{ duration: 1.2, delay: bar.delay, repeat: Infinity, repeatType: "reverse", repeatDelay: 1, ease: "easeOut" }}
                style={{ transformBox: "fill-box", transformOrigin: "bottom" }}
              />
            ))}
            <text x="630" y="80" textAnchor="middle" fontSize="9" fill="rgba(34,197,94,0.8)" fontFamily="monospace">
              PUBLIC TALLY
            </text>
          </g>

          {/* Flow lines */}
          <motion.path
            d="M 430 110 L 540 110"
            stroke="url(#vote-line)"
            strokeWidth="1.5"
            fill="none"
            style={{ strokeDasharray: "6 6" }}
            animate={{ strokeDashoffset: [0, -12] }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          />

          {/* Lock indicator above ballot box */}
          <motion.text
            x="375"
            y="40"
            textAnchor="middle"
            fontSize="10"
            fill="rgba(139,92,246,0.7)"
            fontFamily="monospace"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 2, repeat: Infinity }}
          >
            ✦ ENCRYPTED ✦
          </motion.text>

          {/* Voter labels */}
          {["Alice", "Bob", "Carol"].map((name, i) => (
            <text
              key={name}
              x="80"
              y={68 + i * 50}
              textAnchor="middle"
              fontSize="9"
              fill="rgba(255,255,255,0.5)"
              fontFamily="monospace"
            >
              {name}
            </text>
          ))}
        </svg>
      </div>

      {/* Step labels */}
      <div className="grid grid-cols-3 gap-3 mt-4">
        {[
          { label: "Sealed Ballot", desc: "Each vote is encrypted in your browser before submission. The chain stores ciphertext only.", color: "violet" },
          { label: "Encrypted Tally", desc: "The contract sums encrypted votes. Even validators can't read individual choices.", color: "cyan" },
          { label: "Public Result", desc: "After the deadline, only the aggregate is unlocked. Your vote stays private forever.", color: "emerald" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
            className={`p-3 rounded-lg bg-black/30 border border-white/[0.04] hover:border-${s.color}-500/30 transition-colors`}
          >
            <div className={`text-[10px] tracking-[0.2em] uppercase text-${s.color}-400 font-mono`}>{s.label}</div>
            <div className="text-xs text-muted-foreground/80 mt-1.5 leading-relaxed">{s.desc}</div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

/**
 * Compact horizontal flow chip — used on individual tabs like "Send", "Escrow"
 * to give a 1-line visual recap.
 */
export const MiniFlow = ({
  steps,
  accent = "emerald",
}: {
  steps: { icon: React.ComponentType<{ className?: string }>; label: string }[];
  accent?: "emerald" | "cyan" | "violet";
}) => {
  const colors = {
    emerald: "border-emerald-500/30 text-emerald-400",
    cyan: "border-cyan-500/30 text-cyan-400",
    violet: "border-violet-500/30 text-violet-400",
  };
  return (
    <div className="flex items-center gap-2 flex-wrap">
      {steps.map((s, i) => {
        const Icon = s.icon;
        return (
          <div key={s.label} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-md border bg-black/30 ${colors[accent]}`}>
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs tracking-wide">{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <motion.div
                animate={{ x: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                className="text-muted-foreground/40 text-xs"
              >
                →
              </motion.div>
            )}
          </div>
        );
      })}
    </div>
  );
};

/**
 * Privacy claim card — gives non-Web3 users an instant trust hit
 * with animated check marks.
 */
export const PrivacyClaims = ({ accent = "emerald" }: { accent?: "emerald" | "cyan" | "violet" }) => {
  const items = [
    { icon: Lock, title: "End-to-end sealed", desc: "Amounts encrypted in your browser. The chain never sees the value." },
    { icon: Shield, title: "Zero leakage", desc: "Even node operators and validators cannot read your data." },
    { icon: Eye, title: "Selective reveal", desc: "Only you, or whoever you grant a permit to, can decrypt." },
    { icon: Building2, title: "Compliance-ready", desc: "Auditors get scoped, time-limited views via EIP-712 permits." },
  ];
  const text = `text-${accent}-400`;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {items.map((it, i) => {
        const Icon = it.icon;
        return (
          <motion.div
            key={it.title}
            initial={{ opacity: 0, y: 16, filter: "blur(8px)" }}
            whileInView={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="group relative p-4 rounded-xl bg-gradient-to-br from-white/[0.04] to-white/[0.01] border border-white/[0.06] hover:border-white/[0.15] transition-all overflow-hidden"
          >
            <div className={`absolute -top-12 -right-12 w-24 h-24 rounded-full bg-${accent}-500/10 blur-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
            <div className={`relative w-9 h-9 rounded-lg bg-${accent}-500/10 border border-${accent}-500/20 flex items-center justify-center mb-3`}>
              <Icon className={`w-4 h-4 ${text}`} />
            </div>
            <div className="relative text-sm font-medium text-foreground">{it.title}</div>
            <div className="relative text-xs text-muted-foreground/70 mt-1 leading-relaxed">{it.desc}</div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default FHEFlowDiagram;
