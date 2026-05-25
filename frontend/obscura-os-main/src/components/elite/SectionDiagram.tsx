/**
 * SectionDiagram — animated SVG flow diagrams (Pay / Credit / Vote).
 * Light editorial theme: readable on cream workspace backgrounds.
 */

import { motion } from "framer-motion";
import { Lock } from "lucide-react";

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
  edges: Array<[number, number]>;
}

const FLOWS: Record<DiagramFlow, FlowSpec> = {
  send: {
    title: "How encryption flows when you Send",
    subtitle: "Plaintext never leaves your browser. Every contract op runs on ciphertext.",
    nodes: [
      { x: 60, y: 90, label: "Your wallet", sub: "Plaintext amount" },
      { x: 240, y: 90, label: "FHE encrypt", sub: "In-browser" },
      { x: 420, y: 90, label: "ocUSDC contract", sub: "FHE.add / .sub" },
      { x: 600, y: 90, label: "Recipient", sub: "Sees own balance only" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  receive: {
    title: "How a stealth payment reaches you",
    subtitle: "A fresh address per payment — nobody can link them back to you.",
    nodes: [
      { x: 60, y: 90, label: "Sender", sub: "Generates stealth addr" },
      { x: 240, y: 90, label: "Stealth registry", sub: "Encrypted meta-addr" },
      { x: 420, y: 90, label: "On-chain note", sub: "Encrypted recipient" },
      { x: 600, y: 90, label: "Your inbox", sub: "Scan & decrypt" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  escrow: {
    title: "How an encrypted Escrow settles",
    subtitle: "Funds and conditions are both encrypted. Resolver releases on a sealed verdict.",
    nodes: [
      { x: 60, y: 50, label: "Payer", sub: "Locks ocUSDC" },
      { x: 320, y: 50, label: "Escrow", sub: "Encrypted vault" },
      { x: 580, y: 50, label: "Payee", sub: "Receives on release" },
      { x: 320, y: 160, label: "Resolver", sub: "Encrypted verdict" },
    ],
    edges: [[0, 1], [1, 2], [3, 1]],
  },
  stream: {
    title: "How encrypted Payroll Streams pay out",
    subtitle: "Salary cycles tick on-chain — amounts and recipients stay sealed.",
    nodes: [
      { x: 60, y: 90, label: "Employer", sub: "Encrypted rate" },
      { x: 240, y: 90, label: "PayStream", sub: "FHE accrual" },
      { x: 420, y: 90, label: "Cycle tick", sub: "Per epoch" },
      { x: 600, y: 90, label: "Stealth payee", sub: "Encrypted credit" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  crosschain: {
    title: "How USDC bridges into shielded ocUSDC",
    subtitle: "Public USDC enters via CCTP, then wraps to ocUSDC where it becomes private.",
    nodes: [
      { x: 60, y: 90, label: "Source chain", sub: "Public USDC" },
      { x: 240, y: 90, label: "CCTP burn", sub: "Verified" },
      { x: 420, y: 90, label: "Mint USDC", sub: "On Arbitrum" },
      { x: 600, y: 90, label: "Wrap → ocUSDC", sub: "Now encrypted" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  insurance: {
    title: "How payroll Insurance protects you",
    subtitle: "Premiums and payouts stay encrypted. Pool LPs back the policy.",
    nodes: [
      { x: 60, y: 50, label: "Buyer", sub: "Pays premium" },
      { x: 320, y: 50, label: "Pool", sub: "Encrypted reserves" },
      { x: 580, y: 50, label: "Payout", sub: "On missed cycle" },
      { x: 320, y: 160, label: "LPs", sub: "Stake & earn yield" },
    ],
    edges: [[0, 1], [1, 2], [3, 1]],
  },
  stealth: {
    title: "How Stealth Addresses hide your identity",
    subtitle: "One meta-address, infinite single-use receivers — unlinkable on-chain.",
    nodes: [
      { x: 60, y: 90, label: "Meta-addr", sub: "Registered once" },
      { x: 240, y: 90, label: "Sender derives", sub: "Fresh stealth addr" },
      { x: 420, y: 90, label: "Encrypted note", sub: "Posted on-chain" },
      { x: 600, y: 90, label: "You scan", sub: "Decrypt with key" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  "vote-cast": {
    title: "How an encrypted Vote is cast",
    subtitle: "Your ballot is sealed before it leaves the browser. Even after results, your vote stays private.",
    nodes: [
      { x: 60, y: 90, label: "Your choice", sub: "Plaintext ballot" },
      { x: 240, y: 90, label: "FHE seal", sub: "Encrypt locally" },
      { x: 420, y: 90, label: "Vote contract", sub: "Stores ciphertext" },
      { x: 600, y: 90, label: "Tally bucket", sub: "FHE.add aggregate" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  "vote-tally": {
    title: "How results are revealed without revealing voters",
    subtitle: "Only the aggregate is decrypted. Individual ballots remain encrypted forever.",
    nodes: [
      { x: 60, y: 90, label: "Sealed ballots", sub: "n encrypted votes" },
      { x: 240, y: 90, label: "FHE sum", sub: "Pure ciphertext math" },
      { x: 420, y: 90, label: "Threshold decrypt", sub: "CoFHE network" },
      { x: 600, y: 90, label: "Public result", sub: "Counts only" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
  "obs-claim": {
    title: "How $OBS distribution works",
    subtitle: "Daily claim → governance weight. No KYC, no whales — just consistency.",
    nodes: [
      { x: 60, y: 90, label: "Claim 100 $OBS", sub: "Every 24h" },
      { x: 240, y: 90, label: "Wallet credit", sub: "Visible to you" },
      { x: 420, y: 90, label: "Vote weight", sub: "Per ballot" },
      { x: 600, y: 90, label: "Influence", sub: "On proposals" },
    ],
    edges: [[0, 1], [1, 2], [2, 3]],
  },
};

const NODE_W = 130;
const NODE_H = 60;

/** Harmony palette for SVG (works inside .obscura-app) */
const C = {
  ink: "hsl(145 22% 14%)",
  muted: "hsl(145 12% 42%)",
  card: "hsl(48 33% 99%)",
  border: "hsl(145 14% 82%)",
  accent: "hsl(145 35% 38%)",
  accentSoft: "hsl(145 40% 92%)",
  grid: "hsl(145 14% 88%)",
  edge: "hsl(145 35% 45%)",
  packet: "hsl(145 42% 42%)",
};

interface SectionDiagramProps {
  flow: DiagramFlow;
  className?: string;
}

export default function SectionDiagram({ flow, className = "" }: SectionDiagramProps) {
  const spec = FLOWS[flow];
  if (!spec) return null;

  const uid = flow.replace(/[^a-z0-9]/gi, "");

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
    <div className={`section-diagram-host overflow-hidden rounded-2xl hairline bg-card p-6 ${className}`}>
      <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Diagram</p>
      <h3 className="mt-1 font-display text-xl text-foreground">{spec.title}</h3>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted-foreground">{spec.subtitle}</p>

      <div className="relative mt-5 w-full overflow-x-auto rounded-xl bg-muted/30 p-4">
        <svg viewBox="0 0 760 220" className="h-auto min-w-[640px] w-full" aria-hidden="true">
          <defs>
            <pattern id={`diag-grid-${uid}`} width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke={C.grid} strokeWidth="0.5" />
            </pattern>
            <marker
              id={`diag-arrow-${uid}`}
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6"
              markerHeight="6"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill={C.accent} fillOpacity="0.7" />
            </marker>
          </defs>

          <rect width="760" height="220" fill={`url(#diag-grid-${uid})`} rx="8" />

          {edgePaths.map((d, i) => (
            <g key={`edge-${i}`}>
              <path
                d={d}
                fill="none"
                stroke={C.edge}
                strokeOpacity="0.35"
                strokeWidth="1.25"
                strokeDasharray="4 4"
                markerEnd={`url(#diag-arrow-${uid})`}
              />
              <motion.circle
                r="5"
                fill={C.packet}
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
            </g>
          ))}

          {spec.nodes.map((n, i) => (
            <g key={`node-${i}`}>
              <motion.rect
                x={n.x}
                y={n.y}
                width={NODE_W}
                height={NODE_H}
                rx="10"
                fill={C.card}
                stroke={C.border}
                strokeWidth="1"
                initial={{ opacity: 0, y: n.y + 6 }}
                animate={{ opacity: 1, y: n.y }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
              />
              <g transform={`translate(${n.x + 10}, ${n.y + 12})`}>
                <rect x="0" y="0" width="14" height="14" rx="3" fill={C.accentSoft} stroke={C.accent} strokeWidth="0.8" />
                <path
                  d="M 4 6 v -1.5 a 3 3 0 0 1 6 0 v 1.5"
                  fill="none"
                  stroke={C.accent}
                  strokeWidth="0.8"
                />
                <rect x="3" y="6" width="8" height="5" rx="1" fill={C.accent} fillOpacity="0.25" />
              </g>
              <text
                x={n.x + 30}
                y={n.y + 26}
                fill={C.ink}
                fontSize="11"
                fontFamily="Instrument Serif, Georgia, serif"
                fontWeight="500"
              >
                {n.label}
              </text>
              {n.sub && (
                <text x={n.x + 30} y={n.y + 42} fill={C.muted} fontSize="9.5" fontFamily="JetBrains Mono, monospace">
                  {n.sub}
                </text>
              )}
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
          Encrypted packet
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="h-3 w-3 text-[hsl(var(--success))]" />
          FHE-protected node
        </span>
        <span className="ml-auto font-mono text-[10px] uppercase tracking-[0.2em]">CoFHE · Arbitrum Sepolia</span>
      </div>
    </div>
  );
}
