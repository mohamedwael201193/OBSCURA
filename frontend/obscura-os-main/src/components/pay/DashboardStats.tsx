import { motion } from "framer-motion";
import { Users, Lock, FileText, Coins, Shield, Activity } from "lucide-react";
import { useReadContract } from "wagmi";
import {
  OBSCURA_PAY_ABI,
  OBSCURA_PAY_ADDRESS,
  OBSCURA_ESCROW_ABI,
  OBSCURA_ESCROW_ADDRESS,
  OBSCURA_TOKEN_ABI,
  OBSCURA_TOKEN_ADDRESS,
} from "@/config/contracts";

export default function DashboardStats() {
  const { data: employeeCount } = useReadContract({
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
    functionName: "getEmployeeCount",
    query: { enabled: !!OBSCURA_PAY_ADDRESS },
  });

  const { data: paymentCount } = useReadContract({
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
    functionName: "getPaymentCount",
    query: { enabled: !!OBSCURA_PAY_ADDRESS },
  });

  const { data: escrowCount } = useReadContract({
    address: OBSCURA_ESCROW_ADDRESS,
    abi: OBSCURA_ESCROW_ABI,
    functionName: "getEscrowCount",
    query: { enabled: !!OBSCURA_ESCROW_ADDRESS },
  });

  const { data: totalClaims } = useReadContract({
    address: OBSCURA_TOKEN_ADDRESS,
    abi: OBSCURA_TOKEN_ABI,
    functionName: "totalClaims",
    query: { enabled: !!OBSCURA_TOKEN_ADDRESS },
  });

  const { data: totalMinted } = useReadContract({
    address: OBSCURA_TOKEN_ADDRESS,
    abi: OBSCURA_TOKEN_ABI,
    functionName: "totalMinted",
    query: { enabled: !!OBSCURA_TOKEN_ADDRESS },
  });

  const stats = [
    {
      label: "Employees Paid",
      value: employeeCount?.toString() ?? "0",
      icon: Users,
      color: "text-blue-400",
    },
    {
      label: "Payment Records",
      value: paymentCount?.toString() ?? "0",
      icon: Activity,
      color: "text-green-400",
    },
    {
      label: "Active Escrows",
      value: escrowCount?.toString() ?? "0",
      icon: FileText,
      color: "text-yellow-400",
    },
    {
      label: "Daily Claims",
      value: totalClaims?.toString() ?? "0",
      icon: Coins,
      color: "text-purple-400",
    },
    {
      label: "Mint Operations",
      value: totalMinted?.toString() ?? "0",
      icon: Shield,
      color: "text-pink-400",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {stats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="glass-panel rounded-sm p-4 text-center"
          >
            <stat.icon className={`w-5 h-5 mx-auto mb-2 ${stat.color}`} />
            <div className="font-display text-xl text-foreground">{stat.value}</div>
            <div className="text-[8px] font-mono text-muted-foreground tracking-[0.15em] uppercase mt-1">
              {stat.label}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Privacy summary card */}
      <div className="glass-panel rounded-sm p-4">
        <div className="flex items-center gap-2 mb-3">
          <Lock className="w-4 h-4 text-primary" />
          <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-mono">
            Privacy Status
          </span>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          <PrivacyItem
            label="Salary Balances"
            type="euint64"
            acl="Employee Only"
          />
          <PrivacyItem
            label="Escrow Amounts"
            type="euint64 + eaddress"
            acl="Creator + Owner"
          />
          <PrivacyItem
            label="Transfer Amounts"
            type="euint64"
            acl="Sender + Recipient"
          />
        </div>
      </div>
    </div>
  );
}

function PrivacyItem({
  label,
  type,
  acl,
}: {
  label: string;
  type: string;
  acl: string;
}) {
  return (
    <div className="p-3 bg-secondary/30 rounded-sm border border-border/30">
      <div className="text-[9px] font-mono text-primary mb-1">{label}</div>
      <div className="flex justify-between">
        <span className="text-[8px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">
          {type}
        </span>
        <span className="text-[8px] font-mono text-foreground/70 bg-secondary px-1.5 py-0.5 rounded-sm">
          {acl}
        </span>
      </div>
    </div>
  );
}
