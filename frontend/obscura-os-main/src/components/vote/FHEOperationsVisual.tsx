import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, Zap } from "lucide-react";

export interface FHEOp {
  op: string;
  desc: string;
  detail?: string;
  color: string;
}

/** Operations that run when a vote is CAST */
export function buildVoteOps(numOptions: number): FHEOp[] {
  return [
    {
      op: "asEuint64",
      desc: "Encrypt option index",
      detail: "Your choice never leaves the browser as plaintext — it's encrypted here before the transaction is signed.",
      color: "text-emerald-400",
    },
    {
      op: `FHE.eq × ${numOptions}`,
      desc: "Homomorphic match",
      detail: `Contract checks your encrypted vote against each of the ${numOptions} options — without ever knowing which one you picked.`,
      color: "text-blue-400",
    },
    {
      op: `FHE.select × ${numOptions}`,
      desc: "Encrypted increment",
      detail: "Returns encrypted 1 for your option, encrypted 0 for all others. Contract sees only ciphertext.",
      color: "text-violet-400",
    },
    {
      op: `FHE.add × ${numOptions}`,
      desc: "Tally update",
      detail: "Each option's encrypted tally grows (or stays the same) homomorphically. The contract never decrypts.",
      color: "text-amber-400",
    },
    {
      op: "FHE.allowThis",
      desc: "Contract retains access",
      detail: "The contract must keep ACL access to its own tallies between transactions so future votes can add to them.",
      color: "text-primary",
    },
    {
      op: "FHE.allow(you)",
      desc: "Voter self-verify",
      detail: "Only your wallet address is granted decrypt permission on your own ballot handle. Nobody else — not even the admin — can read your choice.",
      color: "text-green-400",
    },
  ];
}

/** Operations that run when a REVOTE is cast */
export function buildRevoteOps(numOptions: number): FHEOp[] {
  return [
    {
      op: "asEuint64",
      desc: "Encrypt new option",
      detail: "New choice encrypted in-browser.",
      color: "text-emerald-400",
    },
    {
      op: `FHE.eq × ${numOptions}`,
      desc: "Match old vote",
      detail: "Finds which tally to subtract from.",
      color: "text-red-400",
    },
    {
      op: `FHE.select+sub × ${numOptions}`,
      desc: "Subtract old vote",
      detail: "Old tally decremented homomorphically — your previous choice removed without being revealed.",
      color: "text-red-400",
    },
    {
      op: `FHE.eq+select+add × ${numOptions}`,
      desc: "Add new vote",
      detail: "New encrypted tally increment applied. The swap is atomic — privacy is maintained throughout.",
      color: "text-violet-400",
    },
    {
      op: "FHE.allowThis + FHE.allow(you)",
      desc: "Update ACL",
      detail: "Contract and voter access updated on the new vote handle.",
      color: "text-primary",
    },
  ];
}

/** Operations that run on FINALIZE */
export function buildFinalizeOps(numOptions: number): FHEOp[] {
  return [
    {
      op: `FHE.allowPublic × ${numOptions}`,
      desc: "Unlock aggregate tallies",
      detail: "Each option's tally handle is made publicly decryptable. Individual votes remain encrypted forever — only the totals are unlocked.",
      color: "text-yellow-400",
    },
  ];
}

interface Props {
  ops: FHEOp[];
  title?: string;
  animate?: boolean;
}

export default function FHEOperationsVisual({ ops, title, animate = true }: Props) {
  const [revealed, setRevealed] = useState(animate ? 0 : ops.length);

  useEffect(() => {
    if (!animate) { setRevealed(ops.length); return; }
    setRevealed(0);
    ops.forEach((_, i) => {
      setTimeout(() => setRevealed(i + 1), 200 + i * 350);
    });
  }, [ops, animate]);

  return (
    <div className="space-y-2">
      {title && (
        <div className="flex items-center gap-2 mb-3">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] tracking-[0.2em] uppercase text-primary font-mono">{title}</span>
        </div>
      )}
      <div className="space-y-1.5">
        <AnimatePresence>
          {ops.slice(0, revealed).map((op, i) => (
            <motion.div
              key={op.op}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25 }}
              className="flex items-start gap-3 p-2.5 bg-secondary/30 rounded-md border border-border/30"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-green-400 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-mono text-xs font-semibold ${op.color}`}>{op.op}</span>
                  <span className="text-[11px] text-muted-foreground/70">— {op.desc}</span>
                </div>
                {op.detail && (
                  <div className="text-[11px] text-muted-foreground/50 mt-0.5 leading-relaxed">{op.detail}</div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {animate && revealed < ops.length && (
          <div className="flex items-center gap-2 p-2.5 opacity-40">
            <Lock className="w-3.5 h-3.5 text-muted-foreground animate-pulse" />
            <span className="text-xs text-muted-foreground font-mono">Computing…</span>
          </div>
        )}
      </div>
    </div>
  );
}
