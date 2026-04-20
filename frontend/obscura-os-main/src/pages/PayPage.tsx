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
import StakePoolForm from "@/components/pay-v4/StakePoolForm";

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
  const [streamRefreshKey, setStreamRefreshKey] = useState(0);
  const refreshStreams = () => setStreamRefreshKey((k) => k + 1);

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
                      <li className="flex gap-2"><span className="text-primary font-bold">4.</span> <span><b className="text-foreground">Stream with cUSDC</b> — Go to <b className="text-primary">Streams</b> tab. Follow the numbered step-by-step guide to set up encrypted payroll.</span></li>
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
                      {/* Recipient onboarding guide */}
                      <div className="glass-panel rounded-sm p-5 border-l-2 border-primary/40 space-y-3">
                        <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-primary">Getting Paid? Start Here</h3>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          If your employer is paying you through Obscura, follow these steps to receive encrypted payments:
                        </p>
                        <div className="grid gap-2">
                          {[
                            { n: "1", title: "Register Stealth Address", desc: "One-time setup below — lets your employer send to hidden addresses only you can claim" },
                            { n: "2", title: "Tell Your Employer", desc: "Share your wallet address — they'll create a stream pointing to you" },
                            { n: "3", title: "Check Incoming Streams", desc: "Streams paying you appear below once your employer sets them up" },
                            { n: "4", title: "Scan & Claim", desc: "Go to the Stealth tab to scan for incoming payments and claim funds" },
                          ].map((s) => (
                            <div key={s.n} className="flex items-start gap-3 p-2 rounded-sm bg-secondary/20 border border-border/20">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/20 border border-primary/30 text-primary text-[10px] font-mono flex items-center justify-center font-bold">{s.n}</span>
                              <div>
                                <div className="text-[10px] font-mono text-foreground font-medium">{s.title}</div>
                                <div className="text-[9px] font-mono text-muted-foreground/60">{s.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Step 1: Register stealth (recipient flow) */}
                      <div className="relative">
                        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-background text-[9px] font-mono text-primary border border-primary/30 rounded-sm z-10">STEP 1 — REGISTER</div>
                        <RegisterMetaAddressForm />
                      </div>

                      {/* Step 3: Incoming streams */}
                      <div className="relative">
                        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-background text-[9px] font-mono text-primary border border-primary/30 rounded-sm z-10">STEP 3 — INCOMING STREAMS</div>
                        <StreamList mode="recipient" />
                      </div>

                      {/* Existing balance reveals */}
                      <div className="glass-panel rounded-sm p-4 border-l-2 border-primary/40 space-y-2">
                        <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-primary">Your Encrypted Balances</h3>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          Your balances are stored fully encrypted on-chain. Sign a permit to decrypt them locally.
                        </p>
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
                      {/* Master guide — numbered steps */}
                      <div className="glass-panel rounded-sm p-5 border-l-2 border-cyan-500/40 space-y-3">
                        <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-cyan-400">Encrypted Payroll Streams — Complete Setup Guide</h3>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          Follow these steps in order. Each section below matches a step number.
                          cUSDC streams send encrypted salary to stealth addresses — nobody can see who gets paid or how much.
                        </p>
                        <div className="grid gap-2">
                          {[
                            { n: "1", title: "Get cUSDC", desc: "Wrap your USDC into encrypted cUSDC (one-time)" },
                            { n: "2", title: "Authorize PayStream", desc: "Let the stream contract move your cUSDC (one-time)" },
                            { n: "3", title: "Recipient Registers Stealth Address", desc: "The person you're paying must register once (Stealth Setup below)" },
                            { n: "4", title: "Create Stream", desc: "Set recipient, frequency, and duration" },
                            { n: "5", title: "Send Cycles", desc: "Each period, click Send Next Cycle to pay" },
                          ].map((s) => (
                            <div key={s.n} className="flex items-start gap-3 p-2 rounded-sm bg-secondary/20 border border-border/20">
                              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 text-[10px] font-mono flex items-center justify-center font-bold">{s.n}</span>
                              <div>
                                <div className="text-[10px] font-mono text-foreground font-medium">{s.title}</div>
                                <div className="text-[9px] font-mono text-muted-foreground/60">{s.desc}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Step 1 & 2: cUSDC wallet (wrap + authorize) */}
                      <div className="relative">
                        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-background text-[9px] font-mono text-cyan-400 border border-cyan-500/30 rounded-sm z-10">STEP 1 & 2</div>
                        <CUSDCPanel />
                      </div>

                      {/* Step 3: Stealth address registration (for recipient) */}
                      <div className="relative">
                        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-background text-[9px] font-mono text-cyan-400 border border-cyan-500/30 rounded-sm z-10">STEP 3 — RECIPIENT SETUP</div>
                        <div className="glass-panel rounded-sm p-5 pt-6 space-y-3 border border-cyan-500/10">
                          <p className="text-[10px] font-mono text-muted-foreground/70">
                            <b className="text-foreground">Important:</b> The recipient wallet must register a stealth address before you can send them payments.
                            If you&apos;re testing with your own wallet, register below. If paying someone else, they need to do this from their wallet.
                          </p>
                          <RegisterMetaAddressForm />
                        </div>
                      </div>

                      {/* Step 4: Create stream */}
                      <div className="relative">
                        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-background text-[9px] font-mono text-cyan-400 border border-cyan-500/30 rounded-sm z-10">STEP 4</div>
                        <CreateStreamForm onCreated={refreshStreams} />
                      </div>

                      {/* Step 5: Active streams + tick */}
                      <div className="relative">
                        <div className="absolute -top-2 left-4 px-2 py-0.5 bg-background text-[9px] font-mono text-cyan-400 border border-cyan-500/30 rounded-sm z-10">STEP 5</div>
                        <StreamList key={`emp-${streamRefreshKey}`} mode="employer" />
                      </div>

                      {/* Incoming streams */}
                      <StreamList key={`rec-${streamRefreshKey}`} mode="recipient" />
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
                        <h3 className="text-xs font-mono tracking-[0.15em] uppercase text-cyan-400">Bridge USDC to Arbitrum</h3>
                        <p className="text-[10px] font-mono text-muted-foreground/70">
                          Bridge USDC from Ethereum Sepolia to your wallet on Arbitrum Sepolia via Circle&apos;s CCTP.
                          Once it arrives, wrap USDC → cUSDC using the button on the Pay tab.
                        </p>
                        <ol className="space-y-1 text-[9px] font-mono text-muted-foreground/60">
                          <li><span className="text-cyan-400">1.</span> Get Sepolia USDC from <span className="text-cyan-400">faucet.circle.com</span></li>
                          <li><span className="text-cyan-400">2.</span> Enter the amount below and click Bridge USDC</li>
                          <li><span className="text-cyan-400">3.</span> Your wallet switches to Sepolia, burns USDC, and Circle mints it on Arb Sepolia (a few minutes)</li>
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
                      <StakePoolForm />
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
                        <div className="text-[9px] font-mono text-amber-400/80 bg-amber-500/10 px-3 py-2 rounded-sm border border-amber-500/20">
                          <b>Note:</b> You must register your stealth address before anyone can pay you via streams.
                          If you&apos;re setting up as a payroll recipient, do Step 1 below, then tell your employer to create a stream.
                          This is also available in the <b className="text-cyan-400">Streams</b> tab (Step 3).
                        </div>
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
