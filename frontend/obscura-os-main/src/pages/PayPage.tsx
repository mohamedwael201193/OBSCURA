import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import {
  LayoutDashboard,
  Send,
  ArrowDownToLine,
  Repeat,
  Shield,
  Lock,
  Sparkles,
  Network,
  BookOpen,
  Wallet as WalletIcon,
  Eye,
  ShieldCheck,
  Umbrella,
  Wrench,
  HelpCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import SectionDiagram from "@/components/elite/SectionDiagram";
import AmbientBackground from "@/components/elite/AmbientBackground";
import DashboardSidebar, {
  SidebarSection,
} from "@/components/elite/DashboardSidebar";
import {
  PageHeader,
  Card,
  CardHeader,
  HowItWorks,
  FeatureStrip,
} from "@/components/elite/Layout";

import CUSDCTransferForm from "@/components/pay-v4/CUSDCTransferForm";
import CUSDCEscrowForm from "@/components/pay-v4/CUSDCEscrowForm";
import CUSDCEscrowActions from "@/components/pay-v4/CUSDCEscrowActions";
import MyEscrows from "@/components/pay-v4/MyEscrows";
import CreateStreamForm from "@/components/pay-v4/CreateStreamForm";
import CreateStreamFormV2 from "@/components/pay-v4/CreateStreamFormV2";
import StreamList from "@/components/pay-v4/StreamList";
import CUSDCPanel from "@/components/pay-v4/CUSDCPanel";
import RegisterMetaAddressForm from "@/components/pay-v4/RegisterMetaAddressForm";
import StealthInbox from "@/components/pay-v4/StealthInbox";
import StealthInboxV2 from "@/components/pay-v4/StealthInboxV2";
import CrossChainFundForm from "@/components/pay-v4/CrossChainFundForm";
import BuyCoverageForm from "@/components/pay-v4/BuyCoverageForm";
import DisputeForm from "@/components/pay-v4/DisputeForm";
import StakePoolForm from "@/components/pay-v4/StakePoolForm";
import MyPolicies from "@/components/pay-v4/MyPolicies";
import ResolverManager from "@/components/pay-v4/ResolverManager";
import UnifiedSendForm from "@/components/pay-v4/UnifiedSendForm";
import BulkPayrollImport from "@/components/pay-v4/BulkPayrollImport";
import { ReceiptList } from "@/components/pay-v4/PaymentReceipt";

import { useCUSDCBalance } from "@/hooks/useCUSDCBalance";
import { useStealthInbox } from "@/hooks/useStealthInbox";
import { usePreferences } from "@/contexts/PreferencesContext";

type Tab =
  | "home"
  | "send"
  | "receive"
  | "streams"
  | "escrow"
  | "insurance"
  | "advanced";

const baseSidebarSections: SidebarSection[] = [
  { items: [{ key: "home", label: "Home", icon: LayoutDashboard }] },
  {
    heading: "Pay",
    items: [
      { key: "send", label: "Send", icon: Send },
      { key: "receive", label: "Receive", icon: ArrowDownToLine },
      { key: "streams", label: "Streams", icon: Repeat },
    ],
  },
  {
    heading: "Protect",
    items: [
      { key: "escrow", label: "Escrow", icon: ShieldCheck },
      { key: "insurance", label: "Insurance", icon: Umbrella },
    ],
  },
  {
    heading: "Tools",
    items: [
      { key: "contacts", label: "Contacts", icon: WalletIcon },
      { key: "settings", label: "Settings", icon: Shield },
      { key: "advanced", label: "Advanced", icon: Wrench },
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

const homeSteps = [
  { title: "1 · Get cUSDC", description: "Bridge USDC to Arbitrum, then wrap into encrypted cUSDC from the Send tab." },
  { title: "2 · Send privately", description: "Direct, stealth, or cross-chain — amounts are encrypted in your browser before going on-chain." },
  { title: "3 · Stream payroll", description: "Schedule recurring encrypted payments with optional auto-insurance per cycle." },
  { title: "4 · Escrow & insure", description: "Lock funds with resolvers, or buy coverage so missed cycles still pay out." },
];

const featureItems = [
  { icon: Lock, title: "End-to-End Encrypted", description: "FHE keeps every amount and recipient hidden." },
  { icon: Sparkles, title: "Onchain & Verifiable", description: "Public infrastructure, private data." },
  { icon: Network, title: "No Middlemen", description: "You control your keys and your data." },
  { icon: Shield, title: "Built for Web3", description: "Native modules for DeFi, DAOs, and payroll." },
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

/** Compact wallet balance pill shown in the page header. */
const WalletPill = () => {
  const { isConnected } = useAccount();
  const { decrypted, reveal, busy, trackedCusdc } = useCUSDCBalance();

  if (!isConnected) return null;

  const isRevealed = decrypted !== null && decrypted !== undefined;
  const display = isRevealed
    ? (Number(decrypted) / 1_000_000).toFixed(2)
    : trackedCusdc
      ? parseFloat(trackedCusdc).toFixed(2)
      : "•••";
  const isApprox = !isRevealed && trackedCusdc !== null && trackedCusdc !== undefined;

  return (
    <button
      onClick={() => void reveal()}
      disabled={busy}
      title={isRevealed ? "On-chain decrypted balance" : "Click to decrypt your balance"}
      className="group inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-1.5 hover:border-emerald-500/40 transition-colors disabled:opacity-60"
    >
      <Lock className="w-3.5 h-3.5 text-emerald-400" />
      <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/70 font-mono">cUSDC</span>
      <span className="font-mono text-[13px] font-semibold text-emerald-200 tabular-nums">
        {isApprox && <span className="text-emerald-300/50 mr-0.5">≈</span>}
        {busy ? "…" : display}
      </span>
      <Eye className="w-3.5 h-3.5 text-emerald-300/60 group-hover:text-emerald-300 transition-colors" />
    </button>
  );
};

const PayPage = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const prefs = usePreferences();
  const inbox = useStealthInbox();
  const [tab, setTab] = useState<Tab>("home");
  const [streamRefreshKey, setStreamRefreshKey] = useState(0);
  const refreshStreams = () => setStreamRefreshKey((k) => k + 1);

  // Sidebar with live unread badge on Receive
  const sidebarSections: SidebarSection[] = baseSidebarSections.map((sec) => ({
    ...sec,
    items: sec.items.map((it) =>
      it.key === "receive" && inbox.unreadCount > 0
        ? { ...it, badge: String(inbox.unreadCount) }
        : it
    ),
  }));

  const handleSidebarSelect = (key: string) => {
    if (key === "contacts") return void navigate("/pay/contacts");
    if (key === "settings") return void navigate("/pay/settings");
    if (key === "docs") return void navigate("/docs");
    if (key === "private") return void navigate("/docs#whats-private");
    setTab(key as Tab);
  };

  const renderActiveSection = () => {
    switch (tab) {
      case "home":
        return (
          <div className="space-y-5">
            <SectionDiagram flow="send" />
            {isConnected && (
              <Card>
                <CardHeader title="cUSDC Wallet" eyebrow="Wrap USDC → cUSDC" />
                <div className="p-5"><CUSDCPanel /></div>
              </Card>
            )}
            <HowItWorks
              title="How Obscura Pay works"
              steps={homeSteps}
              footnote={
                <>
                  All encryption uses <span className="text-foreground/80">Phenix CoFHE</span>.
                  Your data stays encrypted, even while the smart contract processes it.
                </>
              }
            />
            <ReceiptList limit={5} />
          </div>
        );

      case "send":
        if (!isConnected) return <NotConnected message="Connect your wallet to send encrypted cUSDC payments." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="cUSDC Wallet" eyebrow="Need cUSDC to send? Wrap here" />
              <div className="p-5"><CUSDCPanel /></div>
            </Card>
            <UnifiedSendForm />
            <Card>
              <CardHeader title="Bridge USDC into Arbitrum" eyebrow="Cross-chain" />
              <div className="p-5"><CrossChainFundForm /></div>
            </Card>
            <SectionDiagram flow="send" />
          </div>
        );

      case "receive":
        if (!isConnected) return <NotConnected message="Connect your wallet to set up private receiving." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Step 1 — Register stealth meta-address" eyebrow="Receive" />
              <div className="p-5"><RegisterMetaAddressForm /></div>
            </Card>
            <StealthInboxV2 />
            <Card>
              <CardHeader title="Streams paying you" />
              <div className="p-5"><StreamList mode="recipient" /></div>
            </Card>
            <SectionDiagram flow="receive" />
          </div>
        );

      case "streams":
        if (!isConnected) return <NotConnected message="Connect your wallet to create payroll streams." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Wallet" eyebrow="Streams" />
              <div className="p-5"><CUSDCPanel /></div>
            </Card>
            <Card>
              <CardHeader title="Create a stream" />
              <div className="p-5"><CreateStreamFormV2 onCreated={refreshStreams} /></div>
            </Card>
            <Card>
              <CardHeader title="Bulk payroll import" eyebrow="CSV" />
              <div className="p-5"><BulkPayrollImport /></div>
            </Card>
            <Card>
              <CardHeader title="Send each cycle" />
              <div className="p-5"><StreamList key={`emp-${streamRefreshKey}`} mode="employer" /></div>
            </Card>
            <Card>
              <CardHeader title="Streams paying you" eyebrow="Inbox" />
              <div className="p-5"><StreamList key={`rec-${streamRefreshKey}`} mode="recipient" /></div>
            </Card>
            <SectionDiagram flow="stream" />
          </div>
        );

      case "escrow":
        if (!isConnected) return <NotConnected message="Connect your wallet to manage encrypted escrows." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Create an escrow" eyebrow="Escrow" />
              <div className="p-5"><CUSDCEscrowForm /></div>
            </Card>
            <Card>
              <CardHeader title="Your escrows" />
              <div className="p-5"><MyEscrows /></div>
            </Card>
            <Card>
              <CardHeader title="Fund / Redeem / Inspect" />
              <div className="p-5"><CUSDCEscrowActions /></div>
            </Card>
            <Card>
              <CardHeader title="Resolver-gated escrows" eyebrow="Advanced" />
              <div className="p-5"><ResolverManager /></div>
            </Card>
          </div>
        );

      case "insurance":
        if (!isConnected) return <NotConnected message="Connect your wallet to buy or manage insurance." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Buy coverage" eyebrow="Insurance" />
              <div className="p-5"><BuyCoverageForm /></div>
            </Card>
            <Card>
              <CardHeader title="Your policies" />
              <div className="p-5"><MyPolicies /></div>
            </Card>
            <Card>
              <CardHeader title="File a dispute" />
              <div className="p-5"><DisputeForm /></div>
            </Card>
            <Card>
              <CardHeader title="Earn yield as an LP" eyebrow="Optional" />
              <div className="p-5"><StakePoolForm /></div>
            </Card>
          </div>
        );

      case "advanced":
        if (!isConnected) return <NotConnected message="Connect your wallet to access advanced tools." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Legacy direct cUSDC transfer" eyebrow="Advanced" />
              <div className="p-5"><CUSDCTransferForm /></div>
            </Card>
            <Card>
              <CardHeader title="Legacy stream creator" eyebrow="V1" />
              <div className="p-5"><CreateStreamForm onCreated={refreshStreams} /></div>
            </Card>
            <Card>
              <CardHeader title="Legacy stealth inbox" eyebrow="V1" />
              <div className="p-5"><StealthInbox /></div>
            </Card>
            <Card>
              <CardHeader title="All receipts" eyebrow="Local data" />
              <div className="p-5"><ReceiptList /></div>
            </Card>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex bg-[#06090c] text-foreground antialiased">
      <AmbientBackground />

      <DashboardSidebar
        sections={sidebarSections}
        active={tab}
        onSelect={handleSidebarSelect}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-w-0 px-6 lg:px-8 py-7 max-w-5xl w-full mx-auto">
          <PageHeader
            breadcrumb={["Dashboard", "Pay"]}
            title={<>Obscura<span className="text-emerald-400">Pay</span></>}
            lede={<>Send, stream, escrow and insure payments — fully encrypted on-chain.</>}
            badge={
              <div className="flex items-center gap-2">
                <WalletPill />
                {prefs.uiMode === "beginner" && (
                  <span className="hidden md:inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.05em] text-emerald-300/80 px-2.5 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/[0.04]">
                    cUSDC — encrypted stablecoin
                    <HelpCircle className="w-3 h-3 opacity-60" />
                  </span>
                )}
              </div>
            }
          />

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

          <div className="mt-8">
            <FeatureStrip items={featureItems} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PayPage;
