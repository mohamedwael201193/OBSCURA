/**
 * index.ts — obscura-api
 *
 * Unified API server combining:
 *   - ERC-4337 UserOp relay  (POST /relay)
 *   - Web Push notifications  (POST /subscribe, GET /vapid-public-key, etc.)
 *   - Supabase Realtime push dispatcher (background, no HTTP route)
 *
 * Single Render web service replaces pay-relay + pay-notifications.
 */
import express from "express";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

import { relayRouter, ENTRY_POINT, PAYMASTER_ADDR } from "./relay";
import { notificationsRouter, startNotificationListener } from "./notifications";
import { reputationRouter } from "./reputation";

const PORT = parseInt(process.env.PORT ?? "3000");
const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
  "https://obscura-os-nine.vercel.app",
];
const ALLOWED_ORIGINS = Array.from(new Set([
  ...DEFAULT_ALLOWED_ORIGINS,
  ...(process.env.ALLOWED_ORIGINS ?? "").split(","),
].map((origin) => origin.trim()).filter(Boolean)));
const LOOPBACK_DEV_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1):\d+$/;

function corsOrigin(
  origin: string | undefined,
  callback: (err: Error | null, allow?: boolean) => void,
) {
  if (!origin || ALLOWED_ORIGINS.includes(origin) || LOOPBACK_DEV_ORIGIN.test(origin)) {
    callback(null, true);
    return;
  }
  callback(new Error(`Origin ${origin} not allowed by CORS`));
}

const app = express();

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors({ origin: corsOrigin, methods: ["GET", "POST", "DELETE", "OPTIONS"] }));
app.use(express.json({ limit: 16384 })); // 16 KB

// ─── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({
    status:     "ok",
    service:    "obscura-api",
    entryPoint: ENTRY_POINT,
    paymaster:  PAYMASTER_ADDR,
    timestamp:  new Date().toISOString(),
  });
});

// ─── Route modules ────────────────────────────────────────────────────────────
app.use(relayRouter);
app.use(notificationsRouter);
app.use(reputationRouter);

// 404 catch-all
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`[api] obscura-api listening on port ${PORT}`);
  console.log(`[api] CORS origins: ${ALLOWED_ORIGINS.join(", ")}`);
  console.log(`[api] EntryPoint: ${ENTRY_POINT}`);
  console.log(`[api] Paymaster:  ${PAYMASTER_ADDR}`);
  startNotificationListener();
});
