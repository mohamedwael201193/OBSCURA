/**
 * PaymentReceipt — renders a single receipt row + provides JSON download.
 * `<ReceiptList>` shows the most recent receipts on the Pay home zone /
 * Receipts modal.
 */
import { useState } from "react";
import { Card } from "@/components/elite/Layout";
import { Button } from "@/components/ui/button";
import { Download, Eye, EyeOff, Lock, Trash2, ExternalLink, FileSpreadsheet } from "lucide-react";
import { useReceipts, type Receipt } from "@/hooks/useReceipts";
import { toCsv, downloadCsv } from "@/lib/exportCsv";
import type { PayPrivacyMode } from "@/contexts/PaymentModeContext";
import { filterReceiptsByPrivacyMode, getReceiptMode, getReceiptToken } from "@/lib/payModeFilters";

const KIND_LABEL: Record<Receipt["kind"], string> = {
  transfer: "Transfer",
  "stream-create": "Stream created",
  "stream-tick": "Stream tick",
  "stream-cancel": "Stream cancelled",
  "escrow-create": "Escrow created",
  "escrow-fund": "Escrow funded",
  "escrow-redeem": "Escrow redeemed",
  "stealth-sweep": "Stealth payment",
  "cross-chain-fund": "Cross-chain fund",
  "insurance-buy": "Insurance bought",
  "insurance-subscribe": "Insurance subscribed",
  "contact-add": "Contact added",
  "contact-remove": "Contact removed",
  "stealth-rotate": "Meta rotated",
};

function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function ReceiptRow({ r, onRemove, showAmount = false }: { r: Receipt; onRemove: (id: string) => void; showAmount?: boolean }) {
  const ts = new Date(r.timestamp);
  const receiptMode = getReceiptMode(r);
  const token = getReceiptToken(r);
  const amountVisible = receiptMode === "public" || showAmount;
  return (
    <div className="flex items-start gap-2 p-3 rounded-xl hairline bg-muted/40 text-[12px] sm:gap-3">
      <div className="flex-1 min-w-0">
        <div className="text-foreground/90 break-words sm:truncate">
          {KIND_LABEL[r.kind] ?? r.kind}
          {r.recipientLabel && (
            <span className="text-muted-foreground/70"> · {r.recipientLabel}</span>
          )}
          <span className="font-mono text-muted-foreground/60 sm:whitespace-nowrap">
            {" · "}
            {r.amount && amountVisible ? (
              <span className={receiptMode === "public" ? "text-foreground/80" : "text-[hsl(var(--success))]/80"}>
                {r.amount} {token}
              </span>
            ) : (
              <span className="inline-flex items-center gap-0.5">
                <Lock className="inline h-[9px] w-[9px] opacity-40" />
                <span className="opacity-50">••••• {token}</span>
              </span>
            )}
          </span>
        </div>
        <div className="text-[10px] text-muted-foreground/55 font-mono truncate">
          {ts.toLocaleString()} · chain {r.chainId}
        </div>
      </div>
      <a
        href={`https://sepolia.arbiscan.io/tx/${r.txHash}`}
        target="_blank"
        rel="noreferrer"
        className="shrink-0 text-muted-foreground/65 hover:text-[hsl(var(--success))]"
        title={r.txHash}
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <button
        onClick={() => onRemove(r.id)}
        className="shrink-0 text-muted-foreground/55 hover:text-red-300"
        title="Remove from local ledger"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ReceiptList({ limit, mode }: { limit?: number; mode?: PayPrivacyMode }) {
  const { receipts, remove, exportJSON } = useReceipts();
  const [showAmounts, setShowAmounts] = useState(false);
  const filteredReceipts = filterReceiptsByPrivacyMode(receipts, mode);
  const shown = typeof limit === "number" ? filteredReceipts.slice(0, limit) : filteredReceipts;
  const tokenLabel = mode === "public" ? "USDC" : mode === "private" ? "ocUSDC" : "Token";

  if (filteredReceipts.length === 0) {
    return (
      <Card className="p-5 text-center text-[12px] text-muted-foreground/65">
        {mode === "public"
          ? "No public USDC receipts yet. Gasless public sends and smart-account funding will appear here."
          : mode === "private"
            ? "No private ocUSDC receipts yet. Encrypted sends, streams, escrows, and claims will appear here."
            : "No receipts yet. Every send writes one locally."}
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55 font-mono">
          Recent receipts ({filteredReceipts.length})
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {mode !== "public" && (
            <button
              type="button"
              onClick={() => setShowAmounts((v) => !v)}
              title={showAmounts ? "Hide amounts" : "Reveal amounts"}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[9px] font-mono uppercase tracking-[0.1em] text-muted-foreground/50 transition-colors hover:text-foreground hairline"
            >
              {showAmounts ? (
                <><EyeOff className="h-3 w-3" /> Hide</>
              ) : (
                <><Eye className="h-3 w-3" /> Reveal</>
              )}
            </button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const csv = toCsv(
                filteredReceipts.map((r) => ({
                  date: new Date(r.timestamp).toISOString(),
                  kind: KIND_LABEL[r.kind] ?? r.kind,
                  amount: r.amount ?? "",
                  token: getReceiptToken(r),
                  mode: getReceiptMode(r),
                  recipient: r.recipientLabel ?? "",
                  note: r.note ?? "",
                  txHash: r.txHash,
                  chainId: r.chainId,
                })),
                [
                  { key: "date", label: "Date (UTC)" },
                  { key: "kind", label: "Kind" },
                  { key: "amount", label: `Amount (${tokenLabel})` },
                  { key: "token", label: "Token" },
                  { key: "mode", label: "Mode" },
                  { key: "recipient", label: "Recipient label" },
                  { key: "note", label: "Note" },
                  { key: "txHash", label: "Tx hash" },
                  { key: "chainId", label: "Chain ID" },
                ]
              );
              downloadCsv(`obscura-receipts-${new Date().toISOString().slice(0, 10)}.csv`, csv);
            }}
            title="Export as CSV (Excel-friendly)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => mode ? downloadJson(`obscura-${mode}-receipts-${new Date().toISOString().slice(0, 10)}.json`, filteredReceipts) : exportJSON()}
          >
            <Download className="w-3.5 h-3.5 mr-1" /> JSON
          </Button>
        </div>
      </div>
      <div className="space-y-2">
        {shown.map((r) => (
          <ReceiptRow key={r.id} r={r} onRemove={remove} showAmount={showAmounts} />
        ))}
      </div>
    </Card>
  );
}

export default ReceiptList;
