import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useChainId } from "wagmi";
import {
  FileText,
  CheckSquare,
  BarChart3,
  Settings,
  Coins,
  AlertTriangle,
} from "lucide-react";

import SectionDiagram from "@/components/elite/SectionDiagram";
import { ActivityFeed } from "@/components/harmony/ActivityFeed";
import { HarmonyAppShell } from "@/components/harmony/HarmonyAppShell";
import { HarmonyFormCard } from "@/components/harmony/harmony-ui";
import { HarmonyHowItWorks } from "@/components/harmony/HarmonyHowItWorks";
import { VoteHarmonyDashboard } from "@/components/harmony/VoteHarmonyDashboard";
import {
  VoteHarmonyNotConnected,
  VoteHarmonyPanelCard,
  VoteHarmonySubNav,
  VoteHarmonyTabShell,
} from "@/components/harmony/VoteHarmonyTabShell";

import VoteDashboard from "@/components/vote/VoteDashboard";
import ProposalList from "@/components/vote/ProposalList";
import CastVoteForm from "@/components/vote/CastVoteForm";
import TallyReveal from "@/components/vote/TallyReveal";
import CreateProposalForm from "@/components/vote/CreateProposalForm";
import VotingHistory from "@/components/vote/VotingHistory";
import AdminControls from "@/components/vote/AdminControls";
import ClaimDailyObsForm from "@/components/pay/ClaimDailyObsForm";
import { VoteSetupGuide } from "@/components/vote/VoteSetupGuide";
import { DelegationPanel } from "@/components/vote/DelegationPanel";
import { TreasuryPanel } from "@/components/vote/TreasuryPanel";
import { RewardsPanel } from "@/components/vote/RewardsPanel";
import { GovernorPanel } from "@/components/vote/GovernorPanel";
import { useVoteOwner, useVoteRole } from "@/hooks/useProposals";
import { Role } from "@/lib/constants";

type Tab = "dashboard" | "voting" | "governor" | "delegate" | "treasury" | "rewards";
type VotingSubTab = "create" | "proposals" | "cast" | "results";

const votingSubTabs: { key: VotingSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "create", label: "Create", icon: Settings },
  { key: "proposals", label: "Proposals", icon: FileText },
  { key: "cast", label: "Cast Vote", icon: CheckSquare },
  { key: "results", label: "Results", icon: BarChart3 },
];

const dashboardSteps = [
  { title: "Connect wallet", description: "Connect your wallet on Arbitrum Sepolia." },
  {
    title: "Claim $OBS tokens",
    description: (
      <>
        Use the faucet on the <span className="font-medium text-foreground">Overview</span> to claim 100 $OBS every 24 hours.
      </>
    ),
  },
  {
    title: "Browse proposals",
    description: (
      <>
        Open <span className="font-medium text-foreground">Proposals</span> to see live polls, deadlines, and quorum.
      </>
    ),
  },
  {
    title: "Cast your vote",
    description: (
      <>
        Pick an option in <span className="font-medium text-foreground">Cast Vote</span>. The choice is encrypted before it leaves your browser.
      </>
    ),
  },
  {
    title: "Revote anytime",
    description:
      "Change your mind before the deadline — vote-buying becomes irrational because the buyer can't verify the final ballot.",
  },
  {
    title: "Reveal results",
    description: (
      <>
        After deadline, anyone can call reveal in <span className="font-medium text-foreground">Results</span>. Aggregate counts go public — individual votes stay private forever.
      </>
    ),
  },
];

const VotePage = () => {
  const { address, isConnected } = useAccount();
  const { data: ownerAddress } = useVoteOwner();
  const { data: userRoleRaw } = useVoteRole(address);
  const isOwner = !!address && !!ownerAddress && address.toLowerCase() === (ownerAddress as string).toLowerCase();
  const userRole = (userRoleRaw as number) ?? Role.NONE;
  const isAdmin = userRole === Role.ADMIN || isOwner;

  const chainId = useChainId();
  const wrongNetwork = isConnected && chainId !== 421614;

  const [tab, setTab] = useState<Tab>("dashboard");
  const [votingSubTab, setVotingSubTab] = useState<VotingSubTab>("create");
  const [jumpProposalId, setJumpProposalId] = useState("");

  const handleGuideNavigate = (tabKey: string, subTab?: string) => {
    setTab(tabKey as Tab);
    if (subTab) setVotingSubTab(subTab as VotingSubTab);
  };

  const renderVotingContent = () => {
    switch (votingSubTab) {
      case "proposals":
        return (
          <>
            <VoteHarmonyPanelCard title="Browse all polls" eyebrow="Proposals">
              <div className="harmony-form-inner">
                <ProposalList
                  onVote={(id) => {
                    setJumpProposalId(String(id));
                    setVotingSubTab("cast");
                  }}
                />
              </div>
            </VoteHarmonyPanelCard>
            <SectionDiagram flow="vote-cast" />
          </>
        );
      case "cast":
        if (!isConnected) {
          return <VoteHarmonyNotConnected message="Connect your wallet to cast an encrypted vote." />;
        }
        return (
          <>
            <VoteHarmonyPanelCard title="Encrypt your choice" eyebrow="Cast vote">
              <div className="harmony-form-inner">
                <CastVoteForm initialProposalId={jumpProposalId} />
              </div>
            </VoteHarmonyPanelCard>
            <VoteHarmonyPanelCard title="Voting history" eyebrow="Your activity">
              <div className="harmony-form-inner">
                <VotingHistory />
              </div>
            </VoteHarmonyPanelCard>
            <SectionDiagram flow="vote-cast" />
          </>
        );
      case "results":
        return (
          <>
            <VoteHarmonyPanelCard title="Reveal aggregate tallies" eyebrow="Results">
              <div className="harmony-form-inner">
                <TallyReveal />
              </div>
            </VoteHarmonyPanelCard>
            <SectionDiagram flow="vote-tally" />
          </>
        );
      case "create":
      default:
        if (!isConnected) {
          return <VoteHarmonyNotConnected message="Connect your wallet to create proposals." />;
        }
        return (
          <>
            <VoteHarmonyPanelCard title="Launch a proposal" eyebrow="Create">
              <div className="harmony-form-inner">
                <CreateProposalForm onSuccess={() => setVotingSubTab("proposals")} />
              </div>
            </VoteHarmonyPanelCard>
            {isAdmin && (
              <VoteHarmonyPanelCard title="Administrative controls" eyebrow="Admin">
                <div className="harmony-form-inner">
                  <AdminControls />
                </div>
              </VoteHarmonyPanelCard>
            )}
            <SectionDiagram flow="obs-claim" />
          </>
        );
    }
  };

  const renderActiveSection = () => {
    switch (tab) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <VoteHarmonyDashboard
              onNewProposal={() => {
                setTab("voting");
                setVotingSubTab("create");
              }}
              onDelegate={() => setTab("delegate")}
            />

            <HarmonyFormCard title="Get started with ObscuraVote" eyebrow="Setup guide">
              <VoteSetupGuide onNavigate={handleGuideNavigate} />
            </HarmonyFormCard>

            <div
              id="obs-claim-banner"
              className="flex flex-wrap items-center gap-4 rounded-2xl hairline bg-card p-4"
            >
              <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline">
                <Coins className="h-4 w-4 text-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium leading-tight text-foreground">Get $OBS governance tokens</div>
                <div className="mt-0.5 text-sm text-muted-foreground">
                  You need $OBS to vote. Claim 100 free tokens every 24 hours.
                </div>
              </div>
              <div className="shrink-0">
                <ClaimDailyObsForm compact />
              </div>
            </div>

            <HarmonyFormCard title="Active proposals" eyebrow="Live">
              <div className="harmony-form-inner">
                <VoteDashboard />
              </div>
            </HarmonyFormCard>

            <HarmonyFormCard title="Proposals" eyebrow="All polls">
              <p className="mb-4 text-sm text-muted-foreground">All votes confidential by default.</p>
              <div className="harmony-form-inner -mx-2">
                <ProposalList
                  onVote={(id) => {
                    setJumpProposalId(String(id));
                    setTab("voting");
                    setVotingSubTab("cast");
                  }}
                />
              </div>
            </HarmonyFormCard>

            <SectionDiagram flow="vote-cast" />
            <HarmonyHowItWorks
              title="How it works — Encrypted Voting"
              steps={dashboardSteps}
              footnote={
                <>
                  Your individual vote is sealed forever — even after results are revealed. Powered by{" "}
                  <span className="font-medium text-foreground">Fhenix CoFHE</span>, every vote stays encrypted while the
                  contract aggregates them.
                </>
              }
            />
          </div>
        );

      case "voting":
        return (
          <VoteHarmonyTabShell tab="voting" sub={votingSubTab}>
            <VoteHarmonySubNav active={votingSubTab} onChange={setVotingSubTab} items={votingSubTabs} />
            <AnimatePresence mode="wait">
              <motion.div
                key={votingSubTab}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              >
                {renderVotingContent()}
              </motion.div>
            </AnimatePresence>
          </VoteHarmonyTabShell>
        );

      case "delegate":
        return (
          <VoteHarmonyTabShell tab="delegate">
            {!isConnected ? (
              <VoteHarmonyNotConnected message="Connect your wallet to manage vote delegation." />
            ) : (
              <VoteHarmonyPanelCard title="Vote delegation" eyebrow="Delegation">
                <div className="harmony-form-inner">
                  <DelegationPanel />
                </div>
              </VoteHarmonyPanelCard>
            )}
          </VoteHarmonyTabShell>
        );

      case "treasury":
        return (
          <VoteHarmonyTabShell tab="treasury">
            <VoteHarmonyPanelCard title="DAO treasury" eyebrow="Treasury">
              <div className="harmony-form-inner">
                <TreasuryPanel />
              </div>
            </VoteHarmonyPanelCard>
          </VoteHarmonyTabShell>
        );

      case "rewards":
        return (
          <VoteHarmonyTabShell tab="rewards">
            <VoteHarmonyPanelCard title="Voter participation" eyebrow="Participation">
              <div className="harmony-form-inner">
                <RewardsPanel />
              </div>
            </VoteHarmonyPanelCard>
            <ActivityFeed
              defaultFilter="vote"
              filters={["vote"]}
              title="Recent Vote activity"
              eyebrow="Shared activity"
              emptyMessage="No indexed Vote activity found for this wallet yet."
            />
          </VoteHarmonyTabShell>
        );

      case "governor":
        return (
          <VoteHarmonyTabShell tab="governor">
            <VoteHarmonyPanelCard title="Executable proposals" eyebrow="OZ Governor · Timelock · 2-day delay">
              <div className="harmony-form-inner">
                <GovernorPanel wrongNetwork={wrongNetwork} />
              </div>
            </VoteHarmonyPanelCard>
          </VoteHarmonyTabShell>
        );
    }
  };

  const harmonySidebar = [
    { key: "dashboard", label: "Overview", active: tab === "dashboard", onClick: () => setTab("dashboard") },
    {
      key: "voting",
      label: "Proposals",
      badge: "Polls",
      active: tab === "voting",
      onClick: () => {
        setTab("voting");
        setVotingSubTab("proposals");
      },
    },
    { key: "treasury", label: "Treasury", active: tab === "treasury", onClick: () => setTab("treasury") },
    { key: "delegate", label: "Delegation", active: tab === "delegate", onClick: () => setTab("delegate") },
    { key: "rewards", label: "Participation", active: tab === "rewards", onClick: () => setTab("rewards") },
    { key: "governor", label: "Executable", active: tab === "governor", onClick: () => setTab("governor") },
  ];

  return (
    <HarmonyAppShell appName="Vote" sidebar={harmonySidebar} searchPlaceholder="Search vote…">
      {wrongNetwork && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4"
        >
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
          <div>
            <div className="text-sm font-semibold text-amber-900">Wrong network</div>
            <div className="mt-0.5 text-xs text-amber-800/80">
              Please switch to <span className="font-semibold">Arbitrum Sepolia</span> (chain ID 421614) in your wallet to use ObscuraVote.
            </div>
          </div>
        </motion.div>
      )}

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
    </HarmonyAppShell>
  );
};

export default VotePage;
