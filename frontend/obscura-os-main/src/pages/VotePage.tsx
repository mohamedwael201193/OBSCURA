import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount, useChainId } from "wagmi";
import {
  BarChart3,
  AlertTriangle,
  Home,
  Plus,
  Settings,
  ShieldCheck,
  UserRound,
  Vote,
  X,
} from "lucide-react";

import { ActivityFeed } from "@/components/harmony/ActivityFeed";
import { HarmonyAppShell } from "@/components/harmony/HarmonyAppShell";
import { HarmonyFormCard } from "@/components/harmony/harmony-ui";
import { VoteHarmonyDashboard } from "@/components/harmony/VoteHarmonyDashboard";
import {
  VoteHarmonyNotConnected,
  VoteHarmonyPanelCard,
  VoteHarmonySubNav,
  VoteHarmonyTabShell,
} from "@/components/harmony/VoteHarmonyTabShell";

import ProposalList from "@/components/vote/ProposalList";
import CastVoteForm from "@/components/vote/CastVoteForm";
import TallyReveal from "@/components/vote/TallyReveal";
import CreateProposalForm from "@/components/vote/CreateProposalForm";
import VotingHistory from "@/components/vote/VotingHistory";
import AdminControls from "@/components/vote/AdminControls";
import { DelegationPanel } from "@/components/vote/DelegationPanel";
import { TreasuryPanel } from "@/components/vote/TreasuryPanel";
import { RewardsPanel } from "@/components/vote/RewardsPanel";
import { GovernorPanel } from "@/components/vote/GovernorPanel";
import { VoteNotificationsPanel } from "@/components/vote/VoteNotificationsPanel";
import { useVoteOwner, useVoteRole } from "@/hooks/useProposals";
import { Role } from "@/lib/constants";

type VoteSection = "overview" | "proposals" | "participation" | "advanced";
type ProposalMode = "browse" | "create" | "vote" | "results";

const VotePage = () => {
  const { address, isConnected } = useAccount();
  const { data: ownerAddress } = useVoteOwner();
  const { data: userRoleRaw } = useVoteRole(address);
  const isOwner = !!address && !!ownerAddress && address.toLowerCase() === (ownerAddress as string).toLowerCase();
  const userRole = (userRoleRaw as number) ?? Role.NONE;
  const isAdmin = userRole === Role.ADMIN || isOwner;

  const chainId = useChainId();
  const wrongNetwork = isConnected && chainId !== 421614;

  const [section, setSection] = useState<VoteSection>("overview");
  const [proposalMode, setProposalMode] = useState<ProposalMode>("browse");
  const [jumpProposalId, setJumpProposalId] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);

  const openProposals = (mode: ProposalMode = "browse", proposalId?: number | string) => {
    setSection("proposals");
    setProposalMode(mode);
    if (proposalId !== undefined) setJumpProposalId(String(proposalId));
  };

  const proposalActions = (
    <>
      <button
        type="button"
        onClick={() => openProposals("vote")}
        className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
          proposalMode === "browse" || proposalMode === "vote"
            ? "bg-foreground text-background"
            : "hairline hover:bg-muted"
        }`}
      >
        <Vote className="h-4 w-4" />
        Vote privately
      </button>
      <button
        type="button"
        onClick={() => openProposals("create")}
        className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
          proposalMode === "create" ? "bg-foreground text-background" : "hairline hover:bg-muted"
        }`}
      >
        <Plus className="h-4 w-4" />
        Create
      </button>
      <button
        type="button"
        onClick={() => openProposals("results")}
        className={`inline-flex h-10 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors ${
          proposalMode === "results" ? "bg-foreground text-background" : "hairline hover:bg-muted"
        }`}
      >
        <BarChart3 className="h-4 w-4" />
        Results
      </button>
    </>
  );

  const renderProposalContent = () => {
    switch (proposalMode) {
      case "vote":
        if (!isConnected) {
          return <VoteHarmonyNotConnected message="Connect your wallet to cast an encrypted vote." />;
        }
        return (
          <>
            <VoteHarmonyPanelCard title="Vote on proposal" eyebrow="Private ballot">
              <div className="harmony-form-inner">
                <CastVoteForm initialProposalId={jumpProposalId} embedded />
              </div>
            </VoteHarmonyPanelCard>
            <VoteHarmonyPanelCard title="Your ballot history" eyebrow="Private verification">
              <div className="harmony-form-inner">
                <VotingHistory embedded />
              </div>
            </VoteHarmonyPanelCard>
          </>
        );
      case "results":
        return (
          <VoteHarmonyPanelCard title="Reveal aggregate totals" eyebrow="Results">
            <div className="harmony-form-inner">
              <TallyReveal />
            </div>
          </VoteHarmonyPanelCard>
        );
      case "create":
        if (!isConnected) {
          return <VoteHarmonyNotConnected message="Connect your wallet to create proposals." />;
        }
        return (
          <>
            <VoteHarmonyPanelCard title="Create a private proposal" eyebrow="Secondary action">
              <div className="harmony-form-inner">
                <CreateProposalForm onSuccess={() => openProposals("browse")} embedded />
              </div>
            </VoteHarmonyPanelCard>
            {isAdmin && (
              <VoteHarmonyPanelCard title="Administrative controls" eyebrow="Admin">
                <div className="harmony-form-inner">
                  <AdminControls />
                </div>
              </VoteHarmonyPanelCard>
            )}
          </>
        );
      case "browse":
      default:
        return (
          <>
            <VoteHarmonyPanelCard title="Private proposals" eyebrow="Needs action">
              <div className="harmony-form-inner">
                <ProposalList onVote={(id) => openProposals("vote", id)} embedded />
              </div>
            </VoteHarmonyPanelCard>
            {isConnected && (
              <VoteHarmonyPanelCard title="Your ballot history" eyebrow="Private verification">
                <div className="harmony-form-inner">
                  <VotingHistory embedded />
                </div>
              </VoteHarmonyPanelCard>
            )}
          </>
        );
    }
  };

  const renderActiveSection = () => {
    switch (section) {
      case "overview":
        return (
          <div className="space-y-6">
            <VoteHarmonyDashboard
              onVote={() => openProposals("vote")}
              onParticipation={() => setSection("participation")}
              onOpenProposals={() => openProposals("browse")}
              onCreate={() => openProposals("create")}
            />

            <HarmonyFormCard title="Proposals needing attention" eyebrow="Active governance">
              <div className="harmony-form-inner vote-harmony-panel -mx-2">
                <ProposalList onVote={(id) => openProposals("vote", id)} initialFilter="active" embedded />
              </div>
            </HarmonyFormCard>
          </div>
        );

      case "proposals":
        return (
          <div className="vote-harmony-panel">
            <VoteHarmonyTabShell tab="proposals" sub={proposalMode} actions={proposalActions}>
              <VoteHarmonySubNav
                active={proposalMode}
                onChange={(mode) => openProposals(mode)}
                items={[
                  { key: "browse", label: "Browse", icon: Home },
                  { key: "vote", label: "Vote", icon: Vote },
                  { key: "create", label: "Create", icon: Plus },
                  { key: "results", label: "Results", icon: BarChart3 },
                ]}
              />
              <AnimatePresence mode="wait">
                <motion.div
                  key={proposalMode}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                  className="mt-6"
                >
                  {renderProposalContent()}
                </motion.div>
              </AnimatePresence>
            </VoteHarmonyTabShell>
          </div>
        );

      case "participation":
        return (
          <VoteHarmonyTabShell tab="participation">
            <VoteHarmonyPanelCard title="Participation profile" eyebrow="Rewards">
              <div className="harmony-form-inner">
                <RewardsPanel />
              </div>
            </VoteHarmonyPanelCard>
            <VoteNotificationsPanel />
            {!isConnected ? (
              <VoteHarmonyNotConnected message="Connect your wallet to manage delegation." />
            ) : (
              <VoteHarmonyPanelCard title="Delegation" eyebrow="Public power routing">
                <div className="harmony-form-inner">
                  <DelegationPanel />
                </div>
              </VoteHarmonyPanelCard>
            )}
            <ActivityFeed
              defaultFilter="vote"
              filters={["vote"]}
              title="Recent Vote activity"
              eyebrow="Shared activity"
              emptyMessage="No indexed Vote activity found for this wallet yet."
            />
          </VoteHarmonyTabShell>
        );

      case "advanced":
        return (
          <VoteHarmonyTabShell tab="advanced">
            <VoteHarmonyPanelCard title="Private proposal treasury" eyebrow="Advanced">
              <div className="harmony-form-inner">
                <TreasuryPanel />
              </div>
            </VoteHarmonyPanelCard>
            <VoteHarmonyPanelCard title="Executable governance" eyebrow="Public Governor · Timelock">
              <div className="harmony-form-inner -mx-2">
                <GovernorPanel wrongNetwork={wrongNetwork} />
              </div>
            </VoteHarmonyPanelCard>
          </VoteHarmonyTabShell>
        );
    }
  };

  const harmonySidebar = [
    {
      key: "overview",
      label: "Overview",
      mobileLabel: "Home",
      icon: Home,
      active: section === "overview",
      onClick: () => setSection("overview"),
    },
    {
      key: "proposals",
      label: "Proposals",
      mobileLabel: "Vote",
      icon: Vote,
      active: section === "proposals",
      onClick: () => openProposals("vote"),
    },
    {
      key: "participation",
      label: "Participation",
      mobileLabel: "Profile",
      icon: UserRound,
      active: section === "participation",
      onClick: () => setSection("participation"),
    },
    {
      key: "advanced",
      label: "Advanced Governance",
      mobileLabel: "Advanced",
      icon: ShieldCheck,
      active: section === "advanced",
      onClick: () => setSection("advanced"),
    },
  ];

  return (
    <HarmonyAppShell appName="Vote" sidebar={harmonySidebar} searchPlaceholder="Search vote…" onSettingsClick={() => setSettingsOpen(true)}>
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
          key={section}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {renderActiveSection()}
        </motion.div>
      </AnimatePresence>

      <AnimatePresence>
        {settingsOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSettingsOpen(false)}
            />
            <motion.div
              className="fixed right-0 top-0 bottom-0 z-50 w-full overflow-y-auto border-l hairline bg-card shadow-2xl sm:w-[430px]"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-card/95 px-5 py-4 backdrop-blur">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <Settings className="h-4 w-4" /> Vote settings
                </span>
                <button
                  type="button"
                  onClick={() => setSettingsOpen(false)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label="Close Vote settings"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="space-y-5 px-5 py-5">
                <VoteNotificationsPanel />
                <div className="rounded-xl border border-border bg-muted/40 px-3 py-3 text-xs text-muted-foreground">
                  Vote alerts are generic. They can tell you a proposal needs action or a tally is ready, but never which option you selected.
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </HarmonyAppShell>
  );
};

export default VotePage;
