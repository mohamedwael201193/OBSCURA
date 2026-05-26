/**
 * useSmartAccount.ts — ERC-4337 v0.7 smart account hook
 *
 * State machine: idle → deploying → deployed → signing → submitting → confirmed → idle (auto 4s)
 *
 * Usage:
 *   const { accountAddress, status, deploy, sendUserOp } = useSmartAccount();
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { useAccount, usePublicClient } from "wagmi";
import { useWalletClient } from "wagmi";
import { keccak256, encodeAbiParameters, parseAbiParameters, toHex, concat, pad, type Hex, type Address } from "viem";
import { arbitrumSepolia } from "viem/chains";
import {
  SMART_ACCOUNT_FACTORY_ADDRESS,
  SMART_ACCOUNT_FACTORY_ABI,
  ENTRY_POINT_V07,
  ENTRY_POINT_ABI,
} from "@/config/smartAccount";
import { getPasskey, signWithPasskey, registerPasskey } from "@/lib/passkey";
import { buildUserOp, submitUserOp, encodeExecuteBatchCall, type PackedUserOperation } from "@/lib/userop";

// ─── State ────────────────────────────────────────────────────────────────────
export type SmartAccountStatus =
  | "idle"
  | "deploying"
  | "deployed"
  | "signing"
  | "submitting"
  | "confirmed"
  | "error";

export interface SmartAccountState {
  /** Predicted smart account address (available before deployment) */
  accountAddress: Address | null;
  /** Whether the smart account contract is already deployed on-chain */
  isDeployed: boolean;
  /** Whether the user has a passkey registered */
  hasPasskey: boolean;
  /** Current operation status */
  status: SmartAccountStatus;
  /** Error message if status === "error" */
  error: string | null;
  /** Last confirmed userOpHash */
  lastUserOpHash: Hex | null;
}

export interface UseSmartAccountReturn extends SmartAccountState {
  /** Register a passkey and deploy the smart account contract */
  deploy: () => Promise<Address>;
  /** Send a UserOp using the passkey signature */
  sendUserOp: (target: Address, callData: Hex, value?: bigint) => Promise<Hex>;
  /** Send a batched UserOp using executeBatch on the smart account */
  sendBatchUserOp: (calls: SmartAccountCall[]) => Promise<Hex>;
  /** Reset to idle after error or confirmation */
  reset: () => void;
}

export interface SmartAccountCall {
  target: Address;
  callData: Hex;
  value?: bigint;
}

const INITIAL_STATE: SmartAccountState = {
  accountAddress: null,
  isDeployed: false,
  hasPasskey: false,
  status: "idle",
  error: null,
  lastUserOpHash: null,
};

const DEFAULT_SALT = 0n;
const SMART_ACCOUNT_REFRESH_EVENT = "obscura:smartAccountRefresh";

function notifySmartAccountRefresh() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(SMART_ACCOUNT_REFRESH_EVENT));
  }
}

// ─── UserOp Hash (ERC-4337 v0.7) ─────────────────────────────────────────────
function packUserOpHash(op: PackedUserOperation, chainId: bigint, entryPoint: Address): Hex {
  const innerHash = keccak256(
    encodeAbiParameters(
      parseAbiParameters(
        "address sender, uint256 nonce, bytes32 initCodeHash, bytes32 callDataHash, bytes32 accountGasLimits, uint256 preVerificationGas, bytes32 gasFees, bytes32 paymasterAndDataHash"
      ),
      [
        op.sender,
        op.nonce,
        keccak256(op.initCode),
        keccak256(op.callData),
        op.accountGasLimits as Hex,
        op.preVerificationGas,
        op.gasFees as Hex,
        keccak256(op.paymasterAndData),
      ]
    )
  );
  return keccak256(
    encodeAbiParameters(
      parseAbiParameters("bytes32 innerHash, address entryPoint, uint256 chainId"),
      [innerHash, entryPoint, chainId]
    )
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
export function useSmartAccount(): UseSmartAccountReturn {
  const { address: eoaAddress } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [state, setState] = useState<SmartAccountState>(INITIAL_STATE);
  const [refreshNonce, setRefreshNonce] = useState(0);
  const autoResetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function setPartial(partial: Partial<SmartAccountState>) {
    setState((prev) => ({ ...prev, ...partial }));
  }

  useEffect(() => {
    if (typeof window === "undefined") return;
    const refresh = () => setRefreshNonce((value) => value + 1);
    window.addEventListener(SMART_ACCOUNT_REFRESH_EVENT, refresh);
    return () => window.removeEventListener(SMART_ACCOUNT_REFRESH_EVENT, refresh);
  }, []);

  // ─── Check passkey + predicted address on connect ──────────────────────────
  useEffect(() => {
    if (!eoaAddress || !publicClient || !SMART_ACCOUNT_FACTORY_ADDRESS) return;

    let cancelled = false;
    (async () => {
      try {
        const passkey = await getPasskey(eoaAddress);

        let accountAddress: Address | null = null;
        let isDeployed = false;

        if (passkey) {
          // Predict address via factory view (passkey mode)
          accountAddress = await publicClient.readContract({
            address: SMART_ACCOUNT_FACTORY_ADDRESS,
            abi: SMART_ACCOUNT_FACTORY_ABI,
            functionName: "getAccountAddress",
            args: [eoaAddress, passkey.publicKeyX, passkey.publicKeyY, DEFAULT_SALT],
          }) as Address;
        } else {
          // EOA-owned account: predict with passkeyX=0, passkeyY=0
          accountAddress = await publicClient.readContract({
            address: SMART_ACCOUNT_FACTORY_ADDRESS,
            abi: SMART_ACCOUNT_FACTORY_ABI,
            functionName: "getAccountAddress",
            args: [eoaAddress, 0n, 0n, DEFAULT_SALT],
          }) as Address;
        }

        const code = await publicClient.getBytecode({ address: accountAddress });
        isDeployed = !!code && code !== "0x";

        if (!cancelled) {
          setPartial({
            accountAddress,
            isDeployed,
            hasPasskey: !!passkey,
            status: "idle",
          });
        }
      } catch (e) {
        // Non-fatal — factory not configured in this env
      }
    })();

    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eoaAddress, publicClient, refreshNonce]);

  // Auto-reset confirmed state after 4s
  useEffect(() => {
    if (state.status === "confirmed") {
      autoResetRef.current = setTimeout(() => {
        setPartial({ status: "idle", lastUserOpHash: null });
      }, 4_000);
    }
    return () => {
      if (autoResetRef.current) clearTimeout(autoResetRef.current);
    };
  }, [state.status]);

  const resolvePasskeyAccount = useCallback(async (): Promise<{ accountAddress: Address; isDeployed: boolean }> => {
    if (!eoaAddress || !publicClient) throw new Error("Wallet not connected");

    const passkey = await getPasskey(eoaAddress);
    if (!passkey) throw new Error("Passkey not enrolled for this wallet");

    const accountAddress = await publicClient.readContract({
      address: SMART_ACCOUNT_FACTORY_ADDRESS,
      abi: SMART_ACCOUNT_FACTORY_ABI,
      functionName: "getAccountAddress",
      args: [eoaAddress, passkey.publicKeyX, passkey.publicKeyY, DEFAULT_SALT],
    }) as Address;

    const code = await publicClient.getBytecode({ address: accountAddress });
    const isDeployed = !!code && code !== "0x";

    setPartial({ accountAddress, isDeployed, hasPasskey: true });
    return { accountAddress, isDeployed };
  }, [eoaAddress, publicClient]);

  // ─── deploy ───────────────────────────────────────────────────────────────
  const deploy = useCallback(async (): Promise<Address> => {
    if (!eoaAddress || !publicClient || !walletClient) {
      throw new Error("Wallet not connected");
    }
    if (!SMART_ACCOUNT_FACTORY_ADDRESS) {
      throw new Error("VITE_SMART_ACCOUNT_FACTORY_ADDRESS not configured");
    }

    setPartial({ status: "deploying", error: null });
    try {
      // Reuse the stored passkey when deploying against a new factory; otherwise enroll one.
      const passkey = await getPasskey(eoaAddress) ?? await registerPasskey(eoaAddress);

      // Predict account address
      const accountAddress = await publicClient.readContract({
        address: SMART_ACCOUNT_FACTORY_ADDRESS,
        abi: SMART_ACCOUNT_FACTORY_ABI,
        functionName: "getAccountAddress",
        args: [eoaAddress, passkey.publicKeyX, passkey.publicKeyY, DEFAULT_SALT],
      }) as Address;

      setPartial({ accountAddress, hasPasskey: true });

      // Check if already deployed (idempotent)
      const code = await publicClient.getBytecode({ address: accountAddress });
      if (code && code !== "0x") {
        setPartial({ isDeployed: true, status: "deployed" });
        return accountAddress;
      }

      // Deploy via factory (EOA pays gas for deployment)
      // Fetch current fee estimate and add 50% buffer so we always beat the base fee
      const fees = await publicClient.estimateFeesPerGas();
      const maxFeePerGas        = (fees.maxFeePerGas        ?? 30_000_000n) * 3n / 2n;
      const maxPriorityFeePerGas = (fees.maxPriorityFeePerGas ?? 1_000_000n) * 3n / 2n;

      const hash = await walletClient.writeContract({
        address: SMART_ACCOUNT_FACTORY_ADDRESS,
        abi: SMART_ACCOUNT_FACTORY_ABI,
        functionName: "createAccount",
        args: [eoaAddress, passkey.publicKeyX, passkey.publicKeyY, DEFAULT_SALT],
        chain: arbitrumSepolia,
        maxFeePerGas,
        maxPriorityFeePerGas,
      });

      await publicClient.waitForTransactionReceipt({ hash });

      setPartial({ isDeployed: true, status: "deployed" });
      notifySmartAccountRefresh();
      return accountAddress;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setPartial({ status: "error", error: msg });
      throw e;
    }
  }, [eoaAddress, publicClient, walletClient]);

  // ─── sendUserOp ──────────────────────────────────────────────────────────
  const signAndSubmit = useCallback(
    async (op: PackedUserOperation): Promise<Hex> => {
      if (!eoaAddress) throw new Error("Wallet not connected");

      const userOpHash = packUserOpHash(op, BigInt(arbitrumSepolia.id), ENTRY_POINT_V07);
      const sig = await signWithPasskey(eoaAddress, userOpHash);
      op.signature = sig;

      setPartial({ status: "submitting" });
      const result = await submitUserOp(op);
      setPartial({ status: "confirmed", lastUserOpHash: result.userOpHash });
      return result.transactionHash ?? result.userOpHash;
    },
    [eoaAddress],
  );

  const ensureReadySender = useCallback(async (): Promise<Address> => {
    let sender = state.accountAddress;
    let isDeployed = state.isDeployed;

    if (!sender || !isDeployed) {
      const resolved = await resolvePasskeyAccount();
      sender = resolved.accountAddress;
      isDeployed = resolved.isDeployed;
    }

    if (!isDeployed) throw new Error("Smart account not deployed yet");
    return sender;
  }, [state.accountAddress, state.isDeployed, resolvePasskeyAccount]);

  const sendUserOp = useCallback(
    async (target: Address, callData: Hex, value: bigint = 0n): Promise<Hex> => {
      if (!eoaAddress || !publicClient) throw new Error("Wallet not connected");

      setPartial({ status: "signing", error: null });
      try {
        const sender = await ensureReadySender();

        // Build unsigned UserOp
        const op = await buildUserOp({
          sender,
          target,
          callData,
          value,
          publicClient,
        });

        return await signAndSubmit(op);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setPartial({ status: "error", error: msg });
        throw e;
      }
    },
    [eoaAddress, publicClient, ensureReadySender, signAndSubmit],
  );

  const sendBatchUserOp = useCallback(
    async (calls: SmartAccountCall[]): Promise<Hex> => {
      if (!eoaAddress || !publicClient) throw new Error("Wallet not connected");
      if (calls.length === 0) throw new Error("Add at least one call");
      if (calls.length > 16) throw new Error("Smart account batch limit is 16 calls");

      setPartial({ status: "signing", error: null });
      try {
        const sender = await ensureReadySender();
        const accountCallData = encodeExecuteBatchCall(
          calls.map((call) => call.target),
          calls.map((call) => call.value ?? 0n),
          calls.map((call) => call.callData),
        );

        const op = await buildUserOp({
          sender,
          accountCallData,
          publicClient,
        });

        return await signAndSubmit(op);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        setPartial({ status: "error", error: msg });
        throw e;
      }
    },
    [eoaAddress, publicClient, ensureReadySender, signAndSubmit],
  );

  const reset = useCallback(() => {
    setPartial({ status: "idle", error: null, lastUserOpHash: null });
  }, []);

  return { ...state, deploy, sendUserOp, sendBatchUserOp, reset };
}
