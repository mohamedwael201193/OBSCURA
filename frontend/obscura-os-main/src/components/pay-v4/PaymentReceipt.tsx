/**
 * PaymentReceipt — renders a single receipt row + provides JSON download.
 * `<ReceiptList>` shows the most recent receipts on the Pay home zone /
 * Receipts modal.
 */
import { Card } from "@/components/elite/Layout";
import { Button } from "@/components/ui/button";
import { Download, Trash2, ExternalLink } from "lucide-react";
import { useReceipts, type Receipt } from "@/hooks/useReceipts";

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

export function ReceiptRow({ r, onRemove }: { r: Receipt; onRemove: (id: string) => void }) {
  const ts = new Date(r.timestamp);
  return (
    <div className="flex items-start gap-3 p-3 rounded-md border border-white/[0.06] bg-white/[0.02] text-[12px]">
      <div className="flex-1 min-w-0">
        <div className="text-foreground/90 truncate">
          {KIND_LABEL[r.kind] ?? r.kind}
          {r.recipientLabel && (
            <span className="text-muted-foreground/70"> · {r.recipientLabel}</span>
          )}
          {r.amount && (
            <span className="text-emerald-300/80 font-mono"> · {r.amount} cUSDC</span>
          )}
        </div>
        <div className="text-[10px] text-muted-foreground/55 font-mono truncate">
          {ts.toLocaleString()} · chain {r.chainId}
        </div>
      </div>
      <a
        href={`https://sepolia.arbiscan.io/tx/${r.txHash}`}
        target="_blank"
        rel="noreferrer"
        className="text-muted-foreground/65 hover:text-emerald-300"
        title={r.txHash}
      >
        <ExternalLink className="w-3.5 h-3.5" />
      </a>
      <button
        onClick={() => onRemove(r.id)}
        className="text-muted-foreground/55 hover:text-red-300"
        title="Remove from local ledger"
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ReceiptList({ limit }: { limit?: number }) {
  const { receipts, remove, exportJSON } = useReceipts();
  const shown = typeof limit === "number" ? receipts.slice(0, limit) : receipts;

  if (receipts.length === 0) {
    return (
      <Card className="p-5 text-center text-[12px] text-muted-foreground/65">
        No receipts yet. Every send writes one locally.
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55 font-mono">
          Recent receipts ({receipts.length})
        </div>
        <Button variant="outline" size="sm" onClick={() => exportJSON()}>
          <Download className="w-3.5 h-3.5 mr-1" /> Export
        </Button>
      </div>
      <div className="space-y-2">
        {shown.map((r) => (
          <ReceiptRow key={r.id} r={r} onRemove={remove} />
        ))}
      </div>
    </Card>
  );
}

export default ReceiptList;
