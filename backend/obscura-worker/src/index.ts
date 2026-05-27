/**
 * index.ts — obscura-worker
 *
 * Unified background worker combining:
 *   - On-chain event indexer (6 Obscura Pay contracts → Supabase)
 *   - Credit market liquidation keeper (optional — requires KEEPER_PRIVATE_KEY)
 *
 * Runs as a Render FREE web service (not a worker) so there are no costs.
 * A minimal HTTP health server is included so Render can healthcheck the instance.
 */
import dotenv from "dotenv";
dotenv.config();

import http from "http";
import { startIndexer, getIndexerHealth } from "./indexer";
import { startKeeper } from "./keeper";
import { backfillReputationEvents, getReputationHealth, shouldRunReputationBackfillOnStart } from "./reputation";

// ── Minimal health server (required for Render free web service) ──────────────
const PORT = parseInt(process.env.PORT ?? "3001");
const healthServer = http.createServer((_req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    status: "ok",
    service: "obscura-worker",
    indexer: getIndexerHealth(),
    reputation: getReputationHealth(),
    keeper: {
      enabled: process.env.KEEPER_ENABLED === "true",
      configured: Boolean(process.env.KEEPER_PRIVATE_KEY),
    },
    timestamp: new Date().toISOString(),
  }));
});
healthServer.listen(PORT, () => {
  console.log(`[worker] Health server on port ${PORT}`);
});

async function main(): Promise<void> {
  console.log("[worker] obscura-worker starting");

  // ── Indexer (always enabled) ───────────────────────────────────────────────
  const stopIndexer = await startIndexer();

  if (shouldRunReputationBackfillOnStart()) {
    backfillReputationEvents().catch((e) => {
      console.error("[worker] Reputation backfill failed:", (e as Error).message);
    });
  } else {
    console.log("[worker] Reputation backfill disabled");
  }

  // ── Credit Keeper (explicit opt-in; keep Pay indexing from sharing RPC quota)
  if (process.env.KEEPER_ENABLED === "true" && process.env.KEEPER_PRIVATE_KEY) {
    startKeeper().catch((e) => {
      console.error("[worker] Keeper fatal error:", (e as Error).message);
    });
  } else if (process.env.KEEPER_ENABLED === "true") {
    console.log("[worker] KEEPER_ENABLED=true but KEEPER_PRIVATE_KEY is not set — credit keeper disabled");
  } else {
    console.log("[worker] KEEPER_ENABLED is not true — credit keeper disabled");
  }

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = () => {
    console.log("[worker] Shutting down...");
    stopIndexer();
    healthServer.close();
    process.exit(0);
  };
  process.on("SIGINT",  shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("[worker] Fatal:", err);
  process.exit(1);
});
