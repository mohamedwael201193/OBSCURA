/**
 * sync-vote-abis.ts — Copy Vote-stack ABIs from Hardhat artifacts into the frontend.
 *
 * Run after `hardhat compile` or any Vote contract redeploy:
 *   npx hardhat run scripts/sync-vote-abis.ts
 */
import * as fs from "fs";
import * as path from "path";

const ROOT = path.join(__dirname, "..");
const ARTIFACTS = path.join(ROOT, "artifacts");
const DEPLOYMENTS = path.join(ROOT, "deployments", "arb-sepolia.json");
const FRONTEND_ABIS = path.join(ROOT, "..", "frontend", "obscura-os-main", "src", "abis", "vote");
const FRONTEND_ENV = path.join(ROOT, "..", "frontend", "obscura-os-main", ".env");

const VOTE_ARTIFACTS: { contract: string; artifactPath: string; deploymentKey: string; envKey?: string }[] = [
  {
    contract: "ObscuraVote",
    artifactPath: "contracts/ObscuraVote.sol/ObscuraVote.json",
    deploymentKey: "ObscuraVote",
    envKey: "VITE_OBSCURA_VOTE_ADDRESS",
  },
  {
    contract: "ObscuraTreasury",
    artifactPath: "contracts/ObscuraTreasury.sol/ObscuraTreasury.json",
    deploymentKey: "ObscuraTreasury",
    envKey: "VITE_OBSCURA_TREASURY_ADDRESS",
  },
  {
    contract: "ObscuraRewards",
    artifactPath: "contracts/ObscuraRewards.sol/ObscuraRewards.json",
    deploymentKey: "ObscuraRewards",
    envKey: "VITE_OBSCURA_REWARDS_ADDRESS",
  },
  {
    contract: "ObscuraGovernor",
    artifactPath: "contracts/governance/ObscuraGovernor.sol/ObscuraGovernor.json",
    deploymentKey: "ObscuraGovernor",
    envKey: "VITE_OBSCURA_GOVERNOR_ADDRESS",
  },
];

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function writeAbi(contract: string, abi: unknown[]): void {
  fs.mkdirSync(FRONTEND_ABIS, { recursive: true });
  const outPath = path.join(FRONTEND_ABIS, `${contract}.json`);
  fs.writeFileSync(outPath, `${JSON.stringify(abi, null, 2)}\n`);
  console.log(`  ✓ ${contract} → ${path.relative(ROOT, outPath)}`);
}

function updateEnv(envKey: string, address: string): void {
  if (!fs.existsSync(FRONTEND_ENV)) {
    console.log(`  · ${envKey} skipped (.env not found)`);
    return;
  }
  let env = fs.readFileSync(FRONTEND_ENV, "utf8");
  const pattern = new RegExp(`^${envKey}=.*$`, "m");
  if (pattern.test(env)) {
    env = env.replace(pattern, `${envKey}=${address}`);
  } else {
    env = `${env.trimEnd()}\n${envKey}=${address}\n`;
  }
  fs.writeFileSync(FRONTEND_ENV, env);
  console.log(`  ✓ ${envKey}=${address}`);
}

async function main(): Promise<void> {
  console.log("Syncing Vote-stack ABIs from Hardhat artifacts…\n");

  const deployments = fs.existsSync(DEPLOYMENTS)
    ? readJson<Record<string, string>>(DEPLOYMENTS)
    : {};

  for (const entry of VOTE_ARTIFACTS) {
    const artifactFile = path.join(ARTIFACTS, entry.artifactPath);
    if (!fs.existsSync(artifactFile)) {
      throw new Error(
        `Missing artifact ${entry.artifactPath}. Run \`npx hardhat compile\` first.`,
      );
    }
    const artifact = readJson<{ abi: unknown[] }>(artifactFile);
    writeAbi(entry.contract, artifact.abi);

    const address = deployments[entry.deploymentKey];
    if (address && entry.envKey) {
      updateEnv(entry.envKey, address);
    }
  }

  console.log("\nVote ABI sync complete.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
