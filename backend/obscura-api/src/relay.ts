/**
 * relay.ts — ERC-4337 v0.7 UserOp relay
 *
 * POST /relay  — validates and forwards a PackedUserOperation to the bundler
 * GET  /health — included in main app health check
 *
 * Supports dual bundler: Alchemy (primary) + Pimlico (fallback).
 */
import { Router, Request, Response } from "express";
import { toHex } from "viem";
import type { Hex } from "viem";

const BUNDLER_URL         = process.env.BUNDLER_URL ?? "";
const BUNDLER_URL_FALLBACK = process.env.BUNDLER_URL_FALLBACK ?? "";
const PAYMASTER_ADDR      = process.env.PAYMASTER_ADDRESS ?? "";
const ENTRY_POINT         = "0x0000000071727De22E5E9d8BAf0edAc6f37da032";
const MAX_BODY_BYTES      = 16_384; // 16 KB hard cap on request body

if (!BUNDLER_URL) {
  console.error("[relay] BUNDLER_URL env var is required");
  process.exit(1);
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface PackedUserOperation {
  sender:              Hex;
  nonce:               string;
  initCode:            Hex;
  callData:            Hex;
  accountGasLimits:    Hex;
  preVerificationGas:  string;
  gasFees:             Hex;
  paymasterAndData:    Hex;
  signature:           Hex;
}

// ─── Validation ───────────────────────────────────────────────────────────────
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

// ─── Rate limit (in-memory, per IP) ──────────────────────────────────────────
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

// ─── Unpack packed UserOp → ERC-4337 v0.7 JSON-RPC format ───────────────────
/**
 * Bundlers expect the v0.7 JSON-RPC format with individual gas fields.
 * We store/transmit the packed on-chain struct; this unpacks it before submission.
 *
 * accountGasLimits (bytes32): high128 = verificationGasLimit, low128 = callGasLimit
 * gasFees          (bytes32): high128 = maxPriorityFeePerGas, low128 = maxFeePerGas
 * initCode        → factory (20 bytes) + factoryData (rest)
 * paymasterAndData → paymaster(20) + paymasterVerificationGasLimit(16) + paymasterPostOpGasLimit(16) + paymasterData
 */
interface BundlerUserOp {
  sender:                        Hex;
  nonce:                         string;
  factory:                       Hex | null;
  factoryData:                   Hex | null;
  callData:                      Hex;
  callGasLimit:                  string;
  verificationGasLimit:          string;
  preVerificationGas:            string;
  maxFeePerGas:                  string;
  maxPriorityFeePerGas:          string;
  paymaster:                     Hex | null;
  paymasterVerificationGasLimit: string | null;
  paymasterPostOpGasLimit:       string | null;
  paymasterData:                 Hex | null;
  signature:                     Hex;
}

function unpackForBundler(op: PackedUserOperation): BundlerUserOp {
  // Unpack accountGasLimits: high128 = verificationGasLimit, low128 = callGasLimit
  const gasLimits = BigInt(op.accountGasLimits);
  const verificationGasLimit = toHex(gasLimits >> 128n);
  const callGasLimit = toHex(gasLimits & ((1n << 128n) - 1n));

  // Unpack gasFees: high128 = maxPriorityFeePerGas, low128 = maxFeePerGas
  const gasFeesVal = BigInt(op.gasFees);
  const maxPriorityFeePerGas = toHex(gasFeesVal >> 128n);
  const maxFeePerGas = toHex(gasFeesVal & ((1n << 128n) - 1n));

  // Split initCode → factory (20 bytes) + factoryData (rest)
  let factory: Hex | null = null;
  let factoryData: Hex | null = null;
  if (op.initCode && op.initCode.length > 2) {
    factory = `0x${op.initCode.slice(2, 42)}` as Hex;
    factoryData = `0x${op.initCode.slice(42)}` as Hex;
  }

  // Split paymasterAndData:
  //   paymaster(20 bytes) + paymasterVerificationGasLimit(16 bytes) + paymasterPostOpGasLimit(16 bytes) + paymasterData
  let paymaster: Hex | null = null;
  let paymasterVerificationGasLimit: string | null = null;
  let paymasterPostOpGasLimit: string | null = null;
  let paymasterData: Hex | null = null;
  if (op.paymasterAndData && op.paymasterAndData.length >= 42) {
    paymaster = `0x${op.paymasterAndData.slice(2, 42)}` as Hex;  // 20 bytes
    if (op.paymasterAndData.length >= 106) {
      // bytes 20-36: verificationGasLimit (16 bytes = 32 hex chars)
      paymasterVerificationGasLimit = `0x${op.paymasterAndData.slice(42, 74)}`;
      // bytes 36-52: postOpGasLimit (16 bytes = 32 hex chars)
      paymasterPostOpGasLimit = `0x${op.paymasterAndData.slice(74, 106)}`;
      const rest = op.paymasterAndData.slice(106);
      paymasterData = rest.length > 0 ? `0x${rest}` as Hex : "0x";
    }
  }

  return {
    sender:                        op.sender,
    nonce:                         op.nonce,
    factory,
    factoryData,
    callData:                      op.callData,
    callGasLimit,
    verificationGasLimit,
    preVerificationGas:            op.preVerificationGas,
    maxFeePerGas,
    maxPriorityFeePerGas,
    paymaster,
    paymasterVerificationGasLimit,
    paymasterPostOpGasLimit,
    paymasterData,
    signature:                     op.signature,
  };
}

// ─── Bundler call ─────────────────────────────────────────────────────────────
async function sendToBundler(url: string, op: PackedUserOperation): Promise<string> {
  const rpcOp = unpackForBundler(op);
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: 1,
      method: "eth_sendUserOperation",
      params: [rpcOp, ENTRY_POINT],
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Bundler HTTP ${response.status}: ${text.slice(0, 200)}`);
  }

  const json = await response.json() as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(`Bundler error: ${json.error.message}`);
  if (!json.result) throw new Error("Bundler returned no result");
  return json.result;
}

// ─── Router ───────────────────────────────────────────────────────────────────
export const relayRouter = Router();
// Override body size limit specifically for relay
relayRouter.use((_req, _res, next) => {
  // Limit already set globally, just pass through
  next();
});

relayRouter.post("/relay", async (req: Request, res: Response) => {
  const ip = req.ip ?? "unknown";

  try {
    if (!rateCheck(ip)) {
      res.status(429).json({ error: "Rate limit exceeded. Max 20 requests per minute per IP." });
      return;
    }

    const { userOp } = req.body as { userOp: unknown };
    const op = validateUserOp(userOp);

    let userOpHash: string;
    try {
      userOpHash = await sendToBundler(BUNDLER_URL, op);
    } catch (primaryErr) {
      if (BUNDLER_URL_FALLBACK) {
        console.warn(`[relay] Primary bundler failed, trying fallback: ${(primaryErr as Error).message}`);
        userOpHash = await sendToBundler(BUNDLER_URL_FALLBACK, op);
      } else {
        throw primaryErr;
      }
    }

    console.log(`[relay] Submitted UserOp for ${op.sender} → hash ${userOpHash}`);
    res.json({ userOpHash });
  } catch (err) {
    const msg = (err as Error).message;
    console.error(`[relay] Error: ${msg}`);
    res.status(400).json({ error: msg });
  }
});

export { ENTRY_POINT, PAYMASTER_ADDR };
