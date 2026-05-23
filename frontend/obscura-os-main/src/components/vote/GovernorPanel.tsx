/**
 * GovernorPanel — Wave 5 Phase 8 (merged into VotePage)
 *
 * Surfaces the deployed OpenZeppelin Governor (0xE480…7186) + TimelockController
 * (0x07b7…9E05) + TreasuryStreamer (0x4af7…0FeD) inside the existing /vote sidebar.
 *
 * Voter weight is read from `voterParticipation(account)` on ObscuraVote V5 — a
 * public counter. Encrypted ballots inside ObscuraVote stay sealed; nothing here
 * decrypts FHE state.
 *
 * This component was extracted from the now-deleted GovernancePage.tsx as part of
 * the architecture refactor — see MASTER_REFACTOR_PLAN.md §2.
 */
import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Vote as VoteIcon,
  Plus,
  Shield,
  Clock,
  AlertCircle,
  CheckCircle2,
  Loader2,
  ExternalLink,
  Wallet as WalletIcon,
  Hash,
  Users,
  TimerReset,
} from "lucide-react";
import { useAccount } from "wagmi";
import { encodeFunctionData, isAddress } from "viem";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

import {
  OBSCURA_GOVERNOR_ADDRESS,
  OBSCURA_TIMELOCK_ADDRESS,
  OBSCURA_TREASURY_STREAMER_ADDRESS,
} from "@/abis/ObscuraGovernor";
import {
  useGovernorConfig,
  useGovernorProposals,
  useProposalState,
  useProposalVotes,
  useHasVotedGovernor,
  useGovernorPropose,
  useCastGovernorVote,
  useQueueProposal,
  useExecuteProposal,
  parseProposalDescription,
  type ProposalRow,
} from "@/hooks/useGovernor";
import { useVoterParticipation } from "@/hooks/useProposals";

const ARB_SCAN = "https://sepolia.arbiscan.io";

const stateTone: Record<string, string> = {
  Pending: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  Active: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Canceled: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  Defeated: "bg-red-500/15 text-red-300 border-red-500/30",
  Succeeded: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  Queued: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  Expired: "bg-zinc-500/15 text-zinc-300 border-zinc-500/30",
  Executed: "bg-violet-500/15 text-violet-300 border-violet-500/30",
};

const truncate = (addr: string) =>
  addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : "—";

const blocksToHours = (n?: bigint | null) => {
  if (!n) return "—";
  const seconds = Number(n) * 0.25; // Arbitrum Sepolia ~0.25s blocks
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
};

const NotConnected = ({ message }: { message: string }) => (
  <Card className="p-10 text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
      <WalletIcon className="w-5 h-5 text-emerald-400" />
    </div>
    <div className="font-display text-[15px] text-foreground mb-1">Wallet not connected</div>
    <p className="text-[12px] text-muted-foreground/65 max-w-sm mx-auto">{message}</p>
  </Card>
);

const StatTile = ({
  label,
  value,
  sub,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ComponentType<{ className?: string }>;
}) => (
  <div className="rounded-md border border-white/8 bg-white/[0.02] p-4 flex items-start gap-3">
    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
      <Icon className="w-4 h-4 text-emerald-400" />
    </div>
    <div className="min-w-0">
      <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/60">{label}</div>
      <div className="font-display text-[15px] text-foreground mt-0.5 truncate">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground/55 mt-0.5">{sub}</div>}
    </div>
  </div>
);

const VotesBar = ({
  forVotes,
  against,
  abstain,
}: {
  forVotes: bigint;
  against: bigint;
  abstain: bigint;
}) => {
  const total = forVotes + against + abstain;
  if (total === 0n) {
    return <div className="text-[11px] text-muted-foreground/55">No votes cast yet.</div>;
  }
  const pct = (n: bigint) => Number((n * 1000n) / total) / 10;
  return (
    <div className="space-y-1.5">
      <div className="flex h-1.5 rounded overflow-hidden bg-white/[0.04]">
        <div className="bg-emerald-500/80" style={{ width: `${pct(forVotes)}%` }} />
        <div className="bg-red-500/70" style={{ width: `${pct(against)}%` }} />
        <div className="bg-zinc-500/70" style={{ width: `${pct(abstain)}%` }} />
      </div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 font-mono">
        <span className="text-emerald-300">For {forVotes.toString()}</span>
        <span className="text-red-300">Against {against.toString()}</span>
        <span className="text-zinc-300">Abstain {abstain.toString()}</span>
      </div>
    </div>
  );
};

const ProposalCard = ({ row }: { row: ProposalRow }) => {
  const { label, refetch: refetchState } = useProposalState(row.proposalId);
  const { for: f, against, abstain, refetch: refetchVotes } = useProposalVotes(row.proposalId);
  const { hasVoted, refetch: refetchVoted } = useHasVotedGovernor(row.proposalId);
  const { castVote, isPending: voting } = useCastGovernorVote();
  const { queue, isPending: queueing } = useQueueProposal();
  const { execute, isPending: executing } = useExecuteProposal();

  const { title, body } = parseProposalDescription(row.description);
  const idStr = `0x${row.proposalId.toString(16).slice(0, 12)}…`;

  const doVote = async (support: 0 | 1 | 2) => {
    try {
      const hash = await castVote(row.proposalId, support);
      toast.success("Vote cast", { description: `tx ${hash.slice(0, 10)}…` });
      refetchVoted();
      refetchVotes();
      refetchState();
    } catch (e) {
      toast.error("Vote failed", { description: (e as Error).message });
    }
  };

  const doQueue = async () => {
    try {
      const hash = await queue(row);
      toast.success("Queued in timelock", { description: `tx ${hash.slice(0, 10)}…` });
      refetchState();
    } catch (e) {
      toast.error("Queue failed", { description: (e as Error).message });
    }
  };

  const doExecute = async () => {
    try {
      const hash = await execute(row);
      toast.success("Executed", { description: `tx ${hash.slice(0, 10)}…` });
      refetchState();
    } catch (e) {
      toast.error("Execute failed", { description: (e as Error).message });
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      <Card className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono tracking-[0.12em] text-muted-foreground/55">{idStr}</span>
              {label && (
                <Badge variant="outline" className={stateTone[label] ?? "bg-white/5 text-white/70"}>
                  {label}
                </Badge>
              )}
              {hasVoted && (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-300 border-emerald-500/30">
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Voted
                </Badge>
              )}
            </div>
            <h3 className="font-display text-[15px] text-foreground leading-snug">{title || "Untitled proposal"}</h3>
            <div className="text-[11px] text-muted-foreground/55 mt-1">
              Proposer{" "}
              <a
                href={`${ARB_SCAN}/address/${row.proposer}`}
                target="_blank"
                rel="noreferrer"
                className="font-mono hover:text-emerald-300"
              >
                {truncate(row.proposer)}
              </a>{" "}
              · ends block {row.voteEnd.toString()}
            </div>
          </div>
        </div>

        {body && (
          <p className="text-[12.5px] text-muted-foreground/80 leading-relaxed whitespace-pre-wrap">{body}</p>
        )}

        <VotesBar forVotes={f} against={against} abstain={abstain} />

        <Separator className="bg-white/5" />

        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              size="sm"
              variant="outline"
              onClick={() => doVote(1)}
              disabled={voting || hasVoted || label !== "Active"}
              className="border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10"
            >
              {voting ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
              For
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => doVote(0)}
              disabled={voting || hasVoted || label !== "Active"}
              className="border-red-500/30 text-red-300 hover:bg-red-500/10"
            >
              Against
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => doVote(2)}
              disabled={voting || hasVoted || label !== "Active"}
            >
              Abstain
            </Button>
          </div>
          <div className="flex items-center gap-2">
            {label === "Succeeded" && (
              <Button size="sm" onClick={doQueue} disabled={queueing}>
                {queueing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Queue
              </Button>
            )}
            {label === "Queued" && (
              <Button size="sm" onClick={doExecute} disabled={executing}>
                {executing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : null}
                Execute
              </Button>
            )}
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

const TREASURY_STREAMER_ABI_FRAG = [
  {
    type: "function",
    stateMutability: "nonpayable",
    name: "openStream",
    inputs: [
      { name: "recipient", type: "address" },
      { name: "ratePerSecond", type: "uint256" },
      { name: "startTime", type: "uint256" },
      { name: "endTime", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

const NewProposalForm = ({ onCreated }: { onCreated: () => void }) => {
  const { isConnected } = useAccount();
  const { propose, isPending } = useGovernorPropose();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [recipient, setRecipient] = useState("");
  const [ratePerSecond, setRatePerSecond] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const description = useMemo(() => {
    const t = title.trim();
    const b = body.trim();
    return b ? `${t}\n\n${b}` : t;
  }, [title, body]);

  const canSubmit = useMemo(() => {
    if (!isConnected || !title.trim()) return false;
    if (!isAddress(recipient)) return false;
    if (!/^\d+$/.test(ratePerSecond) || ratePerSecond === "0") return false;
    if (!/^\d+$/.test(startTime) || !/^\d+$/.test(endTime)) return false;
    return BigInt(endTime) > BigInt(startTime);
  }, [isConnected, title, recipient, ratePerSecond, startTime, endTime]);

  const submit = async () => {
    if (!canSubmit) return;
    const calldata = encodeFunctionData({
      abi: TREASURY_STREAMER_ABI_FRAG,
      functionName: "openStream",
      args: [
        recipient as `0x${string}`,
        BigInt(ratePerSecond),
        BigInt(startTime),
        BigInt(endTime),
      ],
    });
    try {
      const hash = await propose({
        targets: [OBSCURA_TREASURY_STREAMER_ADDRESS],
        values: [0n],
        calldatas: [calldata],
        description,
      });
      toast.success("Proposal submitted", { description: `tx ${hash.slice(0, 10)}…` });
      setTitle("");
      setBody("");
      setRecipient("");
      setRatePerSecond("");
      setStartTime("");
      setEndTime("");
      onCreated();
    } catch (e) {
      toast.error("Propose failed", { description: (e as Error).message });
    }
  };

  if (!isConnected) {
    return <NotConnected message="Connect your wallet to create a treasury proposal." />;
  }

  return (
    <Card className="p-5 space-y-4">
      <div>
        <h3 className="font-display text-[15px] text-foreground">Open a treasury stream</h3>
        <p className="text-[11.5px] text-muted-foreground/65 mt-1 leading-relaxed">
          Drafts a Governor proposal that — once approved and the 2-day timelock clears — calls{" "}
          <span className="font-mono text-foreground/70">openStream</span> on the Treasury Streamer (
          <span className="font-mono">{truncate(OBSCURA_TREASURY_STREAMER_ADDRESS)}</span>). No funds move until execution.
        </p>
      </div>

      <div className="space-y-2">
        <label className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground/60">Title</label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Stream 10k ocUSDC to grants committee"
        />
      </div>

      <div className="space-y-2">
        <label className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground/60">Body</label>
        <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} placeholder="Rationale, links, risk notes…" />
      </div>

      <Separator className="bg-white/5" />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-2 sm:col-span-2">
          <label className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground/60">Recipient address</label>
          <Input
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            placeholder="0x…"
            className="font-mono text-[12px]"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground/60">
            Rate per second (raw ocUSDC units)
          </label>
          <Input
            value={ratePerSecond}
            onChange={(e) => setRatePerSecond(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="100000"
            className="font-mono"
          />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground/60">Start timestamp (unix)</label>
          <Input
            value={startTime}
            onChange={(e) => setStartTime(e.target.value.replace(/[^\d]/g, ""))}
            placeholder={String(Math.floor(Date.now() / 1000))}
            className="font-mono"
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <label className="text-[11px] tracking-[0.14em] uppercase text-muted-foreground/60">End timestamp (unix)</label>
          <Input
            value={endTime}
            onChange={(e) => setEndTime(e.target.value.replace(/[^\d]/g, ""))}
            placeholder={String(Math.floor(Date.now() / 1000) + 30 * 86400)}
            className="font-mono"
          />
        </div>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-[11px] text-muted-foreground/55 max-w-md leading-relaxed">
          Voting weight is your <span className="text-foreground/80">on-chain participation</span> — a public count. Your
          encrypted ballots in Vote stay sealed.
        </p>
        <Button onClick={submit} disabled={!canSubmit || isPending}>
          {isPending ? (
            <>
              <Loader2 className="w-3 h-3 mr-2 animate-spin" />
              Submitting…
            </>
          ) : (
            <>
              <Plus className="w-3 h-3 mr-2" />
              Submit proposal
            </>
          )}
        </Button>
      </div>
    </Card>
  );
};

export function GovernorPanel({ wrongNetwork = false }: { wrongNetwork?: boolean }) {
  const { isConnected, address } = useAccount();
  const cfg = useGovernorConfig();
  const { proposals, isLoading, refresh } = useGovernorProposals();
  const participation = useVoterParticipation(address);

  const yourWeight =
    (participation.data as bigint | undefined) !== undefined ? (participation.data as bigint).toString() : "—";

  return (
    <div className="space-y-6">
      {wrongNetwork && (
        <Card className="p-4 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-300 text-[12px]">
            <AlertCircle className="w-4 h-4" />
            Wrong network. Please switch to <span className="font-mono">Arbitrum Sepolia (421614)</span>.
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile
          icon={Clock}
          label="Voting period"
          value={blocksToHours(cfg.votingPeriod)}
          sub={cfg.votingPeriod ? `${cfg.votingPeriod.toString()} blocks` : "—"}
        />
        <StatTile
          icon={Shield}
          label="Quorum"
          value={cfg.quorum ? `${cfg.quorum.toString()} votes` : "—"}
          sub="Adjustable via governance"
        />
        <StatTile icon={TimerReset} label="Timelock delay" value="2 days" sub={truncate(OBSCURA_TIMELOCK_ADDRESS)} />
        <StatTile
          icon={Users}
          label="Your voting weight"
          value={yourWeight}
          sub={isConnected ? "From on-chain participation" : "Connect to view"}
        />
      </div>

      <Card className="p-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
        <div className="space-y-0.5">
          <div className="text-muted-foreground/55 tracking-wider uppercase">Governor</div>
          <a
            href={`${ARB_SCAN}/address/${OBSCURA_GOVERNOR_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1"
          >
            {truncate(OBSCURA_GOVERNOR_ADDRESS)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="space-y-0.5">
          <div className="text-muted-foreground/55 tracking-wider uppercase">Timelock</div>
          <a
            href={`${ARB_SCAN}/address/${OBSCURA_TIMELOCK_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1"
          >
            {truncate(OBSCURA_TIMELOCK_ADDRESS)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
        <div className="space-y-0.5">
          <div className="text-muted-foreground/55 tracking-wider uppercase">Treasury Streamer</div>
          <a
            href={`${ARB_SCAN}/address/${OBSCURA_TREASURY_STREAMER_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="font-mono text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1"
          >
            {truncate(OBSCURA_TREASURY_STREAMER_ADDRESS)}
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </Card>

      <Tabs defaultValue="proposals">
        <TabsList>
          <TabsTrigger value="proposals">
            <Hash className="w-3.5 h-3.5 mr-1.5" />
            Proposals
          </TabsTrigger>
          <TabsTrigger value="new">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New proposal
          </TabsTrigger>
        </TabsList>

        <TabsContent value="proposals" className="space-y-3">
          {isLoading && proposals.length === 0 && (
            <Card className="p-10 text-center text-[12px] text-muted-foreground/60">
              <Loader2 className="w-4 h-4 inline mr-2 animate-spin" />
              Loading proposals from chain…
            </Card>
          )}

          {!isLoading && proposals.length === 0 && (
            <Card className="p-10 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
                <VoteIcon className="w-5 h-5 text-emerald-400" />
              </div>
              <div className="font-display text-[15px] text-foreground mb-1">No proposals yet</div>
              <p className="text-[12px] text-muted-foreground/65 max-w-sm mx-auto">
                Be the first to propose a treasury action. Switch to the <span className="text-emerald-300">New proposal</span> tab.
              </p>
            </Card>
          )}

          {proposals.map((p) => (
            <ProposalCard key={p.proposalId.toString()} row={p} />
          ))}
        </TabsContent>

        <TabsContent value="new">
          <NewProposalForm onCreated={refresh} />
        </TabsContent>
      </Tabs>

      <p className="text-[11px] text-center text-muted-foreground/45 pt-2">
        Powered by OpenZeppelin Governor · TimelockController ·{" "}
        <span className="text-foreground/65">2-day delay</span> ·{" "}
        <span className="text-emerald-400/80">privacy-preserved ballots</span>
      </p>
    </div>
  );
}

export default GovernorPanel;
