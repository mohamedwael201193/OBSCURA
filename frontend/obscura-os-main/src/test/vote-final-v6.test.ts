import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const testDir = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(testDir, "..");
const workspaceRoot = resolve(sourceRoot, "..", "..", "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(sourceRoot, relativePath), "utf8");
}

function readWorkspace(relativePath: string): string {
  return readFileSync(resolve(workspaceRoot, relativePath), "utf8");
}

describe("Vote V6 production hardening gates", () => {
  it("keeps tally and self-vote decrypt user-triggered only", () => {
    const tallyHook = readSource("hooks/useVoteTally.ts");

    expect(tallyHook).toContain("decryptForView");
    expect(tallyHook).not.toMatch(/useEffect[\s\S]{0,400}decryptForView/);
    expect(tallyHook).toContain("const decryptTally = useCallback");
    expect(tallyHook).toContain("const decryptMyVote = useCallback");
  });

  it("indexes ObscuraVote cast events without ballot fields in ABI", () => {
    const eventsSource = readWorkspace("backend/obscura-worker/src/indexer/events.ts");

    const voteCastBlock = eventsSource.slice(
      eventsSource.indexOf('name: "VoteCast"'),
      eventsSource.indexOf('name: "VoteChanged"'),
    );
    expect(voteCastBlock).toContain("proposalId");
    expect(voteCastBlock).toContain("voter");
    expect(voteCastBlock).not.toMatch(/option|choice|support|against|abstain/i);
  });

  it("derives Vote reputation signals without amounts or choices", () => {
    const reputationSource = readWorkspace("backend/obscura-worker/src/reputation.ts");

    expect(reputationSource).toContain('case "ObscuraVote.VoteCast"');
    expect(reputationSource).toContain('"vote_participated"');
    expect(reputationSource).toContain("makeVoteSignal(activity, activity.args.voter");
    expect(reputationSource).not.toMatch(/args\.(option|choice|support|amount|value)/i);
  });

  it("sanitizes Governor vote payloads before shared activity storage", () => {
    const indexerSource = readWorkspace("backend/obscura-worker/src/indexer/index.ts");

    expect(indexerSource).toContain("sanitizeActivityArgs");
    expect(indexerSource).toContain('contractName === "ObscuraGovernor" && eventName === "VoteCast"');
    expect(indexerSource).toContain("serializeArgs({ voter: args.voter, proposalId: args.proposalId })");
  });

  it("keeps worker push payloads generic for Vote events", () => {
    const notificationsSource = readWorkspace("backend/obscura-worker/src/notifications.ts");

    expect(notificationsSource).toContain("function buildPayload");
    expect(notificationsSource).toContain("Activity detected for");
    expect(notificationsSource).not.toMatch(/body:\s*`[^`]*(support|against|abstain|option)/i);
  });

  it("ships Playwright navigation coverage for Vote desktop and mobile", () => {
    const spec = readFileSync(resolve(sourceRoot, "..", "tests", "vote-navigation.spec.ts"), "utf8");

    expect(spec).toContain("/vote");
    expect(spec).toContain("390");
    expect(spec).toContain("Overview");
    expect(spec).toContain("Advanced Governance");
  });
});
