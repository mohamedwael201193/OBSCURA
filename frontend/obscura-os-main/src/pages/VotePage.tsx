import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  BarChart3,
  Settings,
  Wallet as WalletIcon,
  Lock,
  Vote,
  BookOpen,
  HelpCircle,
  ArrowRight,
  Copy,
  ChevronDown,
  Shield,
  Sparkles,
  Network,
  Users,
} from "lucide-react";

import SectionDiagram from "@/components/elite/SectionDiagram";
import { Link, useNavigate } from "react-router-dom";

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

import VoteDashboard from "@/components/vote/VoteDashboard";
import ProposalList from "@/components/vote/ProposalList";
import CastVoteForm from "@/components/vote/CastVoteForm";
import TallyReveal from "@/components/vote/TallyReveal";
import CreateProposalForm from "@/components/vote/CreateProposalForm";
import VotingHistory from "@/components/vote/VotingHistory";
import AdminControls from "@/components/vote/AdminControls";
import ClaimDailyObsForm from "@/components/pay/ClaimDailyObsForm";
import { useVoteOwner, useVoteRole } from "@/hooks/useProposals";
import { Role } from "@/lib/constants";

type Tab = "dashboard" | "proposals" | "cast" | "results" | "create";

const sidebarSections: SidebarSection[] = [
  { items: [{ key: "dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    heading: "Modules",
    items: [
      { key: "vote", label: "Vote", icon: Vote },
      { key: "proposals", label: "Proposals", icon: FileText },
      { key: "cast", label: "Cast Vote", icon: CheckSquare },
      { key: "results", label: "Results", icon: BarChart3 },
      { key: "create", label: "Create", icon: Settings },
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
  { key: "proposals", label: "Proposals", description: "Browse all polls", icon: FileText },
  { key: "cast", label: "Cast Vote", description: "Vote encrypted", icon: CheckSquare },
  { key: "results", label: "Results", description: "Reveal tallies", icon: BarChart3 },
  { key: "create", label: "Create", description: "New proposal", icon: Settings },
];

const activeModules = [
  "Encrypted Ballot (euint64)",
  "Per-option Tally",
  "Coercion-Resistant Revote",
  "Public Reveal",
  "$OBS Governance Token",
];

const dashboardSteps = [
  { title: "Connect wallet", description: "Connect your wallet on Arbitrum Sepolia." },
  { title: "Claim $OBS tokens", description: <>Use the faucet on the <span className="text-emerald-300">Dashboard</span> to claim 100 $OBS every 24 hours.</> },
  { title: "Browse proposals", description: <>Open the <span className="text-emerald-300">Proposals</span> tab to see live polls, deadlines, and quorum.</> },
  { title: "Cast your vote", description: <>Pick an option in <span className="text-emerald-300">Cast Vote</span>. The choice is encrypted before it leaves your browser.</> },
  { title: "Revote anytime", description: "Change your mind before the deadline — vote-buying becomes irrational because the buyer can't verify the final ballot." },
  { title: "Reveal results", description: <>After deadline, anyone can call reveal in the <span className="text-emerald-300">Results</span> tab. Aggregate counts go public — individual votes stay private forever.</> },
];

const featureItems = [
  { icon: Lock, title: "Encrypted Ballots", description: "Your vote is sealed before submission." },
  { icon: Shield, title: "Coercion Resistant", description: "Revote unlimited times before deadline." },
  { icon: Sparkles, title: "Aggregate Reveal", description: "Only the totals go public, never your choice." },
  { icon: Network, title: "On-chain Governance", description: "Verifiable proposals and execution." },
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

const StatusCard = () => {
  const { address, isConnected } = useAccount();
  return (
    <Card>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55 font-mono">Your Wallet</div>
        <span className="text-[10px] tracking-[0.18em] uppercase text-emerald-300">
          {isConnected ? "Connected" : "Disconnected"}
        </span>
      </div>
      <div className="px-5 pb-5">
        <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/55 mb-1">Address</div>
        <div className="font-mono text-[13px] text-foreground/90 break-all">
          {address ? `${address.slice(0, 10)}…${address.slice(-8)}` : "Not connected"}
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
            <Users className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11.5px] font-medium text-foreground leading-tight">Governance Status</div>
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
      <LinkRow icon={BookOpen} title="Read Documentation" description="Learn how Obscura Vote works" to="/docs" />
      <LinkRow icon={HelpCircle} title="Visit What's Private?" description="Understand our privacy-first approach" to="/docs#whats-private" />
    </div>
  </Card>
);

const VotePage = () => {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const { data: ownerAddress } = useVoteOwner();
  const { data: userRoleRaw } = useVoteRole(address);
  const isOwner = !!address && !!ownerAddress && address.toLowerCase() === (ownerAddress as string).toLowerCase();
  const userRole = (userRoleRaw as number) ?? Role.NONE;
  const isAdmin = userRole === Role.ADMIN || isOwner;

  const [tab, setTab] = useState<Tab>("dashboard");
  const [jumpProposalId, setJumpProposalId] = useState("");

  const handleSidebarSelect = (key: string) => {
    if (key === "vote" || key === "dashboard") return setTab("dashboard");
    if (key === "docs") return void navigate("/docs");
    if (key === "private") return void navigate("/docs#whats-private");
    setTab(key as Tab);
  };

  const renderActiveSection = () => {
    switch (tab) {
      case "dashboard":
        return (
          <div className="space-y-4">
            {/* Main features first: live proposals */}
            <Card>
              <CardHeader title="Active proposals" eyebrow="Live" />
              <div className="p-5"><VoteDashboard /></div>
            </Card>

            {/* Daily claim */}
            <Card>
              <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-white/[0.05]">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  </div>
                  <span className="text-[13px] font-display font-semibold text-foreground">Claim $OBS to vote</span>
                </div>
                <span className="text-[9px] tracking-[0.22em] uppercase text-emerald-400/80 font-mono">Faucet</span>
              </div>
              <div className="p-5">
                <p className="text-[12px] text-muted-foreground/70 leading-relaxed mb-4 max-w-2xl">
                  You need $OBS governance tokens to participate. Claim 100 free tokens every 24 hours.
                </p>
                <ClaimDailyObsForm />
              </div>
            </Card>

            {/* Diagram + how-it-works at the bottom */}
            <SectionDiagram flow="vote-cast" />
            <HowItWorks
              title="How it works — Encrypted Voting"
              steps={dashboardSteps}
              footnote={
                <>
                  Your individual vote is sealed forever — even after results are revealed. Powered by{" "}
                  <span className="text-foreground/80">Phenix CoFHE</span>, every vote stays encrypted while the
                  contract aggregates them.
                </>
              }
            />
          </div>
        );

      case "proposals":
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Browse all polls" eyebrow="Proposals" />
              <div className="p-5"><ProposalList onVote={(id) => { setJumpProposalId(String(id)); setTab("cast"); }} /></div>
            </Card>
            <SectionDiagram flow="vote-cast" />
          </div>
        );

      case "cast":
        if (!isConnected) return <NotConnected message="Connect your wallet to cast an encrypted vote." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Encrypt your choice" eyebrow="Cast Vote" />
              <div className="p-5"><CastVoteForm initialProposalId={jumpProposalId} /></div>
            </Card>
            <Card>
              <CardHeader title="Voting history" eyebrow="Your activity" />
              <div className="p-5"><VotingHistory /></div>
            </Card>
            <SectionDiagram flow="vote-cast" />
          </div>
        );

      case "results":
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Reveal aggregate tallies" eyebrow="Results" />
              <div className="p-5"><TallyReveal /></div>
            </Card>
            <SectionDiagram flow="vote-tally" />
          </div>
        );

      case "create":
        if (!isConnected) return <NotConnected message="Connect your wallet to create proposals." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Launch a proposal" eyebrow="Create" />
              <div className="p-5"><CreateProposalForm /></div>
            </Card>
            {isAdmin && (
              <Card>
                <CardHeader title="Administrative controls" eyebrow="Admin" />
                <div className="p-5"><AdminControls /></div>
              </Card>
            )}
            <SectionDiagram flow="obs-claim" />
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
              breadcrumb={["Dashboard", "Vote"]}
              title={<>Obscura<span className="text-emerald-400">Vote</span></>}
              lede={<>Encrypted governance you can trust. Your individual vote is sealed forever — even after the result goes public. Revote anytime to defeat coercion.</>}
              badge={
                <span className="inline-flex items-center gap-2 text-[10.5px] tracking-[0.05em] text-emerald-300 px-2.5 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/[0.05]">
                  $OBS — governance token, claim 100 every 24h
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
            <StatusCard />
            <ActiveModulesCard />
            <NetworkCard />
            <NeedHelpCard />
          </aside>
        </div>
      </div>
    </div>
  );
};

export default VotePage;
