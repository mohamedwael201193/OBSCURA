/**
 * SectionDiagram — animated SVG flow diagrams that visualize how each Pay/Vote
 * module works. Designed as a complement to <HowItWorks/> step lists: words
 * explain the procedure, the diagram makes the encryption tangible.
 *
 * Pick a flow via the `flow` prop. Each flow is a curated sequence of nodes
 * (boxes) connected by paths along which a "packet" travels. Packets are
 * rendered as small lock-glyph circles to reinforce the encrypted nature.
 *
 * Pure presentation — no business logic.
 */

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

// ── Flow catalogue ────────────────────────────────────────────────────────

export type DiagramFlow =
  | "send"
  | "receive"
  | "escrow"
  | "stream"
  | "crosschain"
  | "insurance"
  | "stealth"
  | "vote-cast"
  | "vote-tally"
  | "obs-claim";

interface FlowNode {
  x: number;
  y: number;
  label: string;
  sub?: string;
}

interface FlowSpec {
  title: string;
  subtitle: string;
  nodes: FlowNode[];
  /** Pairs of node indices that form a directed edge */
  edges: Array<[number, number]>;
}

const FLOWS: Record<DiagramFlow, FlowSpec> = {
  send: {
    title: "How encryption flows when you Send",
    subtitle: "Plaintext never leaves your browser. Every contract op runs on ciphertext.",
    nodes: [
      { x: 60,  y: 90, label: "Your wallet", sub: "Plaintext amount" },
      { x: 240, y: 90, label: "FHE encrypt", sub: "In-browser" },
      { x: 420, y: 90, label: "cUSDC contract", sub: "FHE.add / .sub" },
      { x: 600, y: 90, label: "Recipient", sub: "Sees own balance only" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  receive: {
    title: "How a stealth payment reaches you",
    subtitle: "A fresh address per payment — nobody can link them back to you.",
    nodes: [
      { x: 60,  y: 90, label: "Sender",         sub: "Generates stealth addr" },
      { x: 240, y: 90, label: "Stealth registry", sub: "Encrypted meta-addr" },
      { x: 420, y: 90, label: "On-chain note",  sub: "Encrypted recipient" },
      { x: 600, y: 90, label: "Your inbox",     sub: "Scan & decrypt" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  escrow: {
    title: "How an encrypted Escrow settles",
    subtitle: "Funds and conditions are both encrypted. Resolver releases on a sealed verdict.",
    nodes: [
      { x: 60,  y: 50,  label: "Payer",    sub: "Locks cUSDC" },
      { x: 320, y: 50,  label: "Escrow",   sub: "Encrypted vault" },
      { x: 580, y: 50,  label: "Payee",    sub: "Receives on release" },
      { x: 320, y: 160, label: "Resolver", sub: "Encrypted verdict" },
    ],
    edges: [[0, 1], [1, 2], [3, 1]],
  },
  stream: {
    title: "How encrypted Payroll Streams pay out",
    subtitle: "Salary cycles tick on-chain — amounts and recipients stay sealed.",
    nodes: [
      { x: 60,  y: 90, label: "Employer",  sub: "Encrypted rate" },
      { x: 240, y: 90, label: "PayStream", sub: "FHE accrual" },
      { x: 420, y: 90, label: "Cycle tick", sub: "Per epoch" },
      { x: 600, y: 90, label: "Stealth payee", sub: "Encrypted credit" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  crosschain: {
    title: "How USDC bridges into encrypted cUSDC",
    subtitle: "Public USDC enters via CCTP, then wraps to cUSDC where it becomes private.",
    nodes: [
      { x: 60,  y: 90, label: "Source chain", sub: "Public USDC" },
      { x: 240, y: 90, label: "CCTP burn",    sub: "Verified" },
      { x: 420, y: 90, label: "Mint USDC",    sub: "On Arbitrum" },
      { x: 600, y: 90, label: "Wrap → cUSDC", sub: "Now encrypted" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  insurance: {
    title: "How payroll Insurance protects you",
    subtitle: "Premiums and payouts stay encrypted. Pool LPs back the policy.",
    nodes: [
      { x: 60,  y: 50,  label: "Buyer",   sub: "Pays premium" },
      { x: 320, y: 50,  label: "Pool",    sub: "Encrypted reserves" },
      { x: 580, y: 50,  label: "Payout",  sub: "On missed cycle" },
      { x: 320, y: 160, label: "LPs",     sub: "Stake & earn yield" },
    ],
    edges: [[0, 1], [1, 2], [3, 1]],
  },
  stealth: {
    title: "How Stealth Addresses hide your identity",
    subtitle: "One meta-address, infinite single-use receivers — unlinkable on-chain.",
    nodes: [
      { x: 60,  y: 90, label: "Meta-addr",  sub: "Registered once" },
      { x: 240, y: 90, label: "Sender derives", sub: "Fresh stealth addr" },
      { x: 420, y: 90, label: "Encrypted note", sub: "Posted on-chain" },
      { x: 600, y: 90, label: "You scan",   sub: "Decrypt with key" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  "vote-cast": {
    title: "How an encrypted Vote is cast",
    subtitle: "Your ballot is sealed before it leaves the browser. Even after results, your vote stays private.",
    nodes: [
      { x: 60,  y: 90, label: "Your choice",   sub: "Plaintext ballot" },
      { x: 240, y: 90, label: "FHE seal",      sub: "Encrypt locally" },
      { x: 420, y: 90, label: "Vote contract", sub: "Stores ciphertext" },
      { x: 600, y: 90, label: "Tally bucket",  sub: "FHE.add aggregate" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  "vote-tally": {
    title: "How results are revealed without revealing voters",
    subtitle: "Only the aggregate is decrypted. Individual ballots remain encrypted forever.",
    nodes: [
      { x: 60,  y: 90, label: "Sealed ballots", sub: "n encrypted votes" },
      { x: 240, y: 90, label: "FHE sum",        sub: "Pure ciphertext math" },
      { x: 420, y: 90, label: "Threshold decrypt", sub: "CoFHE network" },
      { x: 600, y: 90, label: "Public result",  sub: "Counts only" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  "obs-claim": {
    title: "How $OBS distribution works",
    subtitle: "Daily claim → governance weight. No KYC, no whales — just consistency.",
    nodes: [
      { x: 60,  y: 90, label: "Claim 100 $OBS", sub: "Every 24h" },
      { x: 240, y: 90, label: "Wallet credit",  sub: "Visible to you" },
      { x: 420, y: 90, label: "Vote weight",    sub: "Per ballot" },
      { x: 600, y: 90, label: "Influence",      sub: "On proposals" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
};

// ── Component ─────────────────────────────────────────────────────────────

interface SectionDiagramProps {
  flow: DiagramFlow;
  className?: string;
}

const NODE_W = 130;
const NODE_H = 60;

export default function SectionDiagram({ flow, className = "" }: SectionDiagramProps) {
  const spec = FLOWS[flow];
  if (!spec) return null;

  // Build path strings for each edge: simple horizontal/diagonal Bezier
  const edgePaths = spec.edges.map(([aIdx, bIdx]) => {
    const a = spec.nodes[aIdx];
    const b = spec.nodes[bIdx];
    const x1 = a.x + NODE_W;
    const y1 = a.y + NODE_H / 2;
    const x2 = b.x;
    const y2 = b.y + NODE_H / 2;
    const cx = (x1 + x2) / 2;
    return `M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`;
  });

  return (
    <div
      className={`relative rounded-xl border border-white/[0.06] bg-gradient-to-br from-emerald-500/[0.02] via-white/[0.012] to-transparent p-5 overflow-hidden ${className}`}
    >
      <div className="flex items-center gap-2 mb-1">
        <span className="text-[10px] tracking-[0.22em] uppercase text-emerald-400/80 font-mono">
          Diagram
        </span>
        <span className="text-[12.5px] font-display font-semibold text-foreground">
          {spec.title}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground/65 leading-snug mb-3 max-w-2xl">
        {spec.subtitle}
      </p>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox="0 0 760 220"
          className="w-full h-auto min-w-[640px]"
          aria-hidden="true"
        >
          <defs>
            {/* Subtle grid */}
            <pattern id="diag-grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="0.5" />
            </pattern>
            {/* Glow filter for the moving packet */}
            <filter id="diag-glow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.5" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* Arrow marker */}
            <marker
              id="diag-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="rgba(52,211,153,0.55)" />
            </marker>
          </defs>

          <rect width="760" height="220" fill="url(#diag-grid)" />

          {/* Edges */}
          {edgePaths.map((d, i) => (
            <g key={`edge-${i}`}>
              <path
                d={d}
                fill="none"
                stroke="rgba(52,211,153,0.28)"
                strokeWidth="1.25"
                strokeDasharray="3 3"
                markerEnd="url(#diag-arrow)"
              />
              {/* Encrypted packet — animates along the path */}
              <motion.g filter="url(#diag-glow)">
                <motion.circle
                  r="6"
                  fill="rgba(52,211,153,0.95)"
                  initial={{ offsetDistance: "0%" }}
                  animate={{ offsetDistance: "100%" }}
                  transition={{
                    duration: 2.2,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatDelay: 0.8,
                    delay: i * 0.35,
                  }}
                  style={{ offsetPath: `path("${d}")` }}
                />
              </motion.g>
            </g>
          ))}

          {/* Nodes */}
          {spec.nodes.map((n, i) => (
            <g key={`node-${i}`}>
              <motion.rect
                x={n.x}
                y={n.y}
                width={NODE_W}
                height={NODE_H}
                rx="8"
                fill="rgba(6,9,12,0.85)"
                stroke="rgba(52,211,153,0.32)"
                strokeWidth="1"
                initial={{ opacity: 0, y: n.y + 6 }}
                animate={{ opacity: 1, y: n.y }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              />
              {/* Lock glyph */}
              <g transform={`translate(${n.x + 10}, ${n.y + 10})`}>
                <rect
                  x="0"
                  y="0"
                  width="14"
                  height="14"
                  rx="3"
                  fill="rgba(52,211,153,0.08)"
                  stroke="rgba(52,211,153,0.45)"
                  strokeWidth="0.8"
                />
                <path
                  d="M 4 6 v -1.5 a 3 3 0 0 1 6 0 v 1.5"
                  fill="none"
                  stroke="rgba(52,211,153,0.85)"
                  strokeWidth="0.8"
                />
                <rect x="3" y="6" width="8" height="6" rx="1" fill="rgba(52,211,153,0.18)" />
              </g>
              <text
                x={n.x + 30}
                y={n.y + 22}
                fill="rgba(245,245,245,0.92)"
                fontSize="11"
                fontFamily="Space Grotesk, sans-serif"
                fontWeight="600"
              >
                {n.label}
              </text>
              {n.sub && (
                <text
                  x={n.x + 30}
                  y={n.y + 38}
                  fill="rgba(180,180,180,0.55)"
                  fontSize="9.5"
                  fontFamily="DM Sans, sans-serif"
                >
                  {n.sub}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-3 flex items-center gap-4 text-[10px] text-muted-foreground/55">
        <span className="inline-flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)]" />
          Encrypted packet
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="w-2.5 h-2.5 text-emerald-400/70" />
          FHE-protected node
        </span>
        <span className="inline-flex items-center gap-1.5 ml-auto">
          <span className="font-mono">CoFHE · Arbitrum Sepolia</span>
        </span>
      </div>
    </div>
  );
}
