import { motion } from "framer-motion";
import { BarChart3, Hash, Users, Shield, ExternalLink, Clock, Activity, Wifi, Lock } from "lucide-react";
import { useAccount } from "wagmi";
import { useProposalCount, useVoterParticipation } from "@/hooks/useProposals";
import { OBSCURA_VOTE_ADDRESS } from "@/config/contracts";
import { useVoteActivity } from "@/hooks/useVoteActivity";
import { useChainTime } from "@/hooks/useChainTime";

const DEPLOY_DATE = "Apr 2025";
const NETWORK = "Arbitrum Sepolia";
const CHAIN_ID = 421614;

export default function VoteDashboard() {
  const { address, isConnected } = useAccount();
  const { data: proposalCount } = useProposalCount();
  const { data: participation } = useVoterParticipation(address as `0x${string}` | undefined);
  const activityEvents = useVoteActivity();
  const chainTime = useChainTime();

  const chainTimeStr = new Date(Number(chainTime) * 1000).toLocaleTimeString([], {
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });

  const stats = [
    {
      label: "Total Proposals",
      value: proposalCount?.toString() ?? "0",
      icon: BarChart3,
      color: "text-blue-400",
    },
    {
      label: "Your Votes Cast",
      value: isConnected ? (participation?.toString() ?? "0") : "—",
      icon: Hash,
      color: "text-green-400",
    },
    {
      label: "Vote Power",
      value: isConnected ? "1" : "—",
      icon: Shield,
      color: "text-violet-400",
    },
    {
      label: "Chain Time",
      value: chainTimeStr,
      icon: Wifi,
      color: "text-amber-400",
      title: "Arbitrum Sepolia block timestamp — all deadlines are based on this clock",
    },
  ];

  return (
    <div className="space-y-4">
      {/* FHE Privacy Banner */}
      <div className="flex items-center gap-2 p-3 rounded-lg border border-violet-500/15 bg-violet-500/[0.04]">
        <Lock className="w-3.5 h-3.5 text-violet-400 shrink-0" />
        <p className="text-[11px] text-violet-300/70">
          Your vote is{" "}
          <span className="text-violet-300 font-semibold">sealed by FHE</span>{" "}
          — no one sees your choice until results are final. Coercion-resistant by design.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="pay-card rounded-md p-4 text-center"
            title={"title" in stat ? (stat as any).title : undefined}
          >
            <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
            <div className="font-display text-lg text-foreground">{stat.value}</div>
            <div className="text-[11px] text-muted-foreground/50 tracking-[0.15em] uppercase mt-1">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Contract status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="pay-card rounded-md p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-sm tracking-[0.2em] uppercase text-emerald-400 font-mono">
            Contract Status
          </span>
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <div className="rounded-lg bg-white/[0.025] border border-white/[0.06] p-3 space-y-1">
            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em]">Contract</div>
            <a
              href={`https://sepolia.arbiscan.io/address/${OBSCURA_VOTE_ADDRESS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-emerald-400 hover:underline inline-flex items-center gap-1"
            >
              {OBSCURA_VOTE_ADDRESS.slice(0, 8)}...{OBSCURA_VOTE_ADDRESS.slice(-6)}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
          <div className="rounded-lg bg-white/[0.025] border border-white/[0.06] p-3 space-y-1">
            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em]">Network</div>
            <div className="font-mono text-xs text-emerald-400">{NETWORK} ({CHAIN_ID})</div>
          </div>
          <div className="rounded-lg bg-white/[0.025] border border-white/[0.06] p-3 space-y-1">
            <div className="text-[10px] text-muted-foreground/50 uppercase tracking-[0.15em]">Deployed</div>
            <div className="font-mono text-xs text-foreground/70">{DEPLOY_DATE}</div>
          </div>
        </div>
      </motion.div>

      {/* Live activity feed */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="pay-card rounded-md p-4"
      >
        <div className="flex items-center gap-2 mb-3">
          <Activity className="w-4 h-4 text-emerald-400" />
          <span className="text-sm tracking-[0.2em] uppercase text-emerald-400 font-mono">
            Live Activity
          </span>
          <span className="ml-auto text-[10px] text-muted-foreground">last {Math.min(activityEvents.length, 5)} events</span>
        </div>
        {activityEvents.length === 0 ? (
          <div className="text-[12px] text-muted-foreground/50 text-center py-4">
            Watching for new votes, proposals &amp; finalizations…
          </div>
        ) : (
          <div className="space-y-2">
            {activityEvents.slice(0, 5).map((evt) => (
              <motion.div
                key={evt.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex items-start gap-2.5 text-xs"
              >
                <span className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${
                  evt.type === "vote" ? "bg-blue-400" :
                  evt.type === "proposal" ? "bg-green-400" :
                  evt.type === "finalized" ? "bg-yellow-400" :
                  "bg-red-400"
                }`} />
                <div className="flex-1 text-foreground/80">{evt.message}</div>
                <div className="text-muted-foreground/40 shrink-0">
                  {new Date(evt.timestamp * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
