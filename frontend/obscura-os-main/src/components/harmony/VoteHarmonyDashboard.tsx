import { motion } from "framer-motion";
import { ShieldCheck, Timer, Users, Vote as VoteIcon } from "lucide-react";
export function VoteHarmonyDashboard({
  onNewProposal,
  onDelegate,
}: {
  onNewProposal: () => void;
  onDelegate: () => void;
}) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Institutional governance · Confidential
          </p>
          <h1 className="mt-2 font-display text-5xl leading-none md:text-6xl">Obscura Vote</h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onNewProposal}
            className="h-10 rounded-full bg-foreground px-4 text-sm font-medium text-background"
          >
            New proposal
          </button>
          <button type="button" onClick={onDelegate} className="h-10 rounded-full hairline px-4 text-sm">
            Delegate
          </button>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        {[
          { i: VoteIcon, l: "Voting power", v: "OBS · sealed", c: "text-violet-500" },
          { i: Users, l: "Active voters · 30d", v: "On-chain", c: "text-emerald-500" },
          { i: Timer, l: "Next reveal", v: "After deadline", c: "text-amber-500" },
          { i: ShieldCheck, l: "Treasury", v: "Encrypted", c: "text-sky-500" },
        ].map((k) => (
          <div key={k.l} className="rounded-2xl hairline bg-card p-5">
            <div className="flex items-center gap-2 text-muted-foreground">
              <k.i className={`h-4 w-4 ${k.c}`} />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em]">{k.l}</span>
            </div>
            <p className="mt-3 font-display text-3xl">{k.v}</p>
          </div>
        ))}
      </motion.div>

      <div className="mt-10 overflow-hidden rounded-2xl hairline bg-card">
        <div className="grid items-center gap-8 p-8 md:grid-cols-12 md:p-10">
          <div className="md:col-span-7">
            <div className="flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              <span className="rounded-full bg-accent/20 px-2 py-0.5 text-accent-foreground">Featured</span>
              <span>Confidential polls</span>
            </div>
            <p className="mt-4 font-display text-3xl leading-tight md:text-4xl">
              Encrypted ballots and executable proposals in one workspace.
            </p>
            <p className="mt-4 max-w-xl text-sm text-muted-foreground">
              Ballots remain ciphertext until the reveal block. Tallies are produced by the threshold network.
            </p>
            <div className="mt-8">
              <div className="flex h-2 overflow-hidden rounded-full">
                <div className="bg-[hsl(var(--success))]" style={{ width: "62%" }} />
                <div className="bg-destructive/70" style={{ width: "28%" }} />
                <div className="bg-muted-foreground/40" style={{ width: "10%" }} />
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-foreground p-6 text-background md:col-span-5">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">Cast confidential ballot</p>
            <div className="mt-4 space-y-2">
              {["For", "Against", "Abstain"].map((c, i) => (
                <button
                  key={c}
                  type="button"
                  className={`flex w-full items-center justify-between rounded-lg px-4 py-3 text-left ${
                    i === 0 ? "bg-accent text-accent-foreground" : "bg-white/5 hover:bg-white/10"
                  }`}
                >
                  <span className="font-medium">{c}</span>
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] opacity-70">
                    {i === 0 ? "Open Cast Vote tab" : "•"}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={onNewProposal}
              className="mt-5 h-10 w-full rounded-full bg-accent text-sm font-medium text-accent-foreground"
            >
              Go to voting
            </button>
          </div>
        </div>
      </div>

    </>
  );
}
