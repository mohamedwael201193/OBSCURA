import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createPublicClient, http, Hex } from "viem";
import { arbitrumSepolia } from "viem/chains";

dotenv.config();

// ─── Config ──────────────────────────────────────────────────────────────────
const PORT                = parseInt(process.env.PORT ?? "3701");
const BUNDLER_URL         = process.env.BUNDLER_URL ?? "";          // Alchemy/Pimlico ERC-4337 bundler
const PAYMASTER_ADDR      = process.env.PAYMASTER_ADDRESS ?? "";
const ENTRY_POINT         = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const ALLOWED_ORIGINS     = (process.env.ALLOWED_ORIGINS ?? "http://localhost:5173").split(",");
const MAX_BODY_BYTES      = 16_384; // 16 KB hard cap

if (!BUNDLER_URL) {
  console.error("[relay] BUNDLER_URL env var is required");
  process.exit(1);
}

// ─── Types ───────────────────────────────────────────────────────────────────
/**
 * ERC-4337 v0.7 PackedUserOperation shape accepted by this relay.
 * The relay does NOT add paymaster data — the client does that before sending.
 */
interface PackedUserOperation {
  sender:              Hex;
  nonce:               string;  // hex string
  initCode:            Hex;
  callData:            Hex;
  accountGasLimits:    Hex;     // verificationGasLimit(128) | callGasLimit(128) packed
  preVerificationGas:  string;  // hex string
  gasFees:             Hex;     // maxPriorityFeePerGas(128) | maxFeePerGas(128) packed
  paymasterAndData:    Hex;
  signature:           Hex;
}

// ─── Validation helpers ───────────────────────────────────────────────────────
function isHex(v: unknown): v is Hex {
  return typeof v === "string" && /^0x[0-9a-fA-F]*$/.test(v);
}

function validateUserOp(op: unknown): PackedUserOperation {
  if (!op || typeof op !== "object") throw new Error("body.userOp must be an object");
  const u = op as Record<string, unknown>;
  const required = [
    "sender", "nonce", "initCode", "callData",
    "accountGasLimits", "preVerificationGas", "gasFees",
    "paymasterAndData", "signature",
  ] as const;
  for (const field of required) {
    if (!isHex(u[field]) && typeof u[field] !== "string") {
      throw new Error(`userOp.${field} is missing or not a hex string`);
    }
  }
  return u as unknown as PackedUserOperation;
}

// ─── Rate limit (simple in-memory, per IP) ────────────────────────────────────
const ipWindows = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS  = 60_000;
const MAX_PER_IP = 20;

function rateCheck(ip: string): boolean {
  const now = Date.now();
  let rec = ipWindows.get(ip);
  if (!rec || now > rec.resetAt) {
    rec = { count: 0, resetAt: now + WINDOW_MS };
    ipWindows.set(ip, rec);
  }
  rec.count++;
  return rec.count <= MAX_PER_IP;
}

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();

app.use(cors({ origin: ALLOWED_ORIGINS, methods: ["POST", "OPTIONS"] }));
app.use(express.json({ limit: MAX_BODY_BYTES }));

// Health check
app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", entryPoint: ENTRY_POINT, paymaster: PAYMASTER_ADDR });
});

/**
 * POST /relay
 * Body: { userOp: PackedUserOperation }
 * Returns: { userOpHash: string } on success
 */
app.post("/relay", async (req: Request, res: Response) => {
  const ip = req.ip ?? "unknown";

  try {
    // Rate limit
    if (!rateCheck(ip)) {
      res.status(429).json({ error: "Rate limit exceeded. Max 20 requests per minute per IP." });
      return;
    }

    const { userOp } = req.body as { userOp: unknown };
    const op = validateUserOp(userOp);

    // Forward to bundler via eth_sendUserOperation (ERC-4337 v0.7)
    const response = await fetch(BUNDLER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_sendUserOperation",
        params: [op, ENTRY_POINT],
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Bundler HTTP ${response.status}: ${text.slice(0, 200)}`);
    }

    const json = await response.json() as { result?: string; error?: { message: string } };

    if (json.error) {
      res.status(400).json({ error: `Bundler error: ${json.error.message}` });
      return;
    }

    console.log(`[relay] Submitted UserOp for ${op.sender} → hash ${json.result}`);
    res.json({ userOpHash: json.result });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[relay] Error: ${msg}`);
    res.status(400).json({ error: msg });
  }
});

/**
 * POST /simulate
 * Dry-run eth_estimateUserOperationGas without submitting.
 * Body: { userOp: PackedUserOperation }
 * Returns bundler gas estimate response.
 */
app.post("/simulate", async (req: Request, res: Response) => {
  const ip = req.ip ?? "unknown";
  if (!rateCheck(ip)) {
    res.status(429).json({ error: "Rate limit exceeded." });
    return;
  }

  try {
    const { userOp } = req.body as { userOp: unknown };
    const op = validateUserOp(userOp);

    const response = await fetch(BUNDLER_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: 1,
        method: "eth_estimateUserOperationGas",
        params: [op, ENTRY_POINT],
      }),
    });

    const json = await response.json();
    res.json(json);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: msg });
  }
});

// Global error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[relay] Unhandled:", err.message);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`[relay] Obscura Pay relay listening on :${PORT}`);
  console.log(`[relay] EntryPoint: ${ENTRY_POINT}`);
  console.log(`[relay] Bundler:    ${BUNDLER_URL}`);
  console.log(`[relay] Paymaster:  ${PAYMASTER_ADDR}`);
});
