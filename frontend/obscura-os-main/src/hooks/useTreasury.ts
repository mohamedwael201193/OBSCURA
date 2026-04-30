import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount, usePublicClient, useWalletClient } from "wagmi";
import { parseEther } from "viem";
import { arbitrumSepolia } from "viem/chains";
import { useState } from "react";
import { OBSCURA_TREASURY_ADDRESS, OBSCURA_TREASURY_ABI } from "@/config/contracts";
import { initFHEClient, encryptAmount } from "@/lib/fhe";
import { FHEStepStatus } from "@/lib/constants";

// ─── Read Hooks ────────────────────────────────────────────────────────────

export function useTreasuryBalance() {
  return useReadContract({
    address: OBSCURA_TREASURY_ADDRESS,
    abi: OBSCURA_TREASURY_ABI,
    functionName: "treasuryBalance",
    query: { refetchInterval: 10_000 },
  });
}

export function useSpendRequest(proposalId: bigint | undefined) {
  return useReadContract({
    address: OBSCURA_TREASURY_ADDRESS,
    abi: OBSCURA_TREASURY_ABI,
    functionName: "getSpendRequest",
    args: proposalId !== undefined ? [proposalId] : undefined,
    query: { enabled: proposalId !== undefined, refetchInterval: 8_000 },
  });
}

export function useTimelockDuration() {
  return useReadContract({
    address: OBSCURA_TREASURY_ADDRESS,
    abi: OBSCURA_TREASURY_ABI,
    functionName: "timelockDuration",
    query: { refetchInterval: 15_000 },
  });
}

export function useSetTimelockDuration() {
  const { address } = useAccount();
  const { writeContractAsync, isPending } = useWriteContract();
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>();
  const receipt = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState<string | null>(null);

  const setDuration = async (seconds: number) => {
    setError(null);
    if (!address) { setError("Wallet not connected"); return; }
    try {
      const hash = await writeContractAsync({
        address: OBSCURA_TREASURY_ADDRESS,
        abi: OBSCURA_TREASURY_ABI,
        functionName: "setTimelockDuration",
        args: [BigInt(seconds)],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: 200_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      });
      setTxHash(hash);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  return { setDuration, isPending, txHash, receipt, error };
}

// ─── Write Hook: Attach Spend ──────────────────────────────────────────────

export interface UseAttachSpendReturn {
  proposalIdInput: string;
  setProposalIdInput: (v: string) => void;
  recipientInput: string;
  setRecipientInput: (v: string) => void;
  ethAmountInput: string;
  setEthAmountInput: (v: string) => void;
  isPending: boolean;
  isConfirming: boolean;
  isSuccess: boolean;
  txHash: `0x${string}` | undefined;
  error: string | null;
  handleAttach: () => Promise<void>;
  status: FHEStepStatus;
  stepIndex: number;
}

export function useAttachSpend(): UseAttachSpendReturn {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();

  const [proposalIdInput, setProposalIdInput] = useState("");
  const [recipientInput, setRecipientInput] = useState("");
  const [ethAmountInput, setEthAmountInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<FHEStepStatus>(FHEStepStatus.IDLE);
  const [stepIndex, setStepIndex] = useState(0);

  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleAttach = async () => {
    setError(null);
    if (!address || !publicClient || !walletClient) { setError("Connect wallet first"); return; }
    if (!proposalIdInput || !recipientInput || !ethAmountInput) { setError("Fill all fields"); return; }

    try {
      setStatus(FHEStepStatus.ENCRYPTING);
      setStepIndex(0);
      const amountGwei = BigInt(Math.round(parseFloat(ethAmountInput) * 1e9));
      await initFHEClient(publicClient, walletClient);
      const encrypted = await encryptAmount(amountGwei);
      const encInput = encrypted[0];

      setStatus(FHEStepStatus.SENDING);
      setStepIndex(1);
      await writeContractAsync({
        address: OBSCURA_TREASURY_ADDRESS,
        abi: OBSCURA_TREASURY_ABI,
        functionName: "attachSpend",
        args: [BigInt(proposalIdInput), recipientInput as `0x${string}`, amountGwei, encInput],
        account: address,
        chain: arbitrumSepolia,
        gas: 600_000n,
        maxFeePerGas: 200_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      });
      setStatus(FHEStepStatus.READY);
      setStepIndex(2);
    } catch (e: unknown) {
      setStatus(FHEStepStatus.ERROR);
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 150));
    }
  };

  return {
    proposalIdInput, setProposalIdInput,
    recipientInput, setRecipientInput,
    ethAmountInput, setEthAmountInput,
    isPending, isConfirming, isSuccess, txHash, error,
    handleAttach, status, stepIndex,
  };
}

// ─── Write Hook: Record Finalization ──────────────────────────────────────

export function useRecordFinalization() {
  const { address } = useAccount();
  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState<string | null>(null);

  const record = async (proposalId: bigint) => {
    setError(null);
    try {
      await writeContractAsync({
        address: OBSCURA_TREASURY_ADDRESS,
        abi: OBSCURA_TREASURY_ABI,
        functionName: "recordFinalization",
        args: [proposalId],
        account: address,
        chain: arbitrumSepolia,
        gas: 300_000n,
        maxFeePerGas: 200_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 150));
    }
  };

  return { record, isPending, isConfirming, isSuccess, txHash, error };
}

// ─── Write Hook: Execute Spend ─────────────────────────────────────────────

export function useExecuteSpend() {
  const { address } = useAccount();
  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState<string | null>(null);

  const execute = async (proposalId: bigint) => {
    setError(null);
    try {
      await writeContractAsync({
        address: OBSCURA_TREASURY_ADDRESS,
        abi: OBSCURA_TREASURY_ABI,
        functionName: "executeSpend",
        args: [proposalId],
        account: address,
        chain: arbitrumSepolia,
        gas: 500_000n,
        maxFeePerGas: 200_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 150));
    }
  };

  return { execute, isPending, isConfirming, isSuccess, txHash, error };
}

// ─── Deposit Hook ──────────────────────────────────────────────────────────

export function useDepositTreasury() {
  const { address } = useAccount();
  const { writeContractAsync, isPending, data: txHash } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });
  const [error, setError] = useState<string | null>(null);

  const deposit = async (ethAmount: string) => {
    setError(null);
    try {
      await writeContractAsync({
        address: OBSCURA_TREASURY_ADDRESS,
        abi: OBSCURA_TREASURY_ABI,
        functionName: "deposit",
        value: parseEther(ethAmount),
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas: 200_000_000n,
        maxPriorityFeePerGas: 1_000_000n,
      });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(msg.slice(0, 150));
    }
  };

  return { deposit, isPending, isConfirming, isSuccess, txHash, error };
}
