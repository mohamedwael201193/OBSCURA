import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Lock, Wallet, Users, Shield, ChevronDown, ChevronUp, LayoutDashboard, Send, ArrowDownToLine, FileText, Settings, Repeat, Globe2, Eye } from "lucide-react";
import { useAccount, useReadContract } from "wagmi";
import ObscuraNav from "@/components/ObscuraNav";
import ObscuraFooter from "@/components/ObscuraFooter";
import PayrollForm from "@/components/pay/PayrollForm";
import EmployeeList from "@/components/pay/EmployeeList";
import BalanceReveal from "@/components/pay/BalanceReveal";
import AuditView from "@/components/pay/AuditView";
import MintObsForm from "@/components/pay/MintObsForm";
import ObsBalanceReveal from "@/components/pay/ObsBalanceReveal";
import ClaimDailyObsForm from "@/components/pay/ClaimDailyObsForm";
import TransferForm from "@/components/pay/TransferForm";
import CreateEscrowForm from "@/components/pay/CreateEscrowForm";
import EscrowActions from "@/components/pay/EscrowActions";
import EscrowList from "@/components/pay/EscrowList";
import DashboardStats from "@/components/pay/DashboardStats";
import { usePermissions } from "@/hooks/usePermissions";
import { OBSCURA_PAY_ABI, OBSCURA_PAY_ADDRESS, OBSCURA_ESCROW_ADDRESS, OBSCURA_TOKEN_ADDRESS } from "@/config/contracts";
import CreateStreamForm from "@/components/pay-v4/CreateStreamForm";
import StreamList from "@/components/pay-v4/StreamList";
import CUSDCPanel from "@/components/pay-v4/CUSDCPanel";
import RegisterMetaAddressForm from "@/components/pay-v4/RegisterMetaAddressForm";
import StealthInbox from "@/components/pay-v4/StealthInbox";
import CrossChainFundForm from "@/components/pay-v4/CrossChainFundForm";
import BuyCoverageForm from "@/components/pay-v4/BuyCoverageForm";
import DisputeForm from "@/components/pay-v4/DisputeForm";

type Tab = "dashboard" | "pay" | "receive" | "escrows" | "streams" | "crosschain" | "insurance" | "stealth" | "admin";

const PayPage = () => {
  const { address, isConnected } = useAccount();
  const { isOwner, isEmployee, isAuditor } = usePermissions();
  const [privacyOpen, setPrivacyOpen] = useState(true);

  const { data: employeeCount } = useReadContract({
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
    functionName: "getEmployeeCount",
    query: { enabled: !!OBSCURA_PAY_ADDRESS },
  });

  const [tab, setTab] = useState<Tab>("dashboard");

  const tabs: { key: Tab; label: string; icon: typeof Users }[] = [
    { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { key: "pay", label: "Pay", icon: Send },
    { key: "receive", label: "Receive", icon: ArrowDownToLine },
    { key: "escrows", label: "Escrows", icon: FileText },
    { key: "streams", label: "Streams", icon: Repeat },
    { key: "crosschain", label: "Cross-Chain", icon: Globe2 },
    { key: "insurance", label: "Insurance", icon: Shield },
    { key: "stealth", label: "Stealth", icon: Eye },
    { key: "admin", label: "Admin", icon: Settings },
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
              Fully Encrypted Payments
            </span>
          </div>
          <h1 className="font-display text-3xl md:text-4xl text-foreground tracking-tight">
            Obscura<span className="text-primary text-glow">Pay</span>
          </h1>
          <p className="text-sm font-body text-muted-foreground mt-2 max-w-lg">
            Send, stream, and insure payments — all fully encrypted on-chain. Nobody (not even block explorers) can see amounts, recipients, or balances.
          </p>
          <div className="mt-3 flex flex-wrap gap-3 text-[9px] font-mono">
            <span className="px-2 py-1 rounded-sm border border-primary/20 bg-primary/5 text-primary">$OBS — governance token (claim free daily, pay employees, P2P transfers)</span>
            <span className="px-2 py-1 rounded-sm border border-cyan-500/20 bg-cyan-500/5 text-cyan-400">cUSDC — encrypted stablecoin (recurring streams, insurance, cross-chain)</span>
          </div>
        </motion.div>

        <div className="grid lg:grid-cols-[1fr_340px] gap-6">
          {/* Main content */}
          <div className="space-y-6">
            {/* Tab switcher */}
            <div className="flex gap-2 flex-wrap">
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
                  {isOwner ? "Owner/Employer" : isAuditor ? "Auditor" : isEmployee ? "Employee" : "Employer"}
                </span>
                <span className="text-muted-foreground/40">
                  ({address?.slice(0, 6)}...{address?.slice(-4)})
                </span>
              </div>
            )}

            <AnimatePresence mode="wait">
              {tab === "dashboard" && (
                <motion.div key="dashboard" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {/* Getting Started guide */}
                  <div className="glass-panel rounded-sm p-5 border-l-2 border-primary/40 space-y-3">
                    <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-primary">How It Works</h3>
                    <ol className="space-y-2 text-[10px] font-mono text-muted-foreground/80">
                      <li className="flex gap-2"><span className="text-primary font-bold">1.</span> <span><b className="text-foreground">Connect wallet</b> — MetaMask or any EVM wallet on Arbitrum Sepolia.</span></li>
                      <li className="flex gap-2"><span className="text-primary font-bold">2.</span> <span><b className="text-foreground">Claim free $OBS</b> — 100 tokens daily (below). Used for transfers, payroll and escrows.</span></li>
                      <li className="flex gap-2"><span className="text-primary font-bold">3.</span> <span><b className="text-foreground">Send encrypted payments</b> — Go to <b className="text-primary">Pay</b> tab. Amounts are encrypted before they leave your browser.</span></li>
                      <li className="flex gap-2"><span className="text-primary font-bold">4.</span> <span><b className="text-foreground">Stream with cUSDC</b> — Go to <b className="text-primary">Streams</b> tab. Recurring payroll using real encrypted USDC (cUSDC).</span></li>
                      <li className="flex gap-2"><span className="text-primary font-bold">5.</span> <span><b className="text-foreground">Check balances</b> — Go to <b className="text-primary">Receive</b> tab. Sign a permit to decrypt your balances locally.</span></li>
                    </ol>
                    <div className="text-[9px] font-mono text-muted-foreground/50 pt-1 border-t border-border/30">
                      All encryption uses <span className="text-primary">Fhenix CoFHE</span> (Fully Homomorphic Encryption). Your data stays encrypted even while the smart contract processes it.
                    </div>
                  </div>
                  <DashboardStats />
                  <ClaimDailyObsForm />
                </motion.div>
              )}

              {tab === "pay" && (
                <motion.div key="pay" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {!isConnected ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Wallet className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Connect your wallet to send payments</p>
                    </div>
                  ) : (
                    <>
                      <div className="glass-panel rounded-sm p-4 border-l-2 border-primary/40 space-y-2">
                        <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-primary">Send Encrypted $OBS Payments</h3>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          Use $OBS (Obscura's encrypted governance token) for instant P2P transfers and batch payroll.
                          Amounts are encrypted in your browser before they ever touch the blockchain.
                          For real USDC payroll, use the <b className="text-cyan-400">Streams</b> tab.
                        </p>
                      </div>
                      <TransferForm />
                      <PayrollForm />
                      <EmployeeList />
                    </>
                  )}
                </motion.div>
              )}

              {tab === "receive" && (
                <motion.div key="receive" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {!isConnected ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Wallet className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Connect your wallet to view your encrypted balances</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="glass-panel rounded-sm p-4 border-l-2 border-primary/40 space-y-2">
                        <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-primary">Your Encrypted Balances</h3>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          Your balances are stored fully encrypted on-chain. To see them, you sign a one-time permit with your wallet — this proves you own the account without sending a transaction.
                          No one else can ever see your balances.
                        </p>
                        <div className="flex gap-3 text-[9px] font-mono">
                          <span className="px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">Payroll Balance — $OBS from employer</span>
                          <span className="px-2 py-0.5 rounded-sm bg-primary/10 text-primary border border-primary/20">Token Balance — $OBS claimed or received</span>
                        </div>
                      </div>
                      <ClaimDailyObsForm />
                      <BalanceReveal />
                      <ObsBalanceReveal />
                    </div>
                  )}
                </motion.div>
              )}

              {tab === "escrows" && (
                <motion.div key="escrows" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {!isConnected ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Wallet className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Connect your wallet to manage escrows</p>
                    </div>
                  ) : (
                    <>
                      <div className="glass-panel rounded-sm p-4 border-l-2 border-primary/40 space-y-2">
                        <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-primary">Encrypted Escrows</h3>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          An escrow locks $OBS until conditions are met (time-lock, manual release, or both).
                          The locked amount and owner address are fully encrypted — only the escrow creator can see the details.
                          Unauthorized redemption attempts succeed but return zero tokens (no error = no information leak).
                        </p>
                      </div>
                      <CreateEscrowForm />
                      <EscrowActions />
                      <EscrowList />
                    </>
                  )}
                </motion.div>
              )}

              {tab === "streams" && (
                <motion.div key="streams" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {!isConnected ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Wallet className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Connect your wallet to manage cUSDC streams</p>
                    </div>
                  ) : (
                    <>
                      <div className="glass-panel rounded-sm p-4 border-l-2 border-cyan-500/40 space-y-2">
                        <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-cyan-400">Recurring Payroll with cUSDC</h3>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          Streams let employers schedule automatic encrypted salary payments using <b className="text-cyan-400">cUSDC</b> (encrypted USDC stablecoin).
                          Each pay cycle creates a private escrow sent to the employee&apos;s stealth address — no one can link payments to the recipient.
                        </p>
                        <ol className="space-y-1 text-[9px] font-mono text-muted-foreground/60">
                          <li><span className="text-cyan-400">Step 1:</span> Get cUSDC — wrap regular USDC below, or bridge from another chain via Cross-Chain tab.</li>
                          <li><span className="text-cyan-400">Step 2:</span> Approve the PayStream contract to spend your cUSDC.</li>
                          <li><span className="text-cyan-400">Step 3:</span> Create a stream (set recipient, cadence, duration).</li>
                          <li><span className="text-cyan-400">Step 4:</span> Tick each cycle to send encrypted payment to a new stealth address.</li>
                        </ol>
                      </div>
                      <CUSDCPanel />
                      <CreateStreamForm />
                      <StreamList mode="employer" />
                      <StreamList mode="recipient" />
                    </>
                  )}
                </motion.div>
              )}

              {tab === "crosschain" && (
                <motion.div key="crosschain" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {!isConnected ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Wallet className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Connect your wallet to fund across chains</p>
                    </div>
                  ) : (
                    <>
                      <div className="glass-panel rounded-sm p-4 border-l-2 border-cyan-500/40 space-y-2">
                        <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-cyan-400">Bridge & Fund in One Step</h3>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          Send USDC from Ethereum Sepolia directly into an Obscura escrow on Arbitrum — no manual bridging needed.
                          Uses Circle&apos;s CCTP V2 with hooks to auto-convert and deposit in a single transaction.
                        </p>
                        <ol className="space-y-1 text-[9px] font-mono text-muted-foreground/60">
                          <li><span className="text-cyan-400">1.</span> Get Sepolia USDC from <span className="text-cyan-400">faucet.circle.com</span></li>
                          <li><span className="text-cyan-400">2.</span> Enter the escrow ID you want to fund below</li>
                          <li><span className="text-cyan-400">3.</span> Your wallet will switch to Sepolia, burn USDC, and it auto-arrives on Arb Sepolia as encrypted cUSDC</li>
                        </ol>
                      </div>
                      <CrossChainFundForm />
                    </>
                  )}
                </motion.div>
              )}

              {tab === "insurance" && (
                <motion.div key="insurance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {!isConnected ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Wallet className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Connect your wallet to buy coverage</p>
                    </div>
                  ) : (
                    <>
                      <div className="glass-panel rounded-sm p-4 border-l-2 border-cyan-500/40 space-y-2">
                        <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-cyan-400">Payroll Insurance</h3>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          Protect yourself as an employee: if your employer misses a payroll cycle, you can file a dispute and get paid from the insurance pool.
                          Everything — premium, coverage amount, dispute outcome — stays fully encrypted.
                        </p>
                        <ol className="space-y-1 text-[9px] font-mono text-muted-foreground/60">
                          <li><span className="text-cyan-400">1.</span> Buy coverage on a specific pay cycle (enter stream + escrow ID below).</li>
                          <li><span className="text-cyan-400">2.</span> If the employer misses it, file a dispute with the missed cycle number.</li>
                          <li><span className="text-cyan-400">3.</span> The on-chain judge evaluates encrypted evidence and pays out automatically.</li>
                        </ol>
                      </div>
                      <BuyCoverageForm />
                      <DisputeForm />
                    </>
                  )}
                </motion.div>
              )}

              {tab === "stealth" && (
                <motion.div key="stealth" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {!isConnected ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Wallet className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Connect your wallet to manage stealth addresses</p>
                    </div>
                  ) : (
                    <>
                      <div className="glass-panel rounded-sm p-4 border-l-2 border-cyan-500/40 space-y-2">
                        <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-cyan-400">Stealth Addresses — Receive Privately</h3>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          Stealth addresses hide <i>who</i> is being paid. Each payroll cycle goes to a brand new address that only you can link back to yourself.
                          No one watching the blockchain can tell you received anything.
                        </p>
                        <ol className="space-y-1 text-[9px] font-mono text-muted-foreground/60">
                          <li><span className="text-cyan-400">1.</span> <b className="text-foreground">Generate a meta-address</b> (one-time setup below). This creates a keypair stored in your browser.</li>
                          <li><span className="text-cyan-400">2.</span> <b className="text-foreground">Share it on-chain</b> so your employer can send to you.</li>
                          <li><span className="text-cyan-400">3.</span> <b className="text-foreground">Scan your inbox</b> below to find cycles addressed to you.</li>
                          <li><span className="text-cyan-400">4.</span> <b className="text-foreground">Reveal the claim key</b> for each cycle, import it into a new wallet, and redeem the escrow.</li>
                        </ol>
                      </div>
                      <RegisterMetaAddressForm />
                      <StealthInbox />
                    </>
                  )}
                </motion.div>
              )}

              {tab === "admin" && (
                <motion.div key="admin" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-4">
                  {!isConnected ? (
                    <div className="glass-panel rounded-sm p-8 text-center">
                      <Wallet className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                      <p className="text-sm font-mono text-muted-foreground">Connect your wallet to access admin functions</p>
                    </div>
                  ) : (
                    <>
                      {(isAuditor || isOwner) && <AuditView />}
                      {isOwner && <MintObsForm />}
                      {!isAuditor && !isOwner && (
                        <div className="glass-panel rounded-sm p-8 text-center">
                          <Shield className="w-8 h-8 text-primary/40 mx-auto mb-3" />
                          <p className="text-sm font-mono text-muted-foreground">Admin/Auditor access required for this tab.</p>
                        </div>
                      )}
                    </>
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
                      <div className="text-[9px] font-mono text-muted-foreground/60 mb-2">
                        Everything below is encrypted on-chain. Only the listed roles can decrypt.
                      </div>
                      {[
                        {
                          handle: "Salary Balance",
                          type: "euint64",
                          label: "$OBS payroll balance — only you see your salary",
                          acl: ["Employee"],
                        },
                        {
                          handle: "Payroll Total",
                          type: "euint64",
                          label: "Aggregate of all salaries — for auditing",
                          acl: ["Auditor"],
                        },
                        {
                          handle: "Escrow Deposit",
                          type: "eaddress + euint64",
                          label: "Escrow owner + amount — $OBS or cUSDC",
                          acl: ["Creator", "Owner"],
                        },
                        {
                          handle: "P2P Transfer",
                          type: "euint64",
                          label: "Transfer amount — $OBS token sends",
                          acl: ["Sender", "Recipient"],
                        },
                        {
                          handle: "cUSDC Stream",
                          type: "euint64",
                          label: "Per-cycle salary — cUSDC payroll streams",
                          acl: ["Employer", "Stealth Recipient"],
                        },
                        {
                          handle: "Insurance Coverage",
                          type: "euint64 + ebool",
                          label: "Coverage amount, premium & dispute outcome",
                          acl: ["Holder", "Pool"],
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
                        <div>Pay: <span className="text-foreground/70">{OBSCURA_PAY_ADDRESS ? `${OBSCURA_PAY_ADDRESS.slice(0, 10)}...${OBSCURA_PAY_ADDRESS.slice(-6)}` : "Not deployed"}</span></div>
                        <div>Token: <span className="text-foreground/70">{OBSCURA_TOKEN_ADDRESS ? `${OBSCURA_TOKEN_ADDRESS.slice(0, 10)}...${OBSCURA_TOKEN_ADDRESS.slice(-6)}` : "Not deployed"}</span></div>
                        <div>Escrow: <span className="text-foreground/70">{OBSCURA_ESCROW_ADDRESS ? `${OBSCURA_ESCROW_ADDRESS.slice(0, 10)}...${OBSCURA_ESCROW_ADDRESS.slice(-6)}` : "Not deployed"}</span></div>
                        <div>Network: <span className="text-primary">Arbitrum Sepolia (421614)</span></div>
                        <div>FHE Ops: <span className="text-foreground/70">asEuint64, asEaddress, eq, select, and, not, add, sub, gte, allow</span></div>
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
                  { name: "ObscuraEscrow", wave: 1, active: true },
                  { name: "ObscuraToken ($OBS)", wave: 1, active: true },
                  { name: "PayStream (cUSDC)", wave: 2, active: true },
                  { name: "StealthRegistry", wave: 2, active: true },
                  { name: "PayrollInsurance", wave: 2, active: true },
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
