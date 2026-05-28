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
    expect(votePage).toContain("Create");
    expect(votePage).toContain("Results");
    expect(proposalList).toContain("Vote privately");
    expect(castVote).toContain("Change Private Vote");
    expect(castVote).toContain("Submit Private Vote");
    expect(tallyReveal).toContain("Decrypt Public Tally");
    expect(tallyReveal).toContain("Individual votes remain permanently encrypted");
  });
});