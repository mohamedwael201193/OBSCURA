import { useCallback, useState } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { OBSCURA_PAY_ABI, OBSCURA_PAY_ADDRESS } from '@/config/contracts';

export interface PaymentRecord {
  from: string;
  to: string;
  timestamp: number;
}

export function usePaymentHistory() {
  const { address } = useAccount();
  const [records, setRecords] = useState<PaymentRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const { data: myPaymentCount, refetch: refetchCount } = useReadContract({
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
    functionName: 'getMyPaymentCount',
    account: address,
    query: { enabled: !!OBSCURA_PAY_ADDRESS && !!address },
  });

  const { data: totalPaymentCount } = useReadContract({
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
    functionName: 'getPaymentCount',
    query: { enabled: !!OBSCURA_PAY_ADDRESS },
  });

  const { refetch: fetchIndices } = useReadContract({
    address: OBSCURA_PAY_ADDRESS,
    abi: OBSCURA_PAY_ABI,
    functionName: 'getMyPaymentIndices',
    args: [BigInt(0), BigInt(50)],
    account: address,
    query: { enabled: false },
  });

  const loadHistory = useCallback(async () => {
    if (!OBSCURA_PAY_ADDRESS || !address) return;
    setIsLoading(true);
    try {
      await refetchCount();
      const indicesResult = await fetchIndices();
      const indices = (indicesResult.data as bigint[]) ?? [];

      // We can't use useReadContract in a loop, so we'll use the records we can fetch
      // For now, store the indices and timestamps will be fetched by the component
      setRecords(
        indices.map((idx) => ({
          from: '',
          to: '',
          timestamp: Number(idx),
        }))
      );
    } catch {
      // Silent fail — no payment history yet
    } finally {
      setIsLoading(false);
    }
  }, [address, refetchCount, fetchIndices]);

  return {
    records,
    myPaymentCount: myPaymentCount as bigint | undefined,
    totalPaymentCount: totalPaymentCount as bigint | undefined,
    isLoading,
    loadHistory,
  };
}
