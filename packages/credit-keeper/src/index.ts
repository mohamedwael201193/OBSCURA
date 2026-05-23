/* eslint-disable no-console */
/**
 * Obscura Credit Keeper
 *
 * Two responsibilities:
 *   1. SCAN — iterate over borrowers per market, compute HF off-chain using
 *      `getPlainBorrow` + `getPlainCollateral` + Chainlink adapter price.
 *      When HF <= threshold, call `market.liquidationOpen(borrower)`.
 *   2. BID  — watch `AuctionOpened` events, encrypt a bid via CoFHE SDK,
 *      submit via `auction.submitBid`.
 *
 * Privacy:
 *   - The plaintext shadows used by the keeper are PUBLIC reads from the
 *     market. The keeper does NOT have ACL on encrypted handles — it bids
 *     blind on collateral / debt by reading what the borrower made plaintext
 *     via the shadow accessor (designed for liquidation triage).
 *   - The keeper's bid amount IS encrypted; only the keeper and the auction
 *     can read it.
 *
 * Safety:
 *   - DRY_RUN=true (default) → only logs the actions, never broadcasts.
 *   - MAX_GAS_GWEI guard skips a tick if base fee exceeds budget.
 */

import {
    createPublicClient, createWalletClient, http, formatUnits, parseGwei,
    type Address, type Hex,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { cfg } from "./config.js";
import { MARKET_ABI, AUCTION_ABI, CHAINLINK_ADAPTER_ABI } from "./abi.js";

const pub = createPublicClient({ chain: arbitrumSepolia, transport: http(cfg.rpc) });
const account = privateKeyToAccount(cfg.keeperPk);
const wallet = createWalletClient({ account, chain: arbitrumSepolia, transport: http(cfg.rpc) });

console.log(`Obscura Credit Keeper`);
console.log(`  Network    : Arbitrum Sepolia`);
console.log(`  Keeper     : ${account.address}`);
console.log(`  Markets    : ${cfg.markets.length}`);
console.log(`  Auction    : ${cfg.auction}`);
console.log(`  Dry run    : ${cfg.dryRun ? "YES (safe)" : "NO (LIVE)"}`);
console.log(`  Poll       : ${cfg.pollMs} ms`);
console.log("");

// ─── Off-chain HF computation ────────────────────────────────────────────

/** Returns 18-decimal USD price from a ChainlinkPriceAdapter. */
async function priceUSD18(adapter: Address): Promise<bigint> {
    if (!adapter) return 0n;
    return await pub.readContract({
        address: adapter, abi: CHAINLINK_ADAPTER_ABI, functionName: "latestAnswer",
    }) as bigint;
}

/**
 * Compute HF in basis points. HF = (collateralValueUSD * liqThresholdBps) /
 *                                  (debtValueUSD * 10000) * 10000
 * Simplified: HF_bps = (cVal * liqT) / dVal.
 * Both values normalised to 18-decimal USD.
 */
function computeHfBps(
    collAmt: bigint, collDec: number, collPx18: bigint,
    debtAmt: bigint, debtDec: number, debtPx18: bigint,
    liqThresholdBps: bigint,
): bigint {
    if (debtAmt === 0n || debtPx18 === 0n) return BigInt(1e9); // no debt → safe
    const collVal = (collAmt * collPx18) / (10n ** BigInt(collDec));
    const debtVal = (debtAmt * debtPx18) / (10n ** BigInt(debtDec));
    if (debtVal === 0n) return BigInt(1e9);
    return (collVal * liqThresholdBps) / debtVal;
}

// ─── Market scan ─────────────────────────────────────────────────────────

type MarketCtx = {
    address: Address;
    loanAsset: Address;
    collateralAsset: Address;
    liqThresholdBps: bigint;
    collDec: number;
    debtDec: number;
    collPx18: bigint;
    debtPx18: bigint;
};

async function loadMarketCtx(market: Address): Promise<MarketCtx> {
    const [loanAsset, collateralAsset, liqThresholdBps] = await Promise.all([
        pub.readContract({ address: market, abi: MARKET_ABI, functionName: "loanAsset" }) as Promise<Address>,
        pub.readContract({ address: market, abi: MARKET_ABI, functionName: "collateralAsset" }) as Promise<Address>,
        pub.readContract({ address: market, abi: MARKET_ABI, functionName: "liqThresholdBps" }) as Promise<bigint>,
    ]);

    // Adapter routing — known assets only. Anything else gets a zero price
    // and is skipped (returns infinite HF).
    const px = async (asset: Address): Promise<{ dec: number; px18: bigint }> => {
        const a = asset.toLowerCase();
        // ocUSDC family (v3.15 wrapper; old faucet token also included)
        if ((a === "0xefab856b903c4106769b14798dede21c6923d7d2" ||
             a === "0xf963fd86348813786ed57b8b2778a365c6226e43") && cfg.usdcAdapter) {
            return { dec: 6, px18: await priceUSD18(cfg.usdcAdapter as Address) };
        }
        // ocWETH
        if (a === "0x16896b3d445122a23c36ac618966a842ac9bd56e" && cfg.ethAdapter) {
            return { dec: 6, px18: await priceUSD18(cfg.ethAdapter as Address) };
        }
        // ocOBS — no adapter, use 1 USD floor (configurable later)
        if (a === "0x27298a55b80d9b8c4fc647a6ce2b25246d800778") {
            return { dec: 6, px18: 1n * 10n ** 18n };
        }
        return { dec: 6, px18: 0n };
    };

    const [c, d] = await Promise.all([px(collateralAsset), px(loanAsset)]);
    return {
        address: market, loanAsset, collateralAsset, liqThresholdBps,
        collDec: c.dec, debtDec: d.dec, collPx18: c.px18, debtPx18: d.px18,
    };
}

async function scanMarket(ctx: MarketCtx): Promise<void> {
    const n = await pub.readContract({ address: ctx.address, abi: MARKET_ABI, functionName: "borrowersLength" }) as bigint;
    if (n === 0n) return;
    console.log(`[scan ${ctx.address.slice(0, 10)}] borrowers=${n} liqT=${ctx.liqThresholdBps}bps`);

    for (let i = 0n; i < n; i++) {
        const borrower = await pub.readContract({
            address: ctx.address, abi: MARKET_ABI, functionName: "borrowerAt", args: [i],
        }) as Address;
        const hasBorrow = await pub.readContract({
            address: ctx.address, abi: MARKET_ABI, functionName: "hasBorrow", args: [borrower],
        }) as boolean;
        if (!hasBorrow) continue;

        const [debt, coll] = await Promise.all([
            pub.readContract({ address: ctx.address, abi: MARKET_ABI, functionName: "getPlainBorrow", args: [borrower] }) as Promise<bigint>,
            pub.readContract({ address: ctx.address, abi: MARKET_ABI, functionName: "getPlainCollateral", args: [borrower] }) as Promise<bigint>,
        ]);
        if (debt === 0n) continue;

        const hfBps = computeHfBps(coll, ctx.collDec, ctx.collPx18, debt, ctx.debtDec, ctx.debtPx18, ctx.liqThresholdBps);
        const tag = hfBps <= cfg.hfThresholdBps ? "⚠ LIQUIDATABLE" : "ok";
        console.log(`   ${borrower}  debt=${debt}  coll=${coll}  HF=${hfBps}bps  ${tag}`);

        if (hfBps <= cfg.hfThresholdBps) {
            if (cfg.dryRun) {
                console.log(`     dry-run: would call liquidationOpen(${borrower})`);
            } else {
                const hash = await wallet.writeContract({
                    address: ctx.address, abi: MARKET_ABI, functionName: "liquidationOpen", args: [borrower],
                });
                console.log(`     liquidationOpen tx: ${hash}`);
            }
        }
    }
}

// ─── Auction bidding ─────────────────────────────────────────────────────
// NOTE: CoFHE SDK bid encryption is intentionally stubbed — the keeper bot
//       skeleton lays the architecture and event wiring, but real bid encryption
//       requires a server-mode cofhe-sdk client which is wallet-bound. Operators
//       must integrate their own keying strategy. This is documented in README.md.

async function scanAuctions(): Promise<void> {
    const len = await pub.readContract({ address: cfg.auction, abi: AUCTION_ABI, functionName: "auctionsLength" }) as bigint;
    if (len === 0n) return;
    for (let id = 0n; id < len; id++) {
        const a = await pub.readContract({
            address: cfg.auction, abi: AUCTION_ABI, functionName: "getAuction", args: [id],
        }) as readonly [Address, Address, bigint, bigint, Address, boolean, number];
        const [market, borrower, endsAt, , , settled, bids] = a;
        const now = BigInt(Math.floor(Date.now() / 1000));
        if (settled) continue;
        const open = endsAt > now;
        console.log(`[auction #${id}] market=${market.slice(0, 10)} borrower=${borrower.slice(0, 10)} bids=${bids} ${open ? "OPEN" : "EXPIRED"}`);

        if (!open) {
            if (cfg.dryRun) {
                console.log(`   dry-run: would call settle(${id})`);
            } else {
                const hash = await wallet.writeContract({
                    address: cfg.auction, abi: AUCTION_ABI, functionName: "settle", args: [id],
                });
                console.log(`   settle tx: ${hash}`);
            }
        } else {
            // Bid submission is operator-specific (encryption key + risk policy).
            // See README.md for the integration pattern.
            console.log(`   bid submission deferred to operator-specific module`);
        }
    }
}

// ─── Main loop ───────────────────────────────────────────────────────────

async function gasOk(): Promise<boolean> {
    try {
        const gp = await pub.getGasPrice();
        const cap = parseGwei(cfg.maxGasGwei.toString());
        if (gp > cap) {
            console.log(`gas ${formatUnits(gp, 9)} gwei > cap ${cfg.maxGasGwei} gwei — skipping tick`);
            return false;
        }
        return true;
    } catch { return true; }
}

async function tick(): Promise<void> {
    if (!(await gasOk())) return;
    try {
        const ctxs = await Promise.all(cfg.markets.map(loadMarketCtx));
        for (const ctx of ctxs) {
            if (ctx.collPx18 === 0n || ctx.debtPx18 === 0n) {
                console.log(`[skip ${ctx.address.slice(0, 10)}] missing adapter price`);
                continue;
            }
            await scanMarket(ctx);
        }
        await scanAuctions();
    } catch (e) {
        console.error("tick error:", (e as Error).message);
    }
}

async function main(): Promise<void> {
    const args = new Set(process.argv.slice(2));
    if (args.has("--scan-only")) {
        await tick(); return;
    }
    await tick();
    setInterval(tick, cfg.pollMs);
}

main().catch((e: unknown) => {
    console.error(e);
    process.exit(1);
});

export { tick, computeHfBps };
