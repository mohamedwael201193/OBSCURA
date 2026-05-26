/**
 * userop.ts — PackedUserOperation (ERC-4337 v0.7) builder + relay submitter
 *
 * Key rules:
 *   • accountGasLimits = verificationGasLimit(128) | callGasLimit(128)  — packed as bytes32
 *   • gasFees          = maxPriorityFeePerGas(128) | maxFeePerGas(128)  — packed as bytes32
 *   • preVerificationGas is a flat overhead estimate (not packed)
 *   • paymasterAndData = paymasterAddress + 16-byte verificationGasLimit + 16-byte postOpGasLimit
 *   • Nonce is fetched from the EntryPoint (not the account itself)
 */

import { encodeAbiParameters, parseAbiParameters, encodeFunctionData, concat, pad, stringToHex, toHex } from "viem";
import type { PublicClient, Hex, Address } from "viem";
import { ENTRY_POINT_V07, ENTRY_POINT_ABI, PAYMASTER_ADDRESS, RELAY_URL } from "@/config/smartAccount";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface PackedUserOperation {
  sender:             Hex;
  nonce:              bigint;
  initCode:           Hex;
  callData:           Hex;
  accountGasLimits:   Hex;    // bytes32: verificationGas(128-bit) | callGas(128-bit)
  preVerificationGas: bigint;
  gasFees:            Hex;    // bytes32: maxPriorityFeePerGas(128-bit) | maxFeePerGas(128-bit)
  paymasterAndData:   Hex;
  signature:          Hex;    // will be replaced before submitting
}

export interface UserOpBuildOptions {
  /** Smart account address (sender) */
  sender: Address;
  /** Target contract address */
  target?: Address;
  /** Encoded call data for the target */
  callData?: Hex;
  /** Pre-encoded smart-account calldata, e.g. executeBatch(...) */
  accountCallData?: Hex;
  /** ETH value to forward (default 0) */
  value?: bigint;
  /** Factory initCode (only for first deployment, empty after) */
  initCode?: Hex;
  /** Whether to include paymasterAndData (default true if PAYMASTER_ADDRESS is set) */
  usePaymaster?: boolean;
  /** publicClient for nonce + gas queries */
  publicClient: PublicClient;
}

export interface RelayResult {
  userOpHash: Hex;
  transactionHash?: Hex;
}

// ─── Gas constants (conservative for Arbitrum Sepolia) ───────────────────────
const VERIFICATION_GAS  = 200_000n;
const CALL_GAS          = 500_000n;
const PRE_VERIFICATION  = 100_000n;
const PAYMASTER_VERIFICATION_GAS = 200_000n;
const PAYMASTER_POST_OP = 100_000n;   // postOpGasLimit in paymasterAndData
const MIN_PRIORITY_FEE_PER_GAS = 120_000n;
const FALLBACK_MAX_FEE_PER_GAS = 100_000_000n;
const USER_OP_RECEIPT_POLL_MS = 4_000;
const USER_OP_RECEIPT_ATTEMPTS = 30;

interface RelayGasPriceTier {
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
}

interface RelayGasPriceResponse {
  standard?: RelayGasPriceTier;
}

interface RelayGasEstimateResponse {
  callGasLimit?: string;
  verificationGasLimit?: string;
  preVerificationGas?: string;
  paymasterVerificationGasLimit?: string | null;
  paymasterPostOpGasLimit?: string | null;
}

interface RelayUserOperationReceipt {
  userOpHash?: Hex;
  success?: boolean;
  reason?: string;
  receipt?: {
    transactionHash?: Hex;
    status?: string;
  };
}

interface RelayUserOperationReceiptResponse {
  receipt?: RelayUserOperationReceipt | null;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Pack two 128-bit values into a bytes32 (big-endian) */
function pack128(high: bigint, low: bigint): Hex {
  const h = BigInt.asUintN(128, high);
  const l = BigInt.asUintN(128, low);
  return toHex((h << 128n) | l, { size: 32 });
}

function normalizeGasFees(maxFeePerGas: bigint | undefined, maxPriorityFeePerGas: bigint | undefined) {
  let priorityFee = maxPriorityFeePerGas ?? MIN_PRIORITY_FEE_PER_GAS;
  let maxFee = maxFeePerGas ?? FALLBACK_MAX_FEE_PER_GAS;

  if (priorityFee < MIN_PRIORITY_FEE_PER_GAS) priorityFee = MIN_PRIORITY_FEE_PER_GAS;
  if (maxFee < priorityFee) maxFee = priorityFee;

  return { maxFeePerGas: maxFee, maxPriorityFeePerGas: priorityFee };
}

function parseOptionalBigInt(value: string | null | undefined): bigint | undefined {
  if (!value) return undefined;
  try {
    return BigInt(value);
  } catch {
    return undefined;
  }
}

function withGasMargin(value: bigint): bigint {
  return (value * 120n + 99n) / 100n;
}

function maxGas(floor: bigint, estimated: bigint | undefined): bigint {
  return estimated === undefined ? floor : floor > withGasMargin(estimated) ? floor : withGasMargin(estimated);
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function buildPaymasterAndData(
  usePaymaster: boolean,
  paymasterVerificationGas: bigint,
  paymasterPostOpGas: bigint,
): Hex {
  if (!usePaymaster || !PAYMASTER_ADDRESS) return "0x";

  const verificationGasBytes = pad(toHex(paymasterVerificationGas), { size: 16 });
  const postOpGasBytes = pad(toHex(paymasterPostOpGas), { size: 16 });
  return concat([PAYMASTER_ADDRESS, verificationGasBytes, postOpGasBytes]);
}

function dummyWebAuthnSignature(): Hex {
  const challenge = "A".repeat(43);
  const clientDataJSON = `{"type":"webauthn.get","challenge":"${challenge}","origin":"https://obscura-os-nine.vercel.app","crossOrigin":false}`;
  const challengeOffset = BigInt(clientDataJSON.indexOf(challenge));
  const authenticatorData = `0x${"00".repeat(32)}01${"00".repeat(4)}` as Hex;
  const zero32 = `0x${"00".repeat(32)}` as Hex;

  const payload = encodeAbiParameters(
    parseAbiParameters("bytes authenticatorData, bytes clientDataJSON, uint256 challengeOffset, bytes32 r, bytes32 s"),
    [authenticatorData, stringToHex(clientDataJSON), challengeOffset, zero32, zero32],
  );

  return concat(["0x01", payload]);
}

function serializeUserOp(op: PackedUserOperation) {
  return {
    sender:             op.sender,
    nonce:              toHex(op.nonce),
    initCode:           op.initCode,
    callData:           op.callData,
    accountGasLimits:   op.accountGasLimits,
    preVerificationGas: toHex(op.preVerificationGas),
    gasFees:            op.gasFees,
    paymasterAndData:   op.paymasterAndData,
    signature:          op.signature,
  };
}

async function fetchRelayUserOperationGasPrice() {
  try {
    const response = await fetch(`${RELAY_URL}/userop-gas-price`, { method: "GET" });
    if (!response.ok) return null;

    const json = await response.json() as RelayGasPriceResponse;
    return normalizeGasFees(
      parseOptionalBigInt(json.standard?.maxFeePerGas),
      parseOptionalBigInt(json.standard?.maxPriorityFeePerGas),
    );
  } catch {
    return null;
  }
}

async function fetchRelayUserOperationGasEstimate(op: PackedUserOperation) {
  try {
    const response = await fetch(`${RELAY_URL}/estimate-userop-gas`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userOp: serializeUserOp(op) }),
    });
    if (!response.ok) return null;

    return await response.json() as RelayGasEstimateResponse;
  } catch {
    return null;
  }
}

async function fetchRelayUserOperationReceipt(userOpHash: Hex) {
  const response = await fetch(`${RELAY_URL}/userop-receipt/${userOpHash}`, { method: "GET" });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Relay receipt error ${response.status}: ${text.slice(0, 300)}`);
  }

  const json = await response.json() as RelayUserOperationReceiptResponse;
  if (json.error) throw new Error(`Relay receipt: ${json.error}`);
  return json.receipt ?? null;
}

async function waitForRelayUserOperationReceipt(userOpHash: Hex) {
  for (let attempt = 0; attempt < USER_OP_RECEIPT_ATTEMPTS; attempt++) {
    if (attempt > 0) await sleep(USER_OP_RECEIPT_POLL_MS);
    const receipt = await fetchRelayUserOperationReceipt(userOpHash);
    if (receipt) return receipt;
  }

  throw new Error("Relay accepted the UserOp, but no execution receipt was available yet. Check the transaction before retrying.");
}

function formatUserOperationFailure(receipt: RelayUserOperationReceipt) {
  const reason = receipt.reason ?? "";
  if (reason.includes("0x7ba5ffb5")) {
    return "Smart account execution failed: encrypted ocUSDC inputs cannot be relayed through the smart account yet. Switch to Private Mode for this encrypted send.";
  }

  const txHash = receipt.receipt?.transactionHash;
  const suffix = txHash ? ` Bundle tx: ${txHash}` : "";
  return `Smart account execution failed.${reason ? ` ${reason}` : ""}${suffix}`;
}

/** Encode the execute(address,uint256,bytes) callData for the smart account */
export function encodeExecuteCall(target: Address, value: bigint, data: Hex): Hex {
  return encodeFunctionData({
    abi: [{
      name: "execute",
      type: "function",
      inputs: [
        { name: "target", type: "address" },
        { name: "value",  type: "uint256" },
        { name: "data",   type: "bytes" },
      ],
    }],
    functionName: "execute",
    args: [target, value, data],
  });
}

/** Encode executeBatch(address[],uint256[],bytes[]) callData */
export function encodeExecuteBatchCall(
  targets: Address[],
  values: bigint[],
  datas: Hex[],
): Hex {
  return encodeFunctionData({
    abi: [{
      name: "executeBatch",
      type: "function",
      inputs: [
        { name: "targets", type: "address[]" },
        { name: "values",  type: "uint256[]" },
        { name: "datas",   type: "bytes[]" },
      ],
    }],
    functionName: "executeBatch",
    args: [targets, values, datas],
  });
}

// ─── Build ────────────────────────────────────────────────────────────────────
/**
 * Build an unsigned PackedUserOperation.
 * The `signature` field is set to `0x` — fill it before submitting.
 */
export async function buildUserOp(opts: UserOpBuildOptions): Promise<PackedUserOperation> {
  const { sender, target, callData, accountCallData: providedAccountCallData, value = 0n, initCode = "0x", usePaymaster = !!PAYMASTER_ADDRESS, publicClient } = opts;

  // Fetch current nonce from EntryPoint
  const nonce = await publicClient.readContract({
    address: ENTRY_POINT_V07,
    abi: ENTRY_POINT_ABI,
    functionName: "getNonce",
    args: [sender, 0n],
  });

  // Fetch current UserOp gas prices before signing. Some Arbitrum RPCs return
  // maxPriorityFeePerGas=0, but Pimlico requires a non-zero bundler priority fee.
  const relayGasFees = await fetchRelayUserOperationGasPrice();
  const localFeeData = relayGasFees ? null : await publicClient.estimateFeesPerGas();
  const { maxFeePerGas, maxPriorityFeePerGas } = relayGasFees ?? normalizeGasFees(
    localFeeData?.maxFeePerGas,
    localFeeData?.maxPriorityFeePerGas,
  );

  // Build account callData. Most callers use execute(target,value,data), while
  // public batch sends pass a pre-encoded executeBatch(...) payload.
  const accountCallData = providedAccountCallData ?? (() => {
    if (!target || !callData) throw new Error("target and callData are required when accountCallData is not provided");
    return encodeExecuteCall(target, value, callData);
  })();

  let verificationGasLimit = VERIFICATION_GAS;
  let callGasLimit = CALL_GAS;
  let preVerificationGas = PRE_VERIFICATION;
  let paymasterVerificationGas = PAYMASTER_VERIFICATION_GAS;
  let paymasterPostOpGas = PAYMASTER_POST_OP;

  const gasFees = pack128(maxPriorityFeePerGas, maxFeePerGas);
  let accountGasLimits = pack128(verificationGasLimit, callGasLimit);
  let paymasterAndData = buildPaymasterAndData(usePaymaster, paymasterVerificationGas, paymasterPostOpGas);

  const gasEstimate = await fetchRelayUserOperationGasEstimate({
    sender,
    nonce,
    initCode,
    callData: accountCallData,
    accountGasLimits,
    preVerificationGas,
    gasFees,
    paymasterAndData,
    signature: dummyWebAuthnSignature(),
  });

  if (gasEstimate) {
    verificationGasLimit = maxGas(VERIFICATION_GAS, parseOptionalBigInt(gasEstimate.verificationGasLimit));
    callGasLimit = maxGas(CALL_GAS, parseOptionalBigInt(gasEstimate.callGasLimit));
    preVerificationGas = maxGas(PRE_VERIFICATION, parseOptionalBigInt(gasEstimate.preVerificationGas));
    paymasterVerificationGas = maxGas(
      PAYMASTER_VERIFICATION_GAS,
      parseOptionalBigInt(gasEstimate.paymasterVerificationGasLimit),
    );
    paymasterPostOpGas = maxGas(PAYMASTER_POST_OP, parseOptionalBigInt(gasEstimate.paymasterPostOpGasLimit));
    accountGasLimits = pack128(verificationGasLimit, callGasLimit);
    paymasterAndData = buildPaymasterAndData(usePaymaster, paymasterVerificationGas, paymasterPostOpGas);
  }

  return {
    sender,
    nonce,
    initCode,
    callData: accountCallData,
    accountGasLimits,
    preVerificationGas,
    gasFees,
    paymasterAndData,
    signature: "0x",
  };
}

// ─── Submit ───────────────────────────────────────────────────────────────────
/**
 * Submit a fully-signed PackedUserOperation to the Obscura relay.
 * Returns the userOpHash returned by the bundler.
 */
export async function submitUserOp(op: PackedUserOperation): Promise<RelayResult> {
  const body = {
    userOp: {
      ...serializeUserOp(op),
    },
  };

  const response = await fetch(`${RELAY_URL}/relay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Relay error ${response.status}: ${text.slice(0, 300)}`);
  }

  const json = await response.json() as { userOpHash?: Hex; error?: string };
  if (json.error) throw new Error(`Relay: ${json.error}`);
  if (!json.userOpHash) throw new Error("Relay returned no userOpHash");

  const receipt = await waitForRelayUserOperationReceipt(json.userOpHash);
  if (receipt.success !== true) {
    throw new Error(formatUserOperationFailure(receipt));
  }

  return {
    userOpHash: json.userOpHash,
    transactionHash: receipt.receipt?.transactionHash,
  };
}
