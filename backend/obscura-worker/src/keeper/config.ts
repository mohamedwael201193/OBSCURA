import type { Address } from "viem";

function req(k: string): string {
  const v = process.env[k];
  if (!v) throw new Error(`[keeper] Missing env: ${k}`);
  return v;
}
function opt(k: string, dflt: string): string {
  return process.env[k] ?? dflt;
}

export interface KeeperConfig {
  rpc:               string;
  keeperPk:          `0x${string}`;
  markets:           `0x${string}`[];
  auction:           Address;
  ethAdapter:        Address | "";
  usdcAdapter:       Address | "";
  pollMs:            number;
  hfThresholdBps:    bigint;
  bidDiscountBps:    bigint;
  maxGasGwei:        number;
  dryRun:            boolean;
}

export function loadKeeperConfig(): KeeperConfig {
  return {
    rpc:            opt("RPC_URL", "https://sepolia-rollup.arbitrum.io/rpc"),
    keeperPk:       req("KEEPER_PRIVATE_KEY") as `0x${string}`,
    markets:        req("KEEPER_MARKETS").split(",").map((s) => s.trim()) as `0x${string}`[],
    auction:        req("KEEPER_AUCTION") as Address,
    ethAdapter:     opt("CHAINLINK_ETHUSD_ADAPTER",  "") as Address | "",
    usdcAdapter:    opt("CHAINLINK_USDCUSD_ADAPTER", "") as Address | "",
    pollMs:         Number(opt("KEEPER_POLL_MS",   "30000")),
    hfThresholdBps: BigInt(opt("KEEPER_HF_THRESHOLD_BPS", "10000")),
    bidDiscountBps: BigInt(opt("KEEPER_BID_DISCOUNT_BPS", "200")),
    maxGasGwei:     Number(opt("KEEPER_MAX_GAS_GWEI", "2")),
    dryRun:         opt("KEEPER_DRY_RUN", "true").toLowerCase() === "true",
  };
}
