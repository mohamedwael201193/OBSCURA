import { motion } from "framer-motion";
import { BarChart3, Vote, Users, Coins, Shield, Hash } from "lucide-react";
import { useAccount } from "wagmi";
import { useProposalCount, useVoterParticipation } from "@/hooks/useProposals";
import { OBSCURA_VOTE_ADDRESS } from "@/config/contracts";

export default function VoteDashboard() {
  const { address, isConnected } = useAccount();
  const { data: proposalCount } = useProposalCount();
  const { data: participation } = useVoterParticipation(address as `0x${string}` | undefined);

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
      label: "Your Wallet",
      value: isConnected ? `${address?.slice(0, 6)}...${address?.slice(-4)}` : "Not Connected",
      icon: Users,
      color: isConnected ? "text-primary" : "text-muted-foreground",
    },
    {
      label: "Governance",
      value: "FHE Encrypted",
      icon: Coins,
      color: "text-purple-400",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel rounded-sm p-4 text-center"
          >
            <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
            <div className="font-display text-lg text-foreground">{stat.value}</div>
            <div className="text-[8px] font-mono text-muted-foreground tracking-[0.15em] uppercase mt-1">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Privacy info */}
      <div className="glass-panel rounded-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Vote className="w-4 h-4 text-primary" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-mono">
            Vote Privacy Model
          </span>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <PrivacyItem
            label="Individual Votes"
            type="euint64"
            acl="Contract + Voter (allowThis + allow)"
          />
          <PrivacyItem
            label="Aggregate Tally"
            type="euint64 × N options"
            acl="Public after finalization (allowPublic)"
          />
          <PrivacyItem
            label="Revote + Verify"
            type="eq + select + add"
            acl="Anti-coercion revote + self-decrypt ballot"
          />
        </div>
      </div>

      {/* FHE Operations summary */}
      <div className="glass-panel rounded-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-primary" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-mono">
            FHE Operations
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            { op: "asEuint64", desc: "Encrypt plaintext/input" },
            { op: "eq + select", desc: "Match option homomorphically" },
            { op: "add / sub", desc: "Tally & revote arithmetic" },
            { op: "allowPublic", desc: "Reveal aggregate after finalize" },
            { op: "allow", desc: "Voter self-verification" },
            { op: "allowThis", desc: "Contract retains access" },
          ].map((item) => (
            <div key={item.op} className="p-2 bg-secondary/30 rounded-sm border border-border/30">
              <div className="text-[9px] font-mono text-primary font-semibold">{item.op}</div>
              <div className="text-[8px] font-mono text-muted-foreground/70 mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PrivacyItem({ label, type, acl }: { label: string; type: string; acl: string }) {
  return (
    <div className="p-3 bg-secondary/30 rounded-sm border border-border/30">
      <div className="text-[10px] font-mono text-foreground mb-1">{label}</div>
      <div className="text-[8px] font-mono text-muted-foreground">
        Type: <span className="text-primary">{type}</span>
      </div>
      <div className="text-[8px] font-mono text-muted-foreground">
        ACL: <span className="text-foreground/70">{acl}</span>
      </div>
    </div>
  );
}
