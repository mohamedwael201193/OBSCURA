import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const testDir = dirname(fileURLToPath(import.meta.url));
const sourceRoot = resolve(testDir, "..");
const workspaceRoot = resolve(sourceRoot, "..", "..", "..");

function readSource(relativePath: string): string {
  return readFileSync(resolve(sourceRoot, relativePath), "utf8");
}

function readWorkspace(relativePath: string): string {
  return readFileSync(resolve(workspaceRoot, relativePath), "utf8");
}

describe("Vote V1 safety and shared infrastructure gates", () => {
  it("waits for confirmed receipts before Vote write success states", () => {
    const encryptedVoteHook = readSource("hooks/useEncryptedVote.ts");
    const createProposalForm = readSource("components/vote/CreateProposalForm.tsx");
    const tallyReveal = readSource("components/vote/TallyReveal.tsx");

    expect(encryptedVoteHook).toContain("publicClient.waitForTransactionReceipt({ hash })");
    expect(encryptedVoteHook).toContain("FHEStepStatus.SETTLING");
    expect(encryptedVoteHook).toContain("receipt.status !== 'success'");
    expect(encryptedVoteHook.indexOf("waitForTransactionReceipt")).toBeLessThan(encryptedVoteHook.indexOf("FHEStepStatus.READY"));

    expect(createProposalForm).toContain("publicClient!.waitForTransactionReceipt({ hash })");
    expect(createProposalForm).toContain('receipt.status !== "success"');
    expect(createProposalForm).toContain("Proposal confirmed!");

    expect(tallyReveal).toContain("publicClient!.waitForTransactionReceipt({ hash })");
    expect(tallyReveal).toContain('receipt.status !== "success"');
    expect(tallyReveal).toContain("isFinalizeConfirming");
  });

  it("waits for confirmed receipts before treasury attach spend reports READY", () => {
    const treasuryHook = readSource("hooks/useTreasury.ts");
    const writeIndex = treasuryHook.indexOf('functionName: "attachSpend"');
    const receiptIndex = treasuryHook.indexOf("publicClient.waitForTransactionReceipt({ hash })", writeIndex);
    const readyIndex = treasuryHook.indexOf("FHEStepStatus.READY", receiptIndex);

    expect(treasuryHook).toContain("FHEStepStatus.SETTLING");
    expect(receiptIndex).toBeGreaterThan(writeIndex);
    expect(readyIndex).toBeGreaterThan(receiptIndex);
    expect(treasuryHook).toContain('receipt.status !== "success"');
  });

  it("adds Vote to the shared activity feed without exposing choices", () => {
    const activityHook = readSource("hooks/useActivityFeed.ts");
    const activityFeed = readSource("components/harmony/ActivityFeed.tsx");
    const votePage = readSource("pages/VotePage.tsx");

    expect(activityHook).toContain('| "vote"');
    expect(activityHook).toContain("VOTE_ACTIVITY_EVENT_NAMES");
    expect(activityHook).toContain('"ObscuraVote"');
    expect(activityHook).toContain('"ObscuraGovernor"');
    expect(activityFeed).toContain('{ key: "vote",     label: "Vote" }');
    expect(activityFeed).toContain("Private vote recorded");
    expect(activityFeed).toContain("Private vote updated");
    expect(activityFeed).toContain("Final totals available");
    expect(activityFeed).toContain("Executable vote recorded");
    expect(votePage).toContain('defaultFilter="vote"');
    expect(votePage).toContain('filters={["vote"]}');
    expect(activityFeed).not.toMatch(/voted (for|against|yes|no)/i);
  });

  it("routes Vote notifications to Vote and keeps aliases privacy-safe", () => {
    const notificationSources = [
      readWorkspace("backend/obscura-api/src/notifications.ts"),
      readWorkspace("backend/obscura-worker/src/notifications.ts"),
    ];

    for (const notificationSource of notificationSources) {
      expect(notificationSource).toContain("ObscuraVote.");
      expect(notificationSource).toContain("ObscuraGovernor.");
      expect(notificationSource).toContain("/vote");
      expect(notificationSource).toContain("vote.*");
      expect(notificationSource).toContain("vote.cast");
      expect(notificationSource).toContain("vote.changed");
      expect(notificationSource).toContain("vote.finalized");
      expect(notificationSource).toContain("governor.*");
      expect(notificationSource).toContain("governor.vote_cast");
      expect(notificationSource).not.toContain("args.support");
      expect(notificationSource).not.toContain("args.reason");
      expect(notificationSource).not.toMatch(/body:\s*`[^`]*(support|reason|against|abstain)/i);
    }
  });

  it("keeps Governor public vote details sanitized before shared notifications", () => {
    const indexerSource = readWorkspace("backend/obscura-worker/src/indexer/index.ts");

    expect(indexerSource).toContain('contractName === "ObscuraGovernor" && eventName === "VoteCast"');
    expect(indexerSource).toContain("serializeArgs({ voter: args.voter, proposalId: args.proposalId })");
    expect(indexerSource).toContain('contractName === "ObscuraGovernor" && eventName === "ProposalCreated"');
  });

  it("keeps frontend Arbitrum Sepolia RPC fallbacks browser-safe", () => {
    const wagmiConfig = readSource("config/wagmi.ts");

    expect(wagmiConfig).not.toContain("endpoints.omniatech.io/v1/arbitrum/sepolia/public");
  });
});