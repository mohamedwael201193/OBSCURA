// scripts/deployWave5Phase1And2.ts
//
// Wave 5 — Phase 1 (IEncryptedScore activation) + Phase 2 (Chainlink oracle).
//
// Deploys:
//   1. ObscuraCreditScoreV2  — per-user score with correct adapter interfaces
//   2. ChainlinkPriceAdapter (ETH/USD)  — 8-dec → 18-dec re-scaler
//   3. ChainlinkPriceAdapter (USDC/USD) — 8-dec → 18-dec re-scaler
//
// Wires (separate tx batch, idempotent):
//   - ObscuraCreditScoreV2.setSources(payStreamV2, addressBook, voteV5)
//   - ObscuraCreditScoreV2.setAuthorizedMarket(M-86 / M-70-WETH / M-50-OBS, true)
//   - ObscuraCreditOracle.setPublicFeed(ocWETH, ethAdapter)
//   - ObscuraCreditOracle.setPublicFeed(ocUSDC, usdcAdapter)
//   - Market.setScoreOracle(scoreV2) on M-86 / M-70-WETH / M-50-OBS
//     (factory-gated; signer must be factory or owner of factory)
//
// Run:
//   npx hardhat run scripts/deployWave5Phase1And2.ts --network arb-sepolia

import { ethers, network } from "hardhat";
import * as fs from "fs";
import * as path from "path";

// ─── Live addresses (from deployments/arb-sepolia.json + frontend .env) ─────
const PAYSTREAM_V2  = "0xb2fF39C496131d4AFd01d189569aF6FEBaC54d2C";
const ADDRESS_BOOK  = "0x4095065ee7cc4C9f5210A328EC08e29B4Ac74Eef";
const VOTE_V5       = "0xe358776AfdbA95d7c9F040e6ef1f5A021aF91730";

const OC_USDC       = "0xEFab856b903C4106769B14798deDE21C6923d7d2"; // v3.15 wrapper
const OC_WETH       = "0x16896b3D445122a23C36aC618966A842aC9BD56e"; // v3.19 6dp
const OC_OBS        = "0x27298A55B80d9b8c4Fc647A6ce2b25246d800778"; // v3.19 6dp

const ORACLE        = "0x5F00910533AB6fc12a35a87BaFe856EF2cb323c3";

// v3.18 production markets (per WAVE4-CREDIT-PROGRESS.md)
const MARKET_M86       = "0xcf98d97934F37Ac9A05bc037437E43cb6788eC8b";
const MARKET_M70_WETH  = "0x0b645441D65A0CCb91A82b5a2eE3156C1c89207B";
const MARKET_M50_OBS   = "0x05e58B8D96Bbd752A72Fa02921A0eE31eCB9035d";

// Chainlink Arbitrum Sepolia feeds (verified docs.chain.link).
const CL_ETH_USD    = "0xd30e2101a97dcbAeBCBC04F14C3f624E67A35165";
const CL_USDC_USD   = "0x0153002d20B96532C639313c2d54c3dA09109309";

// 24h staleness window — testnet feeds drift; mainnet would tighten to 1h.
const MAX_STALENESS = 24 * 60 * 60;

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`Deployer: ${deployer.address}`);
    console.log(`Network:  ${network.name}`);
    console.log(`Balance:  ${ethers.formatEther(await ethers.provider.getBalance(deployer.address))} ETH\n`);

    // ─── 1. ObscuraCreditScoreV2 ──────────────────────────────────────────
    console.log("[1/3] ObscuraCreditScoreV2...");
    const ScoreF = await ethers.getContractFactory("ObscuraCreditScoreV2");
    const score  = await ScoreF.deploy(PAYSTREAM_V2, ADDRESS_BOOK, VOTE_V5);
    await score.waitForDeployment();
    const scoreAddr = await score.getAddress();
    console.log(`  -> ${scoreAddr}\n`);

    // ─── 2. Chainlink adapters ────────────────────────────────────────────
    const AdapterF = await ethers.getContractFactory("ChainlinkPriceAdapter");

    console.log("[2/3] ChainlinkPriceAdapter ETH/USD...");
    const ethAdapter = await AdapterF.deploy(CL_ETH_USD, MAX_STALENESS);
    await ethAdapter.waitForDeployment();
    const ethAdapterAddr = await ethAdapter.getAddress();
    console.log(`  -> ${ethAdapterAddr}`);

    console.log("[3/3] ChainlinkPriceAdapter USDC/USD...");
    const usdcAdapter = await AdapterF.deploy(CL_USDC_USD, MAX_STALENESS);
    await usdcAdapter.waitForDeployment();
    const usdcAdapterAddr = await usdcAdapter.getAddress();
    console.log(`  -> ${usdcAdapterAddr}\n`);

    // ─── Wire Score V2 ─────────────────────────────────────────────────────
    console.log("Wiring Score V2 authorized markets...");
    await (await score.setAuthorizedMarket(MARKET_M86,      true)).wait();
    await (await score.setAuthorizedMarket(MARKET_M70_WETH, true)).wait();
    await (await score.setAuthorizedMarket(MARKET_M50_OBS,  true)).wait();
    console.log("  M-86, M-70-WETH, M-50-OBS authorized ✓\n");

    // ─── Wire Oracle (governor-gated) ─────────────────────────────────────
    // The oracle's `setPublicFeed` is `onlyGov`. Skip silently if deployer
    // is not governor — the user can run a follow-up script with the
    // correct signer.
    console.log("Wiring Oracle public feeds (governor-gated)...");
    const oracleAbi = [
        "function governor() view returns (address)",
        "function setPublicFeed(address asset, address feed)",
    ];
    const oracle = new ethers.Contract(ORACLE, oracleAbi, deployer);
    const gov: string = await oracle.governor();
    if (gov.toLowerCase() === deployer.address.toLowerCase()) {
        await (await oracle.setPublicFeed(OC_WETH, ethAdapterAddr)).wait();
        console.log(`  ocWETH -> ETH/USD adapter ✓`);
        await (await oracle.setPublicFeed(OC_USDC, usdcAdapterAddr)).wait();
        console.log(`  ocUSDC -> USDC/USD adapter ✓`);
    } else {
        console.log(`  ⚠ deployer is NOT oracle governor (${gov}). Skip.`);
        console.log(`  ⚠ Run wiring tx separately with the governor signer:`);
        console.log(`     oracle.setPublicFeed(${OC_WETH}, ${ethAdapterAddr})`);
        console.log(`     oracle.setPublicFeed(${OC_USDC}, ${usdcAdapterAddr})`);
    }
    console.log();

    // ─── Wire Score Oracle on markets (factory-gated) ─────────────────────
    console.log("Wiring Score Oracle on markets (factory-gated)...");
    const marketAbi = [
        "function factory() view returns (address)",
        "function setScoreOracle(address oracle)",
    ];
    const markets = [MARKET_M86, MARKET_M70_WETH, MARKET_M50_OBS];
    const labels  = ["M-86", "M-70-WETH", "M-50-OBS"];
    for (let i = 0; i < markets.length; i++) {
        const m = new ethers.Contract(markets[i], marketAbi, deployer);
        const f: string = await m.factory();
        if (f.toLowerCase() === deployer.address.toLowerCase()) {
            await (await m.setScoreOracle(scoreAddr)).wait();
            console.log(`  ${labels[i]} (${markets[i]}) -> ${scoreAddr} ✓`);
        } else {
            console.log(`  ⚠ ${labels[i]}: deployer is NOT factory (${f}). Skip.`);
            console.log(`     Run separately with factory signer:`);
            console.log(`     market.setScoreOracle(${scoreAddr})`);
        }
    }
    console.log();

    // ─── Persist ───────────────────────────────────────────────────────────
    const deployPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
    const dep: Record<string, unknown> = JSON.parse(fs.readFileSync(deployPath, "utf8"));
    dep["ObscuraCreditScoreV2"]             = scoreAddr;
    dep["ChainlinkPriceAdapter_ETHUSD"]     = ethAdapterAddr;
    dep["ChainlinkPriceAdapter_USDCUSD"]    = usdcAdapterAddr;
    dep["wave5Phase1And2DeployedAt"]        = new Date().toISOString();
    fs.writeFileSync(deployPath, JSON.stringify(dep, null, 2));
    console.log("deployments/arb-sepolia.json updated ✓\n");

    // ─── Summary ───────────────────────────────────────────────────────────
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("Wave 5 — Phase 1 + Phase 2 deployment complete");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log(`ObscuraCreditScoreV2:         ${scoreAddr}`);
    console.log(`ChainlinkPriceAdapter ETH:    ${ethAdapterAddr}`);
    console.log(`ChainlinkPriceAdapter USDC:   ${usdcAdapterAddr}`);
    console.log("");
    console.log("Add to frontend/obscura-os-main/.env:");
    console.log(`VITE_OBSCURA_CREDIT_SCORE_V2_ADDRESS=${scoreAddr}`);
    console.log(`VITE_CHAINLINK_ADAPTER_ETHUSD_ADDRESS=${ethAdapterAddr}`);
    console.log(`VITE_CHAINLINK_ADAPTER_USDCUSD_ADDRESS=${usdcAdapterAddr}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
