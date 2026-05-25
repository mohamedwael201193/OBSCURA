/**
 * userop.ts — PackedUserOperation (ERC-4337 v0.7) builder + relay submitter
 *
 * Key rules:
 *   • accountGasLimits = verificationGasLimit(128) | callGasLimit(128)  — packed as bytes32
 *   • gasFees          = maxPriorityFeePerGas(128) | maxFeePerGas(128)  — packed as bytes32
 *   • preVerificationGas is a flat overhead estimate (not packed)
 *   • paymasterAndData = paymasterAddress + 20-byte postOpGasLimit + 20-byte verificationGasLimit
 *   • Nonce is fetched from the EntryPoint (not the account itself)
 */

import { encodeAbiParameters, parseAbiParameters, encodeFunctionData, concat, pad, toHex } from "viem";
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
  target: Address;
  /** Encoded call data for the target */
  callData: Hex;
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
}

// ─── Gas constants (conservative for Arbitrum Sepolia) ───────────────────────
const VERIFICATION_GAS  = 200_000n;
const CALL_GAS          = 500_000n;
const PRE_VERIFICATION  = 50_000n;
const PAYMASTER_POST_OP = 100_000n;   // postOpGasLimit in paymasterAndData

// ─── Helpers ──────────────────────────────────────────────────────────────────
/** Pack two 128-bit values into a bytes32 (big-endian) */
function pack128(high: bigint, low: bigint): Hex {
  const h = BigInt.asUintN(128, high);
  const l = BigInt.asUintN(128, low);
  return toHex((h << 128n) | l, { size: 32 });
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
  const { sender, target, callData, value = 0n, initCode = "0x", usePaymaster = !!PAYMASTER_ADDRESS, publicClient } = opts;

  // Fetch current nonce from EntryPoint
  const nonce = await publicClient.readContract({
    address: ENTRY_POINT_V07,
    abi: ENTRY_POINT_ABI,
    functionName: "getNonce",
    args: [sender, 0n],
  });

  // Fetch current gas prices
  const feeData = await publicClient.estimateFeesPerGas();
  const maxFeePerGas         = feeData.maxFeePerGas         ?? 1_000_000_000n;
  const maxPriorityFeePerGas = feeData.maxPriorityFeePerGas ?? 100_000_000n;

  // accountGasLimits = verificationGasLimit(128) | callGasLimit(128)
  const accountGasLimits = pack128(VERIFICATION_GAS, CALL_GAS);

  // gasFees = maxPriorityFeePerGas(128) | maxFeePerGas(128)
  const gasFees = pack128(maxPriorityFeePerGas, maxFeePerGas);

  // Build account callData (wrap in execute)
  const accountCallData = encodeExecuteCall(target, value, callData);

  // paymasterAndData: paymasterAddr(20) + postOpGasLimit(16) + verificationGasLimit(16)
  let paymasterAndData: Hex = "0x";
  if (usePaymaster && PAYMASTER_ADDRESS) {
    const postOpGasBytes      = pad(toHex(PAYMASTER_POST_OP), { size: 16 });
    const verificationGasBytes = pad(toHex(VERIFICATION_GAS),  { size: 16 });
    paymasterAndData = concat([PAYMASTER_ADDRESS, postOpGasBytes, verificationGasBytes]);
  }

  return {
    sender,
    nonce,
    initCode,
    callData: accountCallData,
    accountGasLimits,
    preVerificationGas: PRE_VERIFICATION,
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
      sender:             op.sender,
      nonce:              toHex(op.nonce),
      initCode:           op.initCode,
      callData:           op.callData,
      accountGasLimits:   op.accountGasLimits,
      preVerificationGas: toHex(op.preVerificationGas),
      gasFees:            op.gasFees,
      paymasterAndData:   op.paymasterAndData,
      signature:          op.signature,
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

  return { userOpHash: json.userOpHash };
}
