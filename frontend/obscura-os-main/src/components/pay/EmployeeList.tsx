import { motion } from "framer-motion";
import { useReadContract } from "wagmi";
import { OBSCURA_PAY_ABI, OBSCURA_PAY_ADDRESS } from "@/config/contracts";
import { Lock, Users } from "lucide-react";

export default function EmployeeList() {
  const { data: employees, isLoading } = useReadContract({
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
    functionName: "getEmployees",
    query: { enabled: !!OBSCURA_PAY_ADDRESS },
  });

  const { data: employeeCount } = useReadContract({
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
    functionName: "getEmployeeCount",
    query: { enabled: !!OBSCURA_PAY_ADDRESS },
  });

  const addressList = (employees as `0x${string}`[]) ?? [];

  return (
    <div className="glass-panel rounded-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-sm tracking-wider text-foreground flex items-center gap-2">
          <Users className="w-4 h-4 text-primary" />
          Paid Employees
        </h3>
        <span className="text-[9px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded-sm">
          {employeeCount?.toString() ?? "0"} total
        </span>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 bg-secondary/30 rounded-sm animate-pulse"
            />
          ))}
        </div>
      ) : addressList.length === 0 ? (
        <div className="py-8 text-center">
          <div className="text-muted-foreground/30 text-sm font-mono">
            No employees paid yet
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {addressList.map((addr, i) => (
            <motion.div
              key={addr}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between py-2 px-3 bg-secondary/20 rounded-sm"
            >
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-secondary flex items-center justify-center text-[9px] font-mono text-muted-foreground">
                  {i + 1}
                </div>
                <span className="text-xs font-mono text-foreground">
                  {addr.slice(0, 6)}...{addr.slice(-4)}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Lock className="w-3 h-3 text-primary/50" />
                <span className="text-[9px] font-mono text-primary/60 bg-primary/5 px-2 py-0.5 rounded-sm">
                  ████████
                </span>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-4 p-3 bg-secondary/10 rounded-sm border border-border/20">
        <div className="text-[9px] font-mono text-muted-foreground/50">
          <Lock className="w-3 h-3 inline mr-1 text-primary/40" />
          Salary amounts are encrypted (euint64). Only the employee can decrypt
          their own balance via EIP-712 permit.
        </div>
      </div>
    </div>
  );
}
