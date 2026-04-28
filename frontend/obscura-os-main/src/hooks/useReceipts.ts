/**
 * useReceipts — local-only payment receipts ledger.
 *
 * Receipts live in `obscura.receipts.v1:<addr>` (wallet-scoped). Every
 * outgoing transaction (transfer, stream tick, escrow create, sweep, etc.)
 * calls `add()` so the user can later export proof-of-payment without
 * making the chain explorer leak which addresses they paid.
 */
import { useCallback, useEffect, useState } from "react";
import { useAccount } from "wagmi";
import { getJSON, setJSON } from "@/lib/scopedStorage";

const KEY = "obscura.receipts.v1";

export type ReceiptKind =
  | "transfer"
  | "stream-create"
  | "stream-tick"
  | "stream-cancel"
  | "escrow-create"
  | "escrow-fund"
  | "escrow-redeem"
  | "stealth-sweep"
  | "cross-chain-fund"
  | "insurance-buy"
  | "insurance-subscribe"
  | "contact-add"
  | "contact-remove"
  | "stealth-rotate";

export interface Receipt {
  id: string;            // crypto.randomUUID()
  kind: ReceiptKind;
  txHash: `0x${string}`;
  chainId: number;
  timestamp: number;     // unix-ms
  amount?: string;       // human-readable USDC string (optional)
  recipientLabel?: string; // local label only (never on-chain PII)
  note?: string;
  /** Free-form context (streamId, escrowId, salt etc.) — JSON-serialisable. */
  meta?: Record<string, unknown>;
}

export function useReceipts() {
  const { address } = useAccount();
  const [receipts, setReceipts] = useState<Receipt[]>([]);

  useEffect(() => {
    if (!address) {
      setReceipts([]);
      return;
    }
    setReceipts(getJSON<Receipt[]>(KEY, address) ?? []);
  }, [address]);

  const persist = useCallback(
    (next: Receipt[]) => {
      if (!address) return;
      setReceipts(next);
      setJSON(KEY, address, next);
    },
    [address]
  );

  const add = useCallback(
    (r: Omit<Receipt, "id" | "timestamp"> & Partial<Pick<Receipt, "id" | "timestamp">>) => {
      const full: Receipt = {
        id: r.id ?? (typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).slice(2)),
        timestamp: r.timestamp ?? Date.now(),
        ...r,
      };
      persist([full, ...receipts]);
      return full;
    },
    [receipts, persist]
  );

  const remove = useCallback(
    (id: string) => persist(receipts.filter((r) => r.id !== id)),
    [receipts, persist]
  );

  const clear = useCallback(() => persist([]), [persist]);

  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(receipts, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `obscura-receipts-${address?.slice(0, 8) ?? "unknown"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [receipts, address]);

  return { receipts, add, remove, clear, exportJSON };
}
