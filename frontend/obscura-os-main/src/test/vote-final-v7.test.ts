import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
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

describe("Vote V7 indexer + ABI sync gates", () => {
  it("indexes ObscuraTreasury and ObscuraRewards in the worker", () => {
    const eventsSource = readWorkspace("backend/obscura-worker/src/indexer/events.ts");
    const indexerSource = readWorkspace("backend/obscura-worker/src/indexer/index.ts");

    expect(eventsSource).toContain("export const TREASURY_EVENTS");
    expect(eventsSource).toContain('name: "SpendAttached"');
    expect(eventsSource).toContain('name: "SpendExecuted"');
    expect(eventsSource).toContain("export const REWARDS_EVENTS");
    expect(eventsSource).toContain('name: "RewardAccrued"');
    expect(eventsSource).toContain('name: "RewardWithdrawn"');

    expect(indexerSource).toContain('contractName: "ObscuraTreasury"');
    expect(indexerSource).toContain('contractName: "ObscuraRewards"');
    expect(indexerSource).toContain("TREASURY_EVENTS");
    expect(indexerSource).toContain("REWARDS_EVENTS");
  });

  it("strips treasury and reward amounts from shared activity args", () => {
    const indexerSource = readWorkspace("backend/obscura-worker/src/indexer/index.ts");

    expect(indexerSource).toContain('contractName === "ObscuraTreasury" && eventName === "SpendExecuted"');
    expect(indexerSource).toContain('contractName === "ObscuraRewards" && eventName === "RewardAccrued"');
    expect(indexerSource).toContain('contractName === "ObscuraRewards" && eventName === "RewardWithdrawn"');
    expect(indexerSource).not.toMatch(/serializeArgs\(\{[^}]*amountWei/);
    expect(indexerSource).not.toMatch(/serializeArgs\(\{[^}]*rewardGwei/);
  });

  it("derives treasury and reward reputation signals without amounts", () => {
    const reputationSource = readWorkspace("backend/obscura-worker/src/reputation.ts");
    const apiReputation = readWorkspace("backend/obscura-api/src/reputation.ts");

    expect(reputationSource).toContain('case "ObscuraTreasury.SpendAttached"');
    expect(reputationSource).toContain('"treasury_spend_attached"');
    expect(reputationSource).toContain('case "ObscuraRewards.RewardAccrued"');
    expect(reputationSource).toContain('"vote_reward_accrued"');
    expect(reputationSource).not.toMatch(/args\.(amountWei|rewardGwei|amount)/i);

    expect(apiReputation).toContain("treasury_spend_attached");
    expect(apiReputation).toContain("vote_reward_accrued");
  });

  it("routes treasury and reward notifications to Vote with privacy-safe aliases", () => {
    for (const relativePath of [
      "backend/obscura-worker/src/notifications.ts",
      "backend/obscura-api/src/notifications.ts",
    ]) {
      const source = readWorkspace(relativePath);
      expect(source).toContain("ObscuraTreasury.");
      expect(source).toContain("ObscuraRewards.");
      expect(source).toContain("treasury.spend_executed");
      expect(source).toContain("rewards.accrued");
    }
  });

  it("includes treasury and reward events in the Vote activity feed filter", () => {
    const activityHook = readSource("hooks/useActivityFeed.ts");
    const activityFeed = readSource("components/harmony/ActivityFeed.tsx");

    expect(activityHook).toContain('"ObscuraTreasury"');
    expect(activityHook).toContain('"ObscuraRewards"');
    expect(activityHook).toContain('"SpendExecuted"');
    expect(activityHook).toContain('"RewardAccrued"');
    expect(activityFeed).toContain("Treasury spend executed");
    expect(activityFeed).toContain("Voter reward accrued");
  });

  it("generates frontend Vote ABIs from Hardhat artifacts instead of hand-maintained copies", () => {
    const contractsConfig = readSource("config/contracts.ts");
    const governorModule = readSource("abis/ObscuraGovernor.ts");
    const syncScript = readWorkspace("contracts-hardhat/scripts/sync-vote-abis.ts");

    expect(syncScript).toContain("sync-vote-abis.ts");
    expect(syncScript).toContain("ObscuraVote.json");
    expect(contractsConfig).toContain('@/abis/vote/ObscuraVote.json');
    expect(contractsConfig).toContain("export const OBSCURA_VOTE_ABI = ObscuraVoteAbi");
    expect(contractsConfig).not.toContain("export const OBSCURA_VOTE_ABI = [");

    expect(governorModule).toContain('@/abis/vote/ObscuraGovernor.json');
    expect(governorModule).not.toContain('name: "castVote"');

    for (const contract of ["ObscuraVote", "ObscuraTreasury", "ObscuraRewards", "ObscuraGovernor"]) {
      expect(
        existsSync(resolve(sourceRoot, "abis", "vote", `${contract}.json`)),
      ).toBe(true);
    }
  });
});
