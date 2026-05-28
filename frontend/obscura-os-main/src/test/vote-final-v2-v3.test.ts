import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(testDir, "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(sourceRoot, relativePath), "utf8");
}

describe("Vote V2/V3 information architecture", () => {
  it("collapses Vote to four top-level sections", () => {
    const votePage = readSource("pages/VotePage.tsx");
    const shell = readSource("components/harmony/VoteHarmonyTabShell.tsx");

    expect(votePage).toContain('type VoteSection = "overview" | "proposals" | "participation" | "advanced"');
    expect(votePage).toContain('key: "overview"');
    expect(votePage).toContain('key: "proposals"');
    expect(votePage).toContain('key: "participation"');
    expect(votePage).toContain('key: "advanced"');
    expect(votePage).not.toContain('key: "treasury"');
    expect(votePage).not.toContain('key: "delegate"');
    expect(votePage).not.toContain('key: "governor"');
    expect(shell).toContain('"proposals" | "participation" | "advanced"');
  });

  it("keeps advanced governance out of the overview", () => {
    const votePage = readSource("pages/VotePage.tsx");
    const dashboard = readSource("components/harmony/VoteHarmonyDashboard.tsx");

    expect(votePage).not.toContain("VoteSetupGuide");
    expect(votePage).not.toContain("SectionDiagram");
    expect(votePage).not.toContain("ClaimDailyObsForm");
    expect(dashboard).not.toContain("Institutional governance");
    expect(dashboard).not.toContain("OBS · sealed");
    expect(dashboard).not.toContain("Treasury");
    expect(dashboard).toContain("Cast private votes. Change your mind before the deadline. Only final totals are revealed.");
  });

  it("makes voting the primary proposal path while preserving explicit reveal", () => {
    const votePage = readSource("pages/VotePage.tsx");
    const proposalList = readSource("components/vote/ProposalList.tsx");
    const castVote = readSource("components/vote/CastVoteForm.tsx");
    const tallyReveal = readSource("components/vote/TallyReveal.tsx");

    expect(votePage).toContain('type ProposalMode = "browse" | "create" | "vote" | "results"');
    expect(votePage).toContain("Vote privately");
    expect(votePage).toContain('onClick={() => openProposals("vote")}');
    expect(votePage).toContain("Create");
    expect(votePage).toContain("Results");
    expect(proposalList).toContain("Vote privately");
    expect(castVote).toContain("Change Private Vote");
    expect(castVote).toContain("Submit Private Vote");
    expect(castVote).toContain("Show my vote");
    expect(castVote).toContain("Change vote");
    expect(tallyReveal).toContain("Decrypt Public Tally");
    expect(tallyReveal).toContain("Individual votes remain permanently encrypted");
  });

  it("keeps Vote notifications reachable without leaking choices", () => {
    const votePage = readSource("pages/VotePage.tsx");
    const notificationsPanel = readSource("components/vote/VoteNotificationsPanel.tsx");
    const shell = readSource("components/harmony/HarmonyAppShell.tsx");

    expect(votePage).toContain("VoteNotificationsPanel");
    expect(votePage).toContain("Vote settings");
    expect(votePage).toContain('onSettingsClick={() => setSettingsOpen(true)}');
    expect(shell).toContain("onSettingsClick");
    expect(notificationsPanel).toContain("Save Vote alerts");
    expect(notificationsPanel).toContain("vote.*");
    expect(notificationsPanel).toContain("governor.*");
    expect(notificationsPanel).toContain("never include the option you chose");
    expect(notificationsPanel).not.toContain("args.support");
    expect(notificationsPanel).not.toMatch(/against|abstain/i);
  });

  it("improves mobile and empty-state polish", () => {
    const dashboard = readSource("components/harmony/VoteHarmonyDashboard.tsx");
    const proposalList = readSource("components/vote/ProposalList.tsx");
    const rewards = readSource("components/vote/RewardsPanel.tsx");

    expect(dashboard).toContain("hidden gap-3 md:grid");
    expect(dashboard).toContain("Review proposals");
    expect(proposalList).toContain('initialFilter = "active"');
    expect(proposalList).toContain("Showing {statusFilter} proposals first");
    expect(rewards).toContain("Reward claims appear after you vote privately");
    expect(rewards).toContain("No reward claim is ready if this list is empty");
    expect(rewards).toContain("Nothing is withdrawable yet");
  });
});