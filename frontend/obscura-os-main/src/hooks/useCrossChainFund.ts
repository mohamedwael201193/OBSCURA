import { useCallback, useEffect, useRef, useState } from "react";
import {
  useAccount,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { sepolia, arbitrumSepolia } from "viem/chains";
import {
  pad,
  parseUnits,
  decodeAbiParameters,
  keccak256,
  createPublicClient,
  http,
} from "viem";
import {
  CCTP_TOKEN_MESSENGER_SEPOLIA,
  CCTP_TOKEN_MESSENGER_ABI,
  USDC_SEPOLIA,
  ARBITRUM_SEPOLIA_DOMAIN,
  ERC20_APPROVE_ABI,
} from "@/config/wave2";

const USDC_DECIMALS = 6;

/** Arb Sepolia MessageTransmitter — receiveMessage mints USDC on destination */
const ARB_SEPOLIA_MESSAGE_TRANSMITTER =
  "0xaCF1ceeF35caAc005e15888dDb8A3515C41B4872" as const;

const MESSAGE_TRANSMITTER_ABI = [
  {
    type: "function",
    name: "receiveMessage",
    stateMutability: "nonpayable",
    inputs: [
      { name: "message", type: "bytes" },
      { name: "attestation", type: "bytes" },
    ],
    outputs: [{ name: "success", type: "bool" }],
  },
] as const;

const CIRCLE_ATTESTATION_API =
  "https://iris-api-sandbox.circle.com/attestations";

const MESSAGE_SENT_TOPIC = keccak256(
  new TextEncoder().encode("MessageSent(bytes)")
);

export type BridgeStep =
  | "idle"
  | "switching-to-sepolia"
  | "approve-pending"
  | "approve-confirming"
  | "burn-pending"
  | "burn-confirming"
  | "switching-back"
  | "waiting-attestation"
  | "ready-to-claim"
  | "claiming"
  | "done";

/* ---- localStorage persistence ---- */
const BRIDGE_STATE_KEY = "obscura_bridge_state";

interface PersistedBridge {
  messageBytes: string;   // hex
  messageHash: string;    // hex
  burnTxHash: string;
  amountUSDC: string;
  startedAt: number;      // epoch ms
  attestation?: string;   // set when Circle returns it
}

function saveBridgeState(state: PersistedBridge) {
  localStorage.setItem(BRIDGE_STATE_KEY, JSON.stringify(state));
}
function loadBridgeState(): PersistedBridge | null {
  try {
    const raw = localStorage.getItem(BRIDGE_STATE_KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as PersistedBridge;
    // Expire after 60 minutes
    if (Date.now() - s.startedAt > 60 * 60 * 1000) {
      localStorage.removeItem(BRIDGE_STATE_KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}
function clearBridgeState() {
  localStorage.removeItem(BRIDGE_STATE_KEY);
}

/** Fetch Sepolia tx receipt using a dedicated Sepolia publicClient (viem) */
const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

/**
 * Poll Circle attestation. Handles 404 (unknown hash) by giving up after
 * a few consecutive 404s instead of retrying forever.
 */
async function pollAttestation(
  messageHash: `0x${string}`,
  onProgress: (tries: number) => void,
  signal: AbortSignal,
  maxTries = 120 // ~10 minutes at 5s intervals
): Promise<string> {
  let consecutive404 = 0;
  for (let i = 0; i < maxTries; i++) {
    if (signal.aborted) throw new Error("Polling cancelled");
    onProgress(i);
    try {
      const resp = await fetch(`${CIRCLE_ATTESTATION_API}/${messageHash}`);
      if (resp.status === 404) {
        consecutive404++;
        if (consecutive404 >= 10) {
          throw new Error(
            "Circle does not recognize this message hash (404). The burn may not have gone through CCTP correctly."
          );
        }
      } else {
        consecutive404 = 0;
        const data = await resp.json();
        if (data.status === "complete" && data.attestation) {
          return data.attestation as string;
        }
      }
    } catch (e) {
      if ((e as Error).message?.includes("Circle does not recognize")) throw e;
      // network glitch, retry
    }
    await new Promise((r) => {
      const timer = setTimeout(r, 5000);
      signal.addEventListener("abort", () => { clearTimeout(timer); r(undefined); }, { once: true });
    });
  }
  throw new Error("Attestation timed out after ~10 minutes. You can return to this tab later — polling will resume.");
}

export function useCrossChainFund() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const { switchChainAsync } = useSwitchChain();
  const [isPending, setIsPending] = useState(false);
  const [step, setStep] = useState<BridgeStep>("idle");
  const [burnTxHash, setBurnTxHash] = useState<string | null>(null);
  const [attestationProgress, setAttestationProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [savedAmount, setSavedAmount] = useState<string>("");
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  // Track mounted state
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /**
   * Resume polling if a bridge was in progress (e.g. user switched tabs).
   * This effect ONLY polls — it does NOT call writeContractAsync (which would
   * be stale). When attestation arrives, it saves to state and shows a
   * "Claim" button the user clicks.
   */
  useEffect(() => {
    const persisted = loadBridgeState();
    if (!persisted || !address) return;

    // If attestation already found (saved in localStorage), go straight to ready-to-claim
    if (persisted.attestation) {
      setBurnTxHash(persisted.burnTxHash);
      setSavedAmount(persisted.amountUSDC);
      setStep("ready-to-claim");
      return;
    }

    // Restore visible state for polling
    setBurnTxHash(persisted.burnTxHash);
    setSavedAmount(persisted.amountUSDC);
    setStep("waiting-attestation");
    setIsPending(true);
    setError(null);

    const elapsed = Math.floor((Date.now() - persisted.startedAt) / 5000);
    setAttestationProgress(elapsed);

    const ac = new AbortController();
    abortRef.current = ac;

    (async () => {
      try {
        const attestation = await pollAttestation(
          persisted.messageHash as `0x${string}`,
          (tries) => {
            if (mountedRef.current) setAttestationProgress(elapsed + tries);
          },
          ac.signal
        );

        // Save attestation to localStorage so it persists across tabs
        saveBridgeState({ ...persisted, attestation });

        if (mountedRef.current) {
          setStep("ready-to-claim");
        }
      } catch (e) {
        if (!ac.signal.aborted && mountedRef.current) {
          setError((e as Error).message);
          setStep("idle");
        }
      } finally {
        if (mountedRef.current) setIsPending(false);
      }
    })();

    return () => { ac.abort(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  /** Claim USDC on Arb Sepolia — called by user clicking "Claim" button */
  const claim = useCallback(async () => {
    const persisted = loadBridgeState();
    if (!persisted?.attestation || !walletClient || !address) {
      throw new Error("No attestation available or wallet not connected");
    }
    setIsPending(true);
    setError(null);
    try {
      // Ensure on Arb Sepolia
      setStep("switching-back");
      try { await switchChainAsync({ chainId: arbitrumSepolia.id }); } catch { /* already there */ }

      setStep("claiming");
      await writeContractAsync({
        address: ARB_SEPOLIA_MESSAGE_TRANSMITTER,
        abi: MESSAGE_TRANSMITTER_ABI,
        functionName: "receiveMessage",
        args: [persisted.messageBytes as `0x${string}`, persisted.attestation as `0x${string}`],
        account: address,
        chain: arbitrumSepolia,
        gas: 400_000n,
      });

      clearBridgeState();
      setStep("done");
    } catch (e) {
      setError((e as Error).message);
      setStep("ready-to-claim"); // let user retry
      throw e;
    } finally {
      setIsPending(false);
    }
  }, [walletClient, address, switchChainAsync, writeContractAsync]);

  const fund = useCallback(
    async (params: { amountUSDC: string }) => {
      if (!walletClient || !address) {
        throw new Error("Wallet not connected");
      }
      setIsPending(true);
      setError(null);
      setBurnTxHash(null);
      setAttestationProgress(0);
      setSavedAmount(params.amountUSDC);

      const ac = new AbortController();
      abortRef.current = ac;

      try {
        // 1. Switch to Sepolia
        setStep("switching-to-sepolia");
        await switchChainAsync({ chainId: sepolia.id });

        const amount = parseUnits(params.amountUSDC, USDC_DECIMALS);

        // 2. Approve USDC
        setStep("approve-pending");
        const approveHash = await writeContractAsync({
          address: USDC_SEPOLIA,
          abi: ERC20_APPROVE_ABI,
          functionName: "approve",
          args: [CCTP_TOKEN_MESSENGER_SEPOLIA, amount],
          account: address,
          chain: sepolia,
        });
        setStep("approve-confirming");
        await sepoliaClient.waitForTransactionReceipt({ hash: approveHash });

        // 3. Burn USDC via CCTP
        setStep("burn-pending");
        const mintRecipient = pad(address, { size: 32 });
        const burnHash = await writeContractAsync({
          address: CCTP_TOKEN_MESSENGER_SEPOLIA,
          abi: CCTP_TOKEN_MESSENGER_ABI,
          functionName: "depositForBurn",
          args: [amount, ARBITRUM_SEPOLIA_DOMAIN, mintRecipient, USDC_SEPOLIA],
          account: address,
          chain: sepolia,
          gas: 300_000n,
        });
        setStep("burn-confirming");
        setBurnTxHash(burnHash);
        const burnReceipt = await sepoliaClient.waitForTransactionReceipt({
          hash: burnHash,
        });

        // 4. Extract messageBytes from logs
        const msgLog = burnReceipt.logs.find(
          (l) => l.topics[0] === MESSAGE_SENT_TOPIC
        );
        if (!msgLog) throw new Error("MessageSent event not found in burn tx");

        const [messageBytes] = decodeAbiParameters(
          [{ name: "message", type: "bytes" }],
          msgLog.data
        );
        const messageHash = keccak256(messageBytes);

        // 5. Persist bridge state so it survives tab switches
        saveBridgeState({
          messageBytes: messageBytes as string,
          messageHash,
          burnTxHash: burnHash,
          amountUSDC: params.amountUSDC,
          startedAt: Date.now(),
        });

        // 6. Switch back to Arb Sepolia
        setStep("switching-back");
        try {
          await switchChainAsync({ chainId: arbitrumSepolia.id });
        } catch {
          // non-critical
        }

        // 7. Poll Circle attestation API
        setStep("waiting-attestation");
        const attestation = await pollAttestation(
          messageHash as `0x${string}`,
          (tries) => setAttestationProgress(tries),
          ac.signal
        );

        // 8. Save attestation + auto-claim
        const updated = loadBridgeState();
        if (updated) saveBridgeState({ ...updated, attestation });

        setStep("claiming");
        await writeContractAsync({
          address: ARB_SEPOLIA_MESSAGE_TRANSMITTER,
          abi: MESSAGE_TRANSMITTER_ABI,
          functionName: "receiveMessage",
          args: [messageBytes, attestation as `0x${string}`],
          account: address,
          chain: arbitrumSepolia,
          gas: 400_000n,
        });

        clearBridgeState();
        setStep("done");
        return burnHash;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [walletClient, address, switchChainAsync, writeContractAsync, publicClient]
  );

  const reset = useCallback(() => {
    setStep("idle");
    setBurnTxHash(null);
    setError(null);
    setAttestationProgress(0);
    setSavedAmount("");
    clearBridgeState();
    if (abortRef.current) abortRef.current.abort();
  }, []);

  return { fund, claim, isPending, step, burnTxHash, error, reset, attestationProgress, savedAmount };
}
