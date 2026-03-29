import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock, Wallet, Eye, Users, Shield, ChevronDown, ChevronUp } from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import ObscuraNav from "@/components/ObscuraNav";
import ObscuraFooter from "@/components/ObscuraFooter";
import PayrollForm from "@/components/pay/PayrollForm";
import EmployeeList from "@/components/pay/EmployeeList";
import BalanceReveal from "@/components/pay/BalanceReveal";
import AuditView from "@/components/pay/AuditView";
import MintObsForm from "@/components/pay/MintObsForm";
import { usePermissions } from "@/hooks/usePermissions";
import { OBSCURA_PAY_ABI, OBSCURA_PAY_ADDRESS } from "@/config/contracts";
import { EXPLORER_URL } from "@/lib/constants";

type Tab = "employer" | "employee" | "auditor";

const PayPage = () => {
  const { address, isConnected } = useAccount();
  const { isOwner, isEmployee, isAuditor } = usePermissions();
  const [privacyOpen, setPrivacyOpen] = useState(true);

  // Read employees list for privacy panel
  const { data: employees } = useReadContract({
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

  // Auto-detect which tab to show based on connected wallet role
  const getDefaultTab = (): Tab => {
    if (isOwner) return "employer";
    if (isAuditor) return "auditor";
    if (isEmployee) return "employee";
    return "employer"; // Default for non-connected
  };

  const [tab, setTab] = useState<Tab>(getDefaultTab());

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "employer", label: "Employer", icon: Users },
    { key: "employee", label: "Employee", icon: Wallet },
    { key: "auditor", label: "Auditor", icon: Shield },
  ];

  return (
    <div className="min-h-screen bg-background">
      <ObscuraNav />

      <div className="pt-24 px-6 pb-16 max-w-[1400px] mx-auto">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-2">
            <span className="text-[10px] tracking-[0.3em] uppercase text-primary font-mono text-glow-sm">
              Wave 1 — Active
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground tracking-tight">
            Obscura<span className="text-primary text-glow">Pay</span>
          </h1>
          <p className="text-sm font-body text-muted-foreground mt-2 max-w-lg">
            Encrypted enterprise payroll. Employers pay, Arbiscan shows nothing, employees decrypt their salary.
          </p>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Main content */}
          <div className="space-y-6">
            {/* Tab switcher */}
            <div className="flex gap-2">
              {tabs.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-[10px] tracking-[0.15em] uppercase font-mono rounded-sm border transition-all ${
                    tab === t.key
                      ? "border-primary/40 text-primary bg-primary/5"
                      : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/20"
                  }`}
                >
                  <t.icon className="w-3.5 h-3.5" />
                  {t.label}
                </button>
              ))}
            </div>

            {/* Connected wallet role indicator */}
            {isConnected && (
              <div className="flex items-center gap-2 text-[9px] font-mono text-muted-foreground">
                <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                Connected as:{" "}
                <span className="text-primary">
                  {isOwner ? "Owner/Employer" : isAuditor ? "Auditor" : isEmployee ? "Employee" : "Unknown Role"}
                </span>
                <span className="text-muted-foreground/40">
                  ({address?.slice(0, 6)}...{address?.slice(-4)})
                </span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {tab === "employer" && (
                <motion.div key="employer" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {!isConnected ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Wallet className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Connect your wallet to access employer functions</p>
                    </div>
                  ) : !isOwner ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Lock className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Only the contract owner can access employer functions</p>
                    </div>
                  ) : (
                    <>
                      <PayrollForm />
                      <EmployeeList />
                      <MintObsForm />
                    </>
                  )}
                </motion.div>
              )}

              {tab === "employee" && (
                <motion.div key="employee" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {!isConnected ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Wallet className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Connect your wallet to view your encrypted balance</p>
                    </div>
                  ) : (
                    <BalanceReveal />
                  )}
                </motion.div>
              )}

              {tab === "auditor" && (
                <motion.div key="auditor" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {!isConnected ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Wallet className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Connect your wallet to access audit functions</p>
                    </div>
                  ) : !isAuditor && !isOwner ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Shield className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Auditor access required. Ask the contract owner to grant audit access.</p>
                    </div>
                  ) : (
                    <AuditView />
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Right sidebar — Privacy Panel */}
          <div className="space-y-4">
            <div className="glass-panel rounded-sm border-glow sticky top-24">
              <button
                onClick={() => setPrivacyOpen(!privacyOpen)}
                className="w-full p-4 flex items-center justify-between border-b border-border/50"
              >
                <span className="text-[10px] tracking-[0.2em] uppercase text-primary font-mono">◆ What's Private?</span>
                {privacyOpen ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />}
              </button>

              <AnimatePresence>
                {privacyOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-4 space-y-3">
                      {[
                        {
                          handle: OBSCURA_PAY_ADDRESS
                            ? `${OBSCURA_PAY_ADDRESS.slice(0, 6)}...bal`
                            : "Not deployed",
                          type: "euint64",
                          label: "Employee Balance",
                          acl: ["Contract", "Employee"],
                        },
                        {
                          handle: OBSCURA_PAY_ADDRESS
                            ? `${OBSCURA_PAY_ADDRESS.slice(0, 6)}...agg`
                            : "Not deployed",
                          type: "euint64",
                          label: "Aggregate Total",
                          acl: ["Contract", "Auditor"],
                        },
                      ].map((h, i) => (
                        <div key={`${h.handle}-${i}`} className="p-3 bg-secondary/30 rounded-sm border border-border/30">
                          <div className="flex justify-between mb-1.5">
                            <span className="text-[10px] font-mono text-primary">{h.handle}</span>
                            <span className="text-[8px] font-mono text-muted-foreground bg-secondary px-1.5 py-0.5 rounded-sm">{h.type}</span>
                          </div>
                          <div className="text-[9px] font-mono text-muted-foreground/60 mb-1.5">{h.label}</div>
                          <div className="flex gap-1.5">
                            {h.acl.map((a) => (
                              <span key={a} className="text-[8px] font-mono text-foreground/70 bg-secondary px-1.5 py-0.5 rounded-sm">{a}</span>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Contract info */}
                    <div className="p-4 border-t border-border/50">
                      <div className="text-[9px] font-mono text-muted-foreground/50 space-y-1">
                        <div>Contract: <span className="text-foreground/70">{OBSCURA_PAY_ADDRESS ? `${OBSCURA_PAY_ADDRESS.slice(0, 10)}...${OBSCURA_PAY_ADDRESS.slice(-6)}` : "Not deployed"}</span></div>
                        <div>Network: <span className="text-primary">Arbitrum Sepolia (421614)</span></div>
                        <div>FHE Ops: <span className="text-foreground/70">asEuint64, add, allow, allowThis</span></div>
                        <div>Employees: <span className="text-foreground/70">{employeeCount?.toString() ?? "0"}</span></div>
                      </div>
                    </div>

                    <div className="p-4 border-t border-border/50">
                      <Link to="/privacy" className="text-[9px] font-mono text-primary hover:underline">
                        View Privacy Center →
                      </Link>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Module sidebar */}
            <div className="glass-panel rounded-sm p-4">
              <div className="text-[9px] tracking-[0.2em] uppercase text-muted-foreground font-mono mb-3">Modules</div>
              <div className="space-y-1.5">
                {[
                  { name: "ObscuraPay", wave: 1, active: true },
                  { name: "ObscuraVote", wave: 2, locked: true },
                  { name: "ObscuraVault", wave: 3, locked: true },
                  { name: "ObscuraTrust", wave: 4, locked: true },
                  { name: "ObscuraMind", wave: 5, locked: true },
                ].map((m) => (
                  <div key={m.name} className={`flex items-center justify-between p-2 rounded-sm text-xs font-mono ${
                    m.active ? "bg-primary/10 text-primary border border-primary/20" : "text-muted-foreground/40"
                  }`}>
                    <span>{m.locked && <Lock className="w-3 h-3 inline mr-1.5 opacity-40" />}{m.name}</span>
                    <span className="text-[8px]">W{m.wave}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <ObscuraFooter />
    </div>
  );
};

export default PayPage;
