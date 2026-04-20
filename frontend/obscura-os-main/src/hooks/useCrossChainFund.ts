import { useCallback, useState } from "react";
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
  | "claiming"
  | "done";

/** Fetch Sepolia tx receipt using a dedicated Sepolia publicClient (viem) */
const sepoliaClient = createPublicClient({
  chain: sepolia,
  transport: http("https://ethereum-sepolia-rpc.publicnode.com"),
});

async function pollAttestation(
  messageHash: `0x${string}`,
  onProgress: (tries: number) => void,
  maxTries = 120 // ~10 minutes at 5s intervals
): Promise<string> {
  for (let i = 0; i < maxTries; i++) {
    onProgress(i);
    const resp = await fetch(`${CIRCLE_ATTESTATION_API}/${messageHash}`);
    const data = await resp.json();
    if (data.status === "complete" && data.attestation) {
      return data.attestation as string;
    }
    await new Promise((r) => setTimeout(r, 5000));
  }
  throw new Error("Attestation timed out after ~10 minutes. Try claiming later.");
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

  const fund = useCallback(
    async (params: { amountUSDC: string }) => {
      if (!walletClient || !address) {
        throw new Error("Wallet not connected");
      }
      setIsPending(true);
      setError(null);
      setBurnTxHash(null);
      setAttestationProgress(0);
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

        // 5. Switch back to Arb Sepolia
        setStep("switching-back");
        try {
          await switchChainAsync({ chainId: arbitrumSepolia.id });
        } catch {
          // non-critical
        }

        // 6. Poll Circle attestation API
        setStep("waiting-attestation");
        const attestation = await pollAttestation(
          messageHash as `0x${string}`,
          (tries) => setAttestationProgress(tries)
        );

        // 7. Call receiveMessage on Arb Sepolia MessageTransmitter
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
  }, []);

  return { fund, isPending, step, burnTxHash, error, reset, attestationProgress };
}
