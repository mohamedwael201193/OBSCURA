import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import {
  LayoutDashboard,
  Send,
  ArrowDownToLine,
  FileText,
  Repeat,
  Globe2,
  Shield,
  Eye,
  Wallet as WalletIcon,
  Lock,
  Coins,
  Sparkles,
  Network,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Copy,
  ChevronDown,
} from "lucide-react";
import { Link } from "react-router-dom";

import { useNavigate } from "react-router-dom";
import SectionDiagram from "@/components/elite/SectionDiagram";
import EncryptedValue from "@/components/elite/EncryptedValue";

import AmbientBackground from "@/components/elite/AmbientBackground";
import DashboardSidebar, {
  SidebarSection,
} from "@/components/elite/DashboardSidebar";
import {
  PageHeader,
  Card,
  CardHeader,
  ActionGrid,
  ActionItem,
  HowItWorks,
  FeatureStrip,
  LinkRow,
} from "@/components/elite/Layout";

import CUSDCTransferForm from "@/components/pay-v4/CUSDCTransferForm";
import CUSDCEscrowForm from "@/components/pay-v4/CUSDCEscrowForm";
import CUSDCEscrowActions from "@/components/pay-v4/CUSDCEscrowActions";
import MyEscrows from "@/components/pay-v4/MyEscrows";
import CreateStreamForm from "@/components/pay-v4/CreateStreamForm";
import StreamList from "@/components/pay-v4/StreamList";
import CUSDCPanel from "@/components/pay-v4/CUSDCPanel";
import RegisterMetaAddressForm from "@/components/pay-v4/RegisterMetaAddressForm";
import StealthInbox from "@/components/pay-v4/StealthInbox";
import CrossChainFundForm from "@/components/pay-v4/CrossChainFundForm";
import BuyCoverageForm from "@/components/pay-v4/BuyCoverageForm";
import DisputeForm from "@/components/pay-v4/DisputeForm";
import StakePoolForm from "@/components/pay-v4/StakePoolForm";
import MyPolicies from "@/components/pay-v4/MyPolicies";
import ResolverManager from "@/components/pay-v4/ResolverManager";

import { useCUSDCBalance } from "@/hooks/useCUSDCBalance";

type Tab =
  | "dashboard"
  | "send"
  | "receive"
  | "escrows"
  | "streams"
  | "crosschain"
  | "insurance"
  | "stealth";

const sidebarSections: SidebarSection[] = [
  { items: [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "Modules",
    items: [
      { key: "pay", label: "Pay", icon: Coins },
      { key: "send", label: "Send", icon: Send },
      { key: "receive", label: "Receive", icon: ArrowDownToLine },
      { key: "escrows", label: "Escrows", icon: FileText },
      { key: "streams", label: "Streams", icon: Repeat },
      { key: "crosschain", label: "Cross-Chain", icon: Globe2 },
      { key: "insurance", label: "Insurance", icon: Shield },
    ],
  },
  {
    heading: "Resources",
    items: [
      { key: "docs", label: "Docs", icon: BookOpen },
      { key: "private", label: "What's Private?", icon: Lock },
    ],
  },
];

const actionItems: ActionItem[] = [
  { key: "send", label: "Send", description: "Encrypted payments", icon: Send },
  { key: "receive", label: "Receive", description: "Request payments", icon: ArrowDownToLine },
  { key: "escrows", label: "Escrows", description: "Secure escrows", icon: FileText },
  { key: "streams", label: "Streams", description: "Payroll & streaming", icon: Repeat },
  { key: "crosschain", label: "Cross-Chain", description: "Bridge assets", icon: Globe2 },
  { key: "insurance", label: "Insurance", description: "Payment coverage", icon: Shield },
];

const activeModules = [
  "Confidential cUSDC (cUSDC)",
  "Confidential Escrow",
  "PayStream",
  "Payroll Resolver",
  "Stealth Registry",
  "Payroll Insurance",
  "CCTP Bridge",
];

const dashboardSteps = [
  { title: "Connect wallet", description: "Connect your wallet on Arbitrum Sepolia." },
  { title: "Get cUSDC", description: <>Bridge USDC via <span className="text-emerald-300">Cross-Chain</span> tab, then wrap to cUSDC.</> },
  { title: "Send encrypted payments", description: <>Go to <span className="text-emerald-300">Send</span> tab. Amounts are encrypted before they leave your browser.</> },
  { title: "Stream payroll", description: <>Go to <span className="text-emerald-300">Streams</span> tab. Follow the guide to set up encrypted payroll.</> },
  { title: "Lock in escrow", description: <>Go to <span className="text-emerald-300">Escrows</span> tab. Create encrypted escrows with optional resolvers.</> },
  { title: "Insure payroll", description: <>Go to <span className="text-emerald-300">Insurance</span> tab. Buy coverage so you get paid even if your employer misses a cycle.</> },
];

const featureItems = [
  { icon: Lock, title: "End-to-End Encrypted", description: "FHE ensures your data stays private." },
  { icon: Sparkles, title: "Onchain & Verifiable", description: "Transparent infrastructure without revealing data." },
  { icon: Network, title: "No Middlemen", description: "You control your keys and your data." },
  { icon: Shield, title: "Built for Web3", description: "Native modules for DeFi, DAOs, and more." },
];

const NotConnected = ({ message }: { message: string }) => (
  <Card className="p-10 text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
      <WalletIcon className="w-5 h-5 text-emerald-400" />
    </div>
    <div className="font-display text-[15px] text-foreground mb-1">Wallet not connected</div>
    <p className="text-[12px] text-muted-foreground/65 max-w-sm mx-auto">{message}</p>
  </Card>
);

const WalletCard = () => {
  const { decrypted, reveal, busy } = useCUSDCBalance();
  const isRevealed = decrypted !== null && decrypted !== undefined;
  return (
    <Card>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55 font-mono">Your Wallet</div>
        <button
          onClick={() => void reveal()}
          disabled={busy}
          className="flex items-center gap-1 text-[10px] tracking-[0.18em] uppercase text-emerald-300 hover:text-emerald-200 disabled:opacity-50 transition-colors"
        >
          <Eye className="w-3 h-3" />
          {busy ? "Decrypting…" : isRevealed ? "Hide" : "Reveal"}
        </button>
      </div>
      <div className="px-5 pb-5">
        <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/55 mb-1">cUSDC Balance</div>
        <div className="flex items-end justify-between">
          <EncryptedValue
            value={decrypted ?? "0"}
            revealed={isRevealed}
            suffix="cUSDC"
            size="xl"
            length={7}
          />
          <div className="w-9 h-9 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center">
            <span className="text-muted-foreground/50 text-sm">$</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

const ActiveModulesCard = () => (
  <Card>
    <CardHeader title="Active Modules" />
    <div className="px-5 py-3 space-y-2">
      {activeModules.map((m) => (
        <div key={m} className="flex items-center justify-between text-[12px]">
          <div className="flex items-center gap-2 text-foreground/85">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            {m}
          </div>
          <span className="text-[9px] tracking-[0.2em] uppercase text-emerald-400/70 font-mono">Active</span>
        </div>
      ))}
      <div className="pt-2">
        <Link to="/docs" className="text-[11px] text-emerald-300 hover:text-emerald-200 inline-flex items-center gap-1">
          View all modules
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </div>
  </Card>
);

const NetworkCard = () => {
  const { address } = useAccount();
  return (
    <Card>
      <CardHeader title="Network" />
      <div className="px-5 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-[12px] text-foreground/85">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            Arbitrum Sepolia
          </div>
          {address && (
            <button
              onClick={() => navigator.clipboard.writeText(address)}
              className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70 hover:text-foreground transition-colors"
            >
              {address.slice(0, 6)}…{address.slice(-4)}
              <Copy className="w-3 h-3" />
            </button>
          )}
        </div>
        <div className="rounded-md border border-white/[0.05] bg-white/[0.015] p-3 flex items-center gap-3">
          <div className="w-7 h-7 rounded-md bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center shrink-0">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11.5px] font-medium text-foreground leading-tight">Network Status</div>
            <div className="text-[10.5px] text-muted-foreground/60">All systems operational</div>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40 -rotate-90" />
        </div>
      </div>
    </Card>
  );
};

const NeedHelpCard = () => (
  <Card>
    <CardHeader title="Need Help?" />
    <div className="px-5 py-3 space-y-2">
      <LinkRow icon={BookOpen} title="Read Documentation" description="Learn how Obscura Pay works" to="/docs" />
      <LinkRow icon={HelpCircle} title="Visit What's Private?" description="Understand our privacy-first approach" to="/docs#whats-private" />
    </div>
  </Card>
);

const PayPage = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const [tab, setTab] = useState<Tab>("dashboard");
  const [streamRefreshKey, setStreamRefreshKey] = useState(0);
  const refreshStreams = () => setStreamRefreshKey((k) => k + 1);

  const handleSidebarSelect = (key: string) => {
    if (key === "pay" || key === "dashboard") return setTab("dashboard");
    if (key === "docs") return void navigate("/docs");
    if (key === "private") return void navigate("/docs#whats-private");
    setTab(key as Tab);
  };

  const renderActiveSection = () => {
    switch (tab) {
      case "dashboard":
        return (
          <div className="space-y-4">
            {/* Main feature first: cUSDC wallet */}
            <Card>
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center">
                    <Coins className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-[13px] font-display font-semibold text-foreground">cUSDC Wallet</span>
                </div>
                <span className="text-[9px] tracking-[0.22em] uppercase text-emerald-400/80 font-mono">
                  Encrypted Stablecoin
                </span>
              </div>
              <div className="p-5">
                <p className="text-[12px] text-muted-foreground/70 leading-relaxed mb-4 max-w-2xl">
                  cUSDC is an encrypted version of USDC. Your balance is hidden on-chain. You need cUSDC to create
                  payroll streams and buy insurance.
                </p>
                <CUSDCPanel />
              </div>
            </Card>

            {/* Diagram explaining the encrypted stablecoin flow */}
            <SectionDiagram flow="send" />

            {/* How it works moved to the bottom of the dashboard view */}
            <HowItWorks
              title="How it works — cUSDC Payments"
              steps={dashboardSteps}
              footnote={
                <>
                  All encryption uses <span className="text-foreground/80">Phenix CoFHE</span> (Fully Homomorphic
                  Encryption). Your data stays encrypted, even while the smart contract processes it.
                </>
              }
            />
          </div>
        );

      case "send":
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Send encrypted payment" eyebrow="Send" />
              <div className="p-5">
                {!isConnected ? (
                  <NotConnected message="Connect your wallet to send encrypted cUSDC payments." />
                ) : (
                  <CUSDCTransferForm />
                )}
              </div>
            </Card>
            <SectionDiagram flow="send" />
          </div>
        );

      case "receive":
        if (!isConnected) return <NotConnected message="Connect your wallet to set up private receiving." />;
        return (
          <div className="space-y-4">
            <Card><CardHeader title="Step 1 — Register stealth address" eyebrow="Receive" /><div className="p-5"><RegisterMetaAddressForm /></div></Card>
            <Card><CardHeader title="Step 2 — Streams paying you" /><div className="p-5"><StreamList mode="recipient" /></div></Card>
            <Card><CardHeader title="Your cUSDC balance" /><div className="p-5"><CUSDCPanel /></div></Card>
            <SectionDiagram flow="receive" />
          </div>
        );

      case "escrows":
        if (!isConnected) return <NotConnected message="Connect your wallet to manage escrows." />;
        return (
          <div className="space-y-4">
            <Card><CardHeader title="Create & auto-fund escrow" eyebrow="Step 1" /><div className="p-5"><CUSDCEscrowForm /></div></Card>
            <Card><CardHeader title="Your escrows" eyebrow="Step 2" /><div className="p-5"><MyEscrows /></div></Card>
            <Card><CardHeader title="Fund / Redeem / Inspect" eyebrow="Step 3" /><div className="p-5"><CUSDCEscrowActions /></div></Card>
            <Card><CardHeader title="Resolver-gated escrows" eyebrow="Advanced" /><div className="p-5"><ResolverManager /></div></Card>
            <SectionDiagram flow="escrow" />
          </div>
        );

      case "streams":
        if (!isConnected) return <NotConnected message="Connect your wallet to create payroll streams." />;
        return (
          <div className="space-y-4">
            <Card><CardHeader title="Step 1 — Wallet" eyebrow="Streams" /><div className="p-5"><CUSDCPanel /></div></Card>
            <Card><CardHeader title="Step 2 — Recipient stealth address" /><div className="p-5"><RegisterMetaAddressForm /></div></Card>
            <Card><CardHeader title="Step 3 — Create stream" /><div className="p-5"><CreateStreamForm onCreated={refreshStreams} /></div></Card>
            <Card><CardHeader title="Step 4 — Send each cycle" /><div className="p-5"><StreamList key={`emp-${streamRefreshKey}`} mode="employer" /></div></Card>
            <Card><CardHeader title="Streams paying you" eyebrow="Inbox" /><div className="p-5"><StreamList key={`rec-${streamRefreshKey}`} mode="recipient" /></div></Card>
            <SectionDiagram flow="stream" />
          </div>
        );

      case "crosschain":
        if (!isConnected) return <NotConnected message="Connect your wallet to bridge USDC across chains." />;
        return (
          <div className="space-y-4">
            <Card><CardHeader title="Bridge USDC into Arbitrum" eyebrow="Cross-Chain" /><div className="p-5"><CrossChainFundForm /></div></Card>
            <SectionDiagram flow="crosschain" />
          </div>
        );

      case "insurance":
        if (!isConnected) return <NotConnected message="Connect your wallet to buy coverage or stake liquidity." />;
        return (
          <div className="space-y-4">
            <Card><CardHeader title="Step 1 — Buy coverage" eyebrow="Insurance" /><div className="p-5"><BuyCoverageForm /></div></Card>
            <Card><CardHeader title="Step 2 — Your policies" /><div className="p-5"><MyPolicies /></div></Card>
            <Card><CardHeader title="Step 3 — File a dispute" /><div className="p-5"><DisputeForm /></div></Card>
            <Card><CardHeader title="Earn yield as an LP" eyebrow="Optional" /><div className="p-5"><StakePoolForm /></div></Card>
            <SectionDiagram flow="insurance" />
          </div>
        );

      case "stealth":
        if (!isConnected) return <NotConnected message="Connect your wallet to register and scan stealth addresses." />;
        return (
          <div className="space-y-4">
            <Card><CardHeader title="Register meta-address" eyebrow="Step 1" /><div className="p-5"><RegisterMetaAddressForm /></div></Card>
            <Card><CardHeader title="Stealth inbox" eyebrow="Step 2" /><div className="p-5"><StealthInbox /></div></Card>
            <SectionDiagram flow="stealth" />
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-[#06090c] text-foreground antialiased">
      <AmbientBackground />

      <DashboardSidebar
        sections={sidebarSections}
        active={tab === "dashboard" ? "dashboard" : tab}
        onSelect={handleSidebarSelect}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1 grid xl:grid-cols-[minmax(0,1fr)_340px] gap-6 px-6 lg:px-8 py-7">
          <main className="min-w-0">
            <PageHeader
              breadcrumb={["Dashboard", "Pay"]}
              title={<>Obscura<span className="text-emerald-400">Pay</span></>}
              lede={<>Send, stream, and insure payments — all fully encrypted on-chain. Nobody can see amounts, recipients, or balances.</>}
              badge={
                <span className="inline-flex items-center gap-2 text-[10.5px] tracking-[0.05em] text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/[0.05]">
                  cUSDC — encrypted stablecoin for all operations
                  <HelpCircle className="w-3 h-3 opacity-60" />
                </span>
              }
            />

            <div className="mb-6">
              <ActionGrid
                items={actionItems}
                active={tab === "dashboard" ? undefined : tab}
                onSelect={(k) => setTab(k as Tab)}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={tab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderActiveSection()}
              </motion.div>
            </AnimatePresence>

            <div className="mt-7">
              <FeatureStrip items={featureItems} />
            </div>
          </main>

          <aside className="xl:sticky xl:top-20 xl:self-start space-y-4">
            <WalletCard />
            <ActiveModulesCard />
            <NetworkCard />
            <NeedHelpCard />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default PayPage;
