import { motion } from "framer-motion";
import { useReadContract, useAccount } from "wagmi";
import { OBSCURA_ESCROW_ABI, OBSCURA_ESCROW_ADDRESS } from "@/config/contracts";
import { Lock, FileText, Clock, CheckCircle } from "lucide-react";

export default function EscrowList() {
  const { address } = useAccount();

  const { data: escrowCount, isLoading } = useReadContract({
    address: OBSCURA_ESCROW_ADDRESS,
    abi: OBSCURA_ESCROW_ABI,
    functionName: "getEscrowCount",
    query: { enabled: !!OBSCURA_ESCROW_ADDRESS },
  });

  const count = Number(escrowCount ?? 0);
  // Show last 10 escrows max
  const escrowIds = Array.from({ length: Math.min(count, 10) }, (_, i) => count - 1 - i);

  return (
    <div className="glass-panel rounded-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm tracking-wider text-foreground flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Recent Escrows
        </h3>
        <span className="text-[9px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm">
          {count} total
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-secondary/30 rounded-sm animate-pulse" />
          ))}
        </div>
      ) : count === 0 ? (
        <div className="py-8 text-center">
          <div className="text-muted-foreground/30 text-sm font-mono">
            No escrows created yet
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {escrowIds.map((id, i) => (
            <EscrowRow key={id} escrowId={BigInt(id)} index={i} />
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-secondary/10 rounded-sm border border-border/20">
        <div className="text-[9px] font-mono text-muted-foreground/50">
          <Lock className="w-3 h-3 inline mr-1 text-primary/40" />
          Escrow amounts, owners, and status are all encrypted (eaddress, euint64, ebool).
          Only the creator can view partial details via FHE.allow().
        </div>
      </div>
    </div>
  );
}

function EscrowRow({ escrowId, index }: { escrowId: bigint; index: number }) {
  const { data: exists } = useReadContract({
    address: OBSCURA_ESCROW_ADDRESS,
    abi: OBSCURA_ESCROW_ABI,
    functionName: "exists",
    args: [escrowId],
    query: { enabled: !!OBSCURA_ESCROW_ADDRESS },
  });

  const { data: creator } = useReadContract({
    address: OBSCURA_ESCROW_ADDRESS,
    abi: OBSCURA_ESCROW_ABI,
    functionName: "getEscrowCreator",
    args: [escrowId],
    query: { enabled: !!OBSCURA_ESCROW_ADDRESS },
  });

  const { data: resolver } = useReadContract({
    address: OBSCURA_ESCROW_ADDRESS,
    abi: OBSCURA_ESCROW_ABI,
    functionName: "getConditionResolver",
    args: [escrowId],
    query: { enabled: !!OBSCURA_ESCROW_ADDRESS },
  });

  const isActive = exists as boolean;
  const hasCondition = resolver && resolver !== "0x0000000000000000000000000000000000000000";

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      className="flex items-center justify-between py-2 px-3 bg-secondary/20 rounded-sm"
    >
      <div className="flex items-center gap-3">
        <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[9px] font-mono text-muted-foreground">
          #{escrowId.toString()}
        </div>
        <div>
          <span className="text-xs font-mono text-foreground">
            Creator: {(creator as string)?.slice(0, 6)}...{(creator as string)?.slice(-4)}
          </span>
          <div className="flex items-center gap-1 mt-0.5">
            {hasCondition ? (
              <span className="text-[8px] font-mono text-yellow-400 flex items-center gap-0.5">
                <Clock className="w-2.5 h-2.5" /> Conditional
              </span>
            ) : (
              <span className="text-[8px] font-mono text-muted-foreground/60">Unconditional</span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {isActive ? (
          <span className="text-[8px] font-mono text-green-400 bg-green-400/10 px-2 py-0.5 rounded-sm flex items-center gap-1">
            <CheckCircle className="w-2.5 h-2.5" /> Active
          </span>
        ) : (
          <span className="text-[8px] font-mono text-red-400 bg-red-400/10 px-2 py-0.5 rounded-sm">
            Closed
          </span>
        )}
        <Lock className="w-3 h-3 text-primary/50" />
        <span className="text-[9px] font-mono text-primary/60 bg-primary/5 px-2 py-0.5 rounded-sm">
          ████████
        </span>
      </div>
    </motion.div>
  );
}
