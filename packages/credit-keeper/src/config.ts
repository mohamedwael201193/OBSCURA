import "dotenv/config";

function req(k: string): string {
    const v = process.env[k];
    if (!v) throw new Error(`Missing env: ${k}`);
    return v;
}
function opt(k: string, dflt: string): string {
    return process.env[k] ?? dflt;
}

export const cfg = {
    rpc: req("ARB_SEPOLIA_RPC"),
    keeperPk: req("KEEPER_PRIVATE_KEY") as `0x${string}`,
    markets: req("MARKETS").split(",").map((s) => s.trim()) as `0x${string}`[],
    auction: req("AUCTION") as `0x${string}`,
    ethAdapter: opt("CHAINLINK_ETHUSD_ADAPTER", "") as `0x${string}` | "",
    usdcAdapter: opt("CHAINLINK_USDCUSD_ADAPTER", "") as `0x${string}` | "",
    pollMs: Number(opt("POLL_INTERVAL_MS", "30000")),
    hfThresholdBps: BigInt(opt("LIQUIDATION_HF_THRESHOLD_BPS", "10000")),
    bidDiscountBps: BigInt(opt("BID_DISCOUNT_BPS", "200")),
    maxGasGwei: Number(opt("MAX_GAS_GWEI", "2")),
    dryRun: opt("DRY_RUN", "true").toLowerCase() === "true",
};
