import { useCallback, useState, useEffect } from "react";
import {
  useAccount,
  usePublicClient,
  useWalletClient,
  useWriteContract,
} from "wagmi";
import { arbitrumSepolia } from "viem/chains";
import { encodeAbiParameters } from "viem";
import {
  REINEIRA_COVERAGE_MANAGER_ABI,
  REINEIRA_COVERAGE_MANAGER_ADDRESS,
  REINEIRA_INSURANCE_POOL_ADDRESS,
  REINEIRA_CUSDC_ABI,
  REINEIRA_CUSDC_ADDRESS,
  OBSCURA_PAYROLL_UNDERWRITER_ADDRESS,
} from "@/config/pay";
import { initFHEClient, encryptAddressAndAmount } from "@/lib/fhe";
import { estimateCappedFees } from "@/lib/gas";
import { getJSON, setJSON, migrateGlobalKey } from "@/lib/scopedStorage";

// ── wallet-scoped policies ───────────────────────────────────────────────
const POLICIES_KEY = "obscura_insurance_policies";

export interface SavedPolicy {
  coverageId: string;
  streamId: string;
  escrowId: string;
  coverageAmount: string;
  coverageDays: number;
  txHash: string;
  createdAt: number;
}

function loadPolicies(addr: `0x${string}` | undefined): SavedPolicy[] {
  return getJSON<SavedPolicy[]>(POLICIES_KEY, addr, []);
}

function savePolicy(addr: `0x${string}` | undefined, p: SavedPolicy) {
  const all = loadPolicies(addr);
  all.push(p);
  setJSON(POLICIES_KEY, addr, all);
}

export type PurchaseStep =
  | "idle"
  | "encrypting"
  | "authorizing"
  | "purchasing"
  | "done";

/**
 * useInsurePayroll — buy a confidential coverage policy backed by the
 * ObscuraPayrollUnderwriter for a specific stream.
 */
export function useInsurePayroll() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { writeContractAsync } = useWriteContract();
  const [isPending, setIsPending] = useState(false);
  const [step, setStep] = useState<PurchaseStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [policies, setPolicies] = useState<SavedPolicy[]>(() => loadPolicies(undefined));
  const [lastCoverageId, setLastCoverageId] = useState<string | null>(null);

  // Sync policies from localStorage on address change (with one-time migration)
  useEffect(() => {
    if (address) migrateGlobalKey(POLICIES_KEY, address);
    setPolicies(loadPolicies(address));
  }, [address]);

  const purchase = useCallback(
    async (params: {
      escrowId: bigint;
      streamId: bigint;
      expectedCycles: number;
      coverageAmount: bigint;
      coverageDays: number;
    }) => {
      if (
        !publicClient ||
        !walletClient ||
        !address ||
        !REINEIRA_COVERAGE_MANAGER_ADDRESS ||
        !REINEIRA_CUSDC_ADDRESS ||
        !OBSCURA_PAYROLL_UNDERWRITER_ADDRESS
      ) {
        throw new Error("Wallet or contracts not configured");
      }
      if (!REINEIRA_INSURANCE_POOL_ADDRESS) {
        throw new Error(
          "Insurance pool not yet created — operator must run setupReineiraPool.ts first"
        );
      }
      setIsPending(true);
      setError(null);
      setStep("encrypting");
      try {
        // 1. Encrypt inputs (address + amount)
        await initFHEClient(publicClient, walletClient);
        const enc = await encryptAddressAndAmount(
          address,
          params.coverageAmount
        );

        const policyData = encodeAbiParameters(
          [
            { name: "streamId", type: "uint256" },
            { name: "expectedCycles", type: "uint64" },
          ],
          [params.streamId, BigInt(params.expectedCycles)]
        );
        const riskProof = encodeAbiParameters(
          [{ name: "streamId", type: "uint256" }],
          [params.streamId]
        );

        // 2. Authorize CoverageManager as cUSDC operator (30 days) — skip if already approved
        setStep("authorizing");

        let needsOperator = true;
        try {
          const isOp = await publicClient.readContract({
            address: REINEIRA_CUSDC_ADDRESS,
            abi: REINEIRA_CUSDC_ABI,
            functionName: "isOperator",
            args: [address, REINEIRA_COVERAGE_MANAGER_ADDRESS],
          });
          needsOperator = !(isOp as boolean);
        } catch { /* default to needing approval */ }

        if (needsOperator) {
          const fees1 = await estimateCappedFees(publicClient);
          const untilTs = BigInt(
            Math.floor(Date.now() / 1000) + 30 * 86400
          );

          const authTx = await writeContractAsync({
            address: REINEIRA_CUSDC_ADDRESS,
            abi: REINEIRA_CUSDC_ABI,
            functionName: "setOperator",
            args: [REINEIRA_COVERAGE_MANAGER_ADDRESS, untilTs],
            account: address,
            chain: arbitrumSepolia,
            maxFeePerGas: fees1.maxFeePerGas,
            maxPriorityFeePerGas: fees1.maxPriorityFeePerGas,
            gas: 100_000n,
          });
          await publicClient.waitForTransactionReceipt({ hash: authTx });

          // Short delay to avoid RPC rate-limit
          await new Promise((r) => setTimeout(r, 2000));
        }

        // 3. Purchase coverage
        setStep("purchasing");
        const fees2 = await estimateCappedFees(publicClient);

        const coverageExpiry = BigInt(
          Math.floor(Date.now() / 1000) +
            Math.floor(params.coverageDays * 86_400)
        );

        const hash = await writeContractAsync({
          address: REINEIRA_COVERAGE_MANAGER_ADDRESS,
          abi: REINEIRA_COVERAGE_MANAGER_ABI,
          functionName: "purchaseCoverage",
          args: [
            enc[0], // encryptedHolder
            REINEIRA_INSURANCE_POOL_ADDRESS as `0x${string}`,
            OBSCURA_PAYROLL_UNDERWRITER_ADDRESS, // policy
            params.escrowId, // escrowId
            enc[1], // encryptedCoverageAmount
            coverageExpiry,
            policyData,
            riskProof,
          ],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees2.maxFeePerGas,
          maxPriorityFeePerGas: fees2.maxPriorityFeePerGas,
          gas: 3_000_000n,
        });
        const receipt = await publicClient.waitForTransactionReceipt({
          hash,
        });

        // Try to extract coverageId from logs (first uint256 topic after event sig)
        let coverageId = "unknown";
        try {
          // Look for any log with a uint256 in topics (coverage ID is typically indexed)
          for (const log of receipt.logs) {
            if (
              log.address.toLowerCase() ===
              REINEIRA_COVERAGE_MANAGER_ADDRESS.toLowerCase()
            ) {
              // Coverage ID is likely in topics[1] or data
              if (log.topics.length > 1) {
                coverageId = BigInt(log.topics[1]).toString();
                break;
              }
              if (log.data && log.data.length >= 66) {
                coverageId = BigInt(
                  "0x" + log.data.slice(2, 66)
                ).toString();
                break;
              }
            }
          }
        } catch {
          // Fall back to tx-hash-based ID
        }

        // Save policy to localStorage
        const policy: SavedPolicy = {
          coverageId,
          streamId: params.streamId.toString(),
          escrowId: params.escrowId.toString(),
          coverageAmount: (
            Number(params.coverageAmount) / 1_000_000
          ).toFixed(2),
          coverageDays: params.coverageDays,
          txHash: hash,
          createdAt: Date.now(),
        };
        savePolicy(address, policy);
        setPolicies(loadPolicies(address));
        setLastCoverageId(coverageId);
        setStep("done");
        return { hash, coverageId };
      } catch (e) {
        setError((e as Error).message);
        setStep("idle");
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, walletClient, address, writeContractAsync]
  );

  const dispute = useCallback(
    async (coverageId: bigint, missedCycle: bigint) => {
      if (!publicClient || !address || !REINEIRA_COVERAGE_MANAGER_ADDRESS) {
        throw new Error("Wallet not configured");
      }
      setIsPending(true);
      setError(null);
      try {
        const disputeProof = encodeAbiParameters(
          [{ name: "missedCycle", type: "uint256" }],
          [missedCycle]
        );
        const fees = await estimateCappedFees(publicClient);
        const hash = await writeContractAsync({
          address: REINEIRA_COVERAGE_MANAGER_ADDRESS,
          abi: REINEIRA_COVERAGE_MANAGER_ABI,
          functionName: "dispute",
          args: [coverageId, disputeProof],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas: fees.maxFeePerGas,
          maxPriorityFeePerGas: fees.maxPriorityFeePerGas,
          gas: 1_500_000n,
        });
        await publicClient.waitForTransactionReceipt({ hash });
        return hash;
      } catch (e) {
        setError((e as Error).message);
        throw e;
      } finally {
        setIsPending(false);
      }
    },
    [publicClient, address, writeContractAsync]
  );

  const resetStep = useCallback(() => {
    setStep("idle");
    setLastCoverageId(null);
  }, []);

  return {
    purchase,
    dispute,
    isPending,
    step,
    error,
    policies,
    lastCoverageId,
    resetStep,
  };
}
