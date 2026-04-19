import { useCallback, useState } from "react";
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
  OBSCURA_PAYROLL_UNDERWRITER_ADDRESS,
} from "@/config/wave2";
import { initFHEClient, encryptAddressAndAmount } from "@/lib/fhe";

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
  const [error, setError] = useState<string | null>(null);

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
        !OBSCURA_PAYROLL_UNDERWRITER_ADDRESS
      ) {
        throw new Error("Wallet or contracts not configured");
      }
      if (!REINEIRA_INSURANCE_POOL_ADDRESS) {
        throw new Error(
          "Insurance pool not yet created — operator must run scripts/setupReineiraPool.ts first"
        );
      }
      setIsPending(true);
      setError(null);
      try {
        await initFHEClient(publicClient, walletClient);
        const enc = await encryptAddressAndAmount(address, params.coverageAmount);

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

        const feeData = await publicClient.estimateFeesPerGas();
        const maxFeePerGas = feeData.maxFeePerGas
          ? (feeData.maxFeePerGas * 130n) / 100n
          : undefined;

        const hash = await writeContractAsync({
          address: REINEIRA_COVERAGE_MANAGER_ADDRESS,
          abi: REINEIRA_COVERAGE_MANAGER_ABI,
          functionName: "purchaseCoverage",
          args: [
            enc[0],                                // encryptedHolder
            REINEIRA_INSURANCE_POOL_ADDRESS,       // pool
            OBSCURA_PAYROLL_UNDERWRITER_ADDRESS,   // policy
            params.escrowId,                       // escrowId
            enc[1],                                // encryptedCoverageAmount
            BigInt(
              Math.floor(Date.now() / 1000) +
                Math.floor(params.coverageDays * 86_400)
            ),                                     // coverageExpiry
            policyData,                            // policyData
            riskProof,                             // riskProof
          ],
          account: address,
          chain: arbitrumSepolia,
          maxFeePerGas,
          gas: 3_000_000n,
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
    [publicClient, walletClient, address, writeContractAsync]
  );

  const dispute = useCallback(
    async (coverageId: bigint, missedCycle: bigint) => {
      if (!publicClient || !address || !REINEIRA_COVERAGE_MANAGER_ADDRESS) {
        throw new Error("Wallet not configured");
      }
      const disputeProof = encodeAbiParameters(
        [{ name: "missedCycle", type: "uint256" }],
        [missedCycle]
      );
      const feeData = await publicClient.estimateFeesPerGas();
      const maxFeePerGas = feeData.maxFeePerGas
        ? (feeData.maxFeePerGas * 130n) / 100n
        : undefined;
      const hash = await writeContractAsync({
        address: REINEIRA_COVERAGE_MANAGER_ADDRESS,
        abi: REINEIRA_COVERAGE_MANAGER_ABI,
        functionName: "dispute",
        args: [coverageId, disputeProof],
        account: address,
        chain: arbitrumSepolia,
        maxFeePerGas,
        gas: 1_500_000n,
      });
      await publicClient.waitForTransactionReceipt({ hash });
      return hash;
    },
    [publicClient, address, writeContractAsync]
  );

  return { purchase, dispute, isPending, error };
}
