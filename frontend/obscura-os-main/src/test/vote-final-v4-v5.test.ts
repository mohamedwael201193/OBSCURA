import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(testDir, "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(sourceRoot, relativePath), "utf8");
}

describe("Vote V4/V5 participation and advanced governance", () => {
  it("builds participation as a governance identity profile", () => {
    const votePage = readSource("pages/VotePage.tsx");
    const profile = readSource("components/vote/VoteParticipationProfile.tsx");

    expect(votePage).toContain("VoteParticipationProfile");
    expect(votePage).toContain("VoteCollapsibleSection");
    expect(profile).toContain("useReputationSummary");
    expect(profile).toContain("useVoterParticipation");
    expect(profile).toContain("REPUTATION_CATEGORY_SIGNALS");
    expect(profile).toContain("Governance standing");
  });

  it("reuses shared reputation categories without parallel systems", () => {
    const lib = readSource("lib/reputationCategories.ts");
    const profile = readSource("components/vote/VoteParticipationProfile.tsx");

    expect(lib).toContain("vote_participated");
    expect(lib).toContain("governance_vote_cast");
    expect(profile).toContain("@/lib/reputationCategories");
  });

  it("keeps participation sections collapsible with history and rewards", () => {
    const votePage = readSource("pages/VotePage.tsx");

    expect(votePage).toContain('title="Ballot history"');
    expect(votePage).toContain('title="Delegation"');
    expect(votePage).toContain('title="Rewards"');
    expect(votePage).toContain("ActivityFeed");
  });

  it("quiets advanced governance behind treasury and governor sub-nav", () => {
    const votePage = readSource("pages/VotePage.tsx");
    const intro = readSource("components/vote/VoteAdvancedIntro.tsx");

    expect(votePage).toContain("VoteAdvancedIntro");
    expect(votePage).toContain('type AdvancedMode = "treasury" | "governor"');
    expect(intro).toContain("irreversible");
  });

  it("adds safer execute confirmations and hides raw calldata", () => {
    const governor = readSource("components/vote/GovernorPanel.tsx");
    const treasury = readSource("components/vote/TreasuryPanel.tsx");

    expect(governor).toContain("Confirm execute");
    expect(governor).toContain("<details");
    expect(governor).toContain("Raw calldata");
    expect(treasury).toContain("Confirm execute");
  });
});
