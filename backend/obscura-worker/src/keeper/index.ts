/**
 * keeper/index.ts — Obscura Credit Market keeper
 *
 * 1. SCAN — iterates borrowers, computes HF off-chain via plaintext shadows + Chainlink.
 *           Calls liquidationOpen() when HF <= threshold.
 * 2. BID  — watches AuctionOpened events, settles expired auctions.
 *
 * Set KEEPER_DRY_RUN=false in production to enable live txs.
 * Requires KEEPER_PRIVATE_KEY — do NOT share this key.
 */
import {
  createPublicClient,
  createWalletClient,
  http,
  parseGwei,
  type Address,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { arbitrumSepolia } from "viem/chains";
import { loadKeeperConfig, type KeeperConfig } from "./config";
import { MARKET_ABI, AUCTION_ABI, CHAINLINK_ADAPTER_ABI } from "./abi";

// ─── HF computation ───────────────────────────────────────────────────────────
function computeHfBps(
  collAmt: bigint, collDec: number, collPx18: bigint,
  debtAmt: bigint, debtDec: number, debtPx18: bigint,
  liqThresholdBps: bigint,
): bigint {
  if (debtAmt === 0n || debtPx18 === 0n) return BigInt(1e9);
  const collVal = (collAmt * collPx18) / (10n ** BigInt(collDec));
  const debtVal = (debtAmt * debtPx18) / (10n ** BigInt(debtDec));
  if (debtVal === 0n) return BigInt(1e9);
  return (collVal * liqThresholdBps) / debtVal;
}

// ─── Price helpers ────────────────────────────────────────────────────────────
async function priceUSD18(
  pub: ReturnType<typeof createPublicClient>,
  adapter: Address,
): Promise<bigint> {
  return pub.readContract({
    address: adapter,
    abi: CHAINLINK_ADAPTER_ABI,
    functionName: "latestAnswer",
  }) as Promise<bigint>;
}

type PriceResult = { dec: number; px18: bigint };

async function assetPrice(
  pub: ReturnType<typeof createPublicClient>,
  asset: Address,
  cfg: KeeperConfig,
): Promise<PriceResult> {
  const a = asset.toLowerCase();
  if (
    (a === "0xefab856b903c4106769b14798dede21c6923d7d2" ||
     a === "0xf963fd86348813786ed57b8b2778a365c6226e43") &&
    cfg.usdcAdapter
  ) {
    return { dec: 6, px18: await priceUSD18(pub, cfg.usdcAdapter as Address) };
  }
  if (a === "0x16896b3d445122a23c36ac618966a842ac9bd56e" && cfg.ethAdapter) {
    return { dec: 6, px18: await priceUSD18(pub, cfg.ethAdapter as Address) };
  }
  if (a === "0x27298a55b80d9b8c4fc647a6ce2b25246d800778") {
    return { dec: 6, px18: 1n * 10n ** 18n };
  }
  return { dec: 6, px18: 0n };
}

// ─── Market scan ──────────────────────────────────────────────────────────────
async function scanMarket(
  pub: ReturnType<typeof createPublicClient>,
  wallet: ReturnType<typeof createWalletClient>,
  market: Address,
  cfg: KeeperConfig,
): Promise<void> {
  const [loanAsset, collateralAsset, liqThresholdBps] = await Promise.all([
    pub.readContract({ address: market, abi: MARKET_ABI, functionName: "loanAsset" }) as Promise<Address>,
    pub.readContract({ address: market, abi: MARKET_ABI, functionName: "collateralAsset" }) as Promise<Address>,
    pub.readContract({ address: market, abi: MARKET_ABI, functionName: "liqThresholdBps" }) as Promise<bigint>,
  ]);

  const [collPrice, debtPrice] = await Promise.all([
    assetPrice(pub, collateralAsset, cfg),
    assetPrice(pub, loanAsset, cfg),
  ]);

  const n = await pub.readContract({ address: market, abi: MARKET_ABI, functionName: "borrowersLength" }) as bigint;
  if (n === 0n) return;
  console.log(`[keeper] Scan ${market.slice(0, 10)} — borrowers=${n} liqT=${liqThresholdBps}bps`);

  for (let i = 0n; i < n; i++) {
    const borrower = await pub.readContract({
      address: market, abi: MARKET_ABI, functionName: "borrowerAt", args: [i],
    }) as Address;
    const hasBorrow = await pub.readContract({
      address: market, abi: MARKET_ABI, functionName: "hasBorrow", args: [borrower],
    }) as boolean;
    if (!hasBorrow) continue;

    const [debt, coll] = await Promise.all([
      pub.readContract({ address: market, abi: MARKET_ABI, functionName: "getPlainBorrow",     args: [borrower] }) as Promise<bigint>,
      pub.readContract({ address: market, abi: MARKET_ABI, functionName: "getPlainCollateral", args: [borrower] }) as Promise<bigint>,
    ]);
    if (debt === 0n) continue;

    const hfBps = computeHfBps(
      coll, collPrice.dec, collPrice.px18,
      debt, debtPrice.dec, debtPrice.px18,
      liqThresholdBps,
    );
    const tag = hfBps <= cfg.hfThresholdBps ? "LIQUIDATABLE" : "ok";
    console.log(`   ${borrower}  debt=${debt} coll=${coll} HF=${hfBps}bps  ${tag}`);

    if (hfBps <= cfg.hfThresholdBps) {
      if (cfg.dryRun) {
        console.log(`   [dry-run] would call liquidationOpen(${borrower})`);
      } else {
        const hash = await wallet.writeContract({
          address: market, abi: MARKET_ABI, functionName: "liquidationOpen", args: [borrower],
          chain: arbitrumSepolia, account: wallet.account!,
        });
        console.log(`   liquidationOpen tx: ${hash}`);
      }
    }
  }
}

// ─── Auction scan ─────────────────────────────────────────────────────────────
async function scanAuctions(
  pub: ReturnType<typeof createPublicClient>,
  wallet: ReturnType<typeof createWalletClient>,
  cfg: KeeperConfig,
): Promise<void> {
  const len = await pub.readContract({
    address: cfg.auction, abi: AUCTION_ABI, functionName: "auctionsLength",
  }) as bigint;
  if (len === 0n) return;

  for (let id = 0n; id < len; id++) {
    const a = await pub.readContract({
      address: cfg.auction, abi: AUCTION_ABI, functionName: "getAuction", args: [id],
    }) as readonly [Address, Address, bigint, bigint, Address, boolean, number];
    const [market, borrower, endsAt, , , settled] = a;
    if (settled) continue;

    const now = BigInt(Math.floor(Date.now() / 1000));
    const open = endsAt > now;
    console.log(`[keeper] Auction #${id} market=${market.slice(0,10)} borrower=${borrower.slice(0,10)} ${open ? "OPEN" : "EXPIRED"}`);

    if (!open) {
      if (cfg.dryRun) {
        console.log(`   [dry-run] would call settle(${id})`);
      } else {
        const hash = await wallet.writeContract({
          address: cfg.auction, abi: AUCTION_ABI, functionName: "settle", args: [id],
          chain: arbitrumSepolia, account: wallet.account!,
        });
        console.log(`   settle tx: ${hash}`);
      }
    }
  }
}

// ─── Gas guard ────────────────────────────────────────────────────────────────
async function gasOk(
  pub: ReturnType<typeof createPublicClient>,
  cfg: KeeperConfig,
): Promise<boolean> {
  try {
    const gp = await pub.getGasPrice();
    const cap = parseGwei(cfg.maxGasGwei.toString());
    if (gp > cap) {
      console.log(`[keeper] Gas too high: ${gp} > ${cap} — skipping tick`);
      return false;
    }
  } catch (_) { /* ignore — proceed */ }
  return true;
}

// ─── Main loop ────────────────────────────────────────────────────────────────
export async function startKeeper(): Promise<void> {
  const cfg = loadKeeperConfig();
  const pub = createPublicClient({ chain: arbitrumSepolia, transport: http(cfg.rpc) });
  const account = privateKeyToAccount(cfg.keeperPk);
  const wallet = createWalletClient({ account, chain: arbitrumSepolia, transport: http(cfg.rpc) });

  console.log(`[keeper] Starting — keeper: ${account.address}`);
  console.log(`[keeper] Markets: ${cfg.markets.length}  Auction: ${cfg.auction}`);
  console.log(`[keeper] Dry run: ${cfg.dryRun ? "YES" : "NO (LIVE)"}  Poll: ${cfg.pollMs}ms`);

  const tick = async () => {
    if (!await gasOk(pub, cfg)) return;
    for (const market of cfg.markets) {
      await scanMarket(pub, wallet, market as Address, cfg).catch((e) =>
        console.error(`[keeper] scanMarket error: ${(e as Error).message}`)
      );
    }
    await scanAuctions(pub, wallet, cfg).catch((e) =>
      console.error(`[keeper] scanAuctions error: ${(e as Error).message}`)
    );
  };

  await tick();
  setInterval(tick, cfg.pollMs);
}
