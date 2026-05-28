import { motion } from "framer-motion";
import { BarChart3, RotateCcw, ShieldCheck, Vote as VoteIcon } from "lucide-react";
export function VoteHarmonyDashboard({
  onVote,
  onParticipation,
  onOpenProposals,
}: {
  onVote: () => void;
  onParticipation: () => void;
  onOpenProposals: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Private governance
          </p>
          <h1 className="mt-2 font-display text-4xl leading-none md:text-6xl">Obscura Vote</h1>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground md:text-base">
            Cast private votes. Change your mind before the deadline. Only final totals are revealed.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onVote}
            className="h-10 rounded-full bg-foreground px-4 text-sm font-medium text-background"
          >
            Vote privately
          </button>
          <button type="button" onClick={onParticipation} className="h-10 rounded-full hairline px-4 text-sm">
            Participation
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-8 hidden gap-3 md:grid md:grid-cols-3"
      >
        {[
          { i: VoteIcon, l: "Vote", v: "Private choice", c: "text-emerald-600" },
          { i: RotateCcw, l: "Revote", v: "Until deadline", c: "text-amber-600" },
          { i: BarChart3, l: "Reveal", v: "Totals only", c: "text-sky-700" },
        ].map((k) => (
          <div key={k.l} className="rounded-xl hairline bg-card p-4">
            <div className="flex items-center gap-2 text-muted-foreground">
              <k.i className={`h-4 w-4 ${k.c}`} />
              <span className="font-mono text-[10px] uppercase tracking-[0.16em]">{k.l}</span>
            </div>
            <p className="mt-2 text-sm font-medium text-foreground">{k.v}</p>
          </div>
        ))}
      </motion.div>

      <div className="mt-6 rounded-xl hairline bg-card p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
              <ShieldCheck className="h-4 w-4 text-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">Your choice stays private.</p>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                Proposal details and participation are public, but the selected option stays encrypted. Reveal is explicit and aggregate-only.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenProposals}
            className="h-10 shrink-0 rounded-full hairline px-4 text-sm font-medium hover:bg-muted"
          >
            Review proposals
          </button>
        </div>
      </div>

    </>
  );
}
