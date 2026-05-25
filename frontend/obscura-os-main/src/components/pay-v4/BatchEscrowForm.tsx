import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Plus, Upload, Trash2, Loader2, CheckCircle2, Link2, Copy, Clock } from "lucide-react";
import { useOcUSDCEscrow } from "@/hooks/useOcUSDCEscrow";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";
import { parseUnits } from "viem";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS } from "@/config/pay";

interface Row {
  recipient: string;
  amount: string;
  note?: string;
}

const EXPIRY_OPTIONS: Array<{ label: string; days: number }> = [
  { label: "No expiry", days: 0 },
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
];

const isValidAddress = (s: string) => /^0x[a-fA-F0-9]{40}$/.test(s.trim());

/**
 * BatchEscrowForm — confidential payroll mode.
 *
 * The killer use case for an FHE escrow: HR uploads a CSV of (recipient,
 * amount) pairs, each row is encrypted client-side, and a single transaction
 * creates N escrows on chain. No employee can see another's salary, observers
 * see only that "20 escrows were created" with no amounts and no recipients.
 *
 * Capped at 20 rows per tx (contract enforces; aligns with Arbitrum gas).
 * For larger payrolls, the frontend may chunk into sequential batches.
 */
export default function BatchEscrowForm() {
  const [rows, setRows] = useState<Row[]>([{ recipient: "", amount: "", note: "" }]);
  const [filteredRows, setFilteredRows] = useState<Row[]>([]);
  const [expiryDays, setExpiryDays] = useState<number>(30);
  const [createdIds, setCreatedIds] = useState<string[] | null>(null);
  const [createdHash, setCreatedHash] = useState<`0x${string}` | null>(null);
  const [linkCopiedIdx, setLinkCopiedIdx] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  // Auto-fund per-row state. CoFHE proofs cannot be batched (each
  // InEuint64 is wallet-bound to its immediate caller), so funding is
  // a sequential client-side loop of 2 txs per escrow:
  //   (a) cUSDC.confidentialTransfer(escrow, encAmt)
  //   (b) escrow.fund(id, encAmt) -- record paidAmount
  type FundStatus = "pending" | "funding" | "done" | "failed";
  const [fundingResults, setFundingResults] = useState<
    Array<{ id: string; status: FundStatus; error?: string }>
  >([]);
  const [fundingIndex, setFundingIndex] = useState<number | null>(null);

  const { createBatch, fund, status, stepIndex, isTxPending, reset } = useOcUSDCEscrow();
  const usdcBalance = useUSDCBalance();

  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";

  const totalUsdc = useMemo(() => {
    let sum = 0;
    for (const r of rows) {
      const n = Number(r.amount);
      if (!Number.isNaN(n) && n > 0) sum += n;
    }
    return sum;
  }, [rows]);

  const validCount = useMemo(
    () => rows.filter((r) => isValidAddress(r.recipient) && Number(r.amount) > 0).length,
    [rows]
  );

  const addRow = () => {
    if (rows.length >= 20) { toast.error("Max 20 rows per batch"); return; }
    setRows([...rows, { recipient: "", amount: "", note: "" }]);
  };

  const removeRow = (i: number) => {
    if (rows.length === 1) { setRows([{ recipient: "", amount: "", note: "" }]); return; }
    setRows(rows.filter((_, idx) => idx !== i));
  };

  const updateRow = (i: number, patch: Partial<Row>) => {
    setRows(rows.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const handleCsvUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result);
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        // Accept "address,amount" or "address,amount,note". Skip header if first
        // line is non-numeric in column 2.
        const parsed: Row[] = [];
        for (const line of lines) {
          const parts = line.split(",").map((p) => p.trim());
          if (parts.length < 2) continue;
          if (!isValidAddress(parts[0])) continue;
          if (Number.isNaN(Number(parts[1])) || Number(parts[1]) <= 0) continue;
          parsed.push({ recipient: parts[0], amount: parts[1], note: parts[2] ?? "" });
          if (parsed.length >= 20) break;
        }
        if (parsed.length === 0) {
          toast.error("No valid rows found. Format: 0xaddress,amount[,note] per line.");
          return;
        }
        setRows(parsed);
        toast.success(`Loaded ${parsed.length} rows from CSV`);
      } catch {
        toast.error("CSV parse failed");
      }
    };
    reader.readAsText(file);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    const filtered = rows.filter((r) => isValidAddress(r.recipient) && Number(r.amount) > 0);
    if (filtered.length === 0) {
      toast.error("Add at least one valid row (address + amount > 0)");
      return;
    }
    if (filtered.length > 20) {
      toast.error("Max 20 rows per tx — split into multiple batches");
      return;
    }
    try {
        setSubmitting(true);
      let expiryBlock = 0n;
      if (expiryDays > 0) {
        const blocksPerDay = 7200n;
        try {
          const provider = (window as unknown as { ethereum?: { request: (a: { method: string }) => Promise<string> } }).ethereum;
          if (provider) {
            const hex = await provider.request({ method: "eth_blockNumber" });
            expiryBlock = BigInt(hex) + blocksPerDay * BigInt(expiryDays);
          } else {
            expiryBlock = blocksPerDay * BigInt(expiryDays);
          }
        } catch {
          expiryBlock = blocksPerDay * BigInt(expiryDays);
        }
      }

      const payload = filtered.map((r) => ({
        recipient: r.recipient.trim() as `0x${string}`,
        amount: parseUnits(r.amount, 6),
      }));

      const { ids, hash } = await createBatch(
        payload,
        "0x0000000000000000000000000000000000000000" as `0x${string}`,
        "0x" as `0x${string}`,
        expiryBlock
      );
      setFilteredRows(filtered);
      setCreatedIds(ids);
      setCreatedHash(hash);
      toast.success(
        `Created ${ids.length} confidential escrows. Now auto-funding each (${ids.length * 2} txs)…`,
        { duration: 8000 }
      );

      // ── Auto-fund loop ───────────────────────────────────────
      // Mirrors the single-create flow: 2 txs per escrow. CoFHE
      // proofs are wallet-bound so we cannot batch — but we can
      // queue them sequentially without user clicks between rows.
      const initial = ids.map((id) => ({ id, status: "pending" as FundStatus }));
      setFundingResults(initial);
      let okCount = 0;
      let failCount = 0;
      for (let i = 0; i < ids.length; i++) {
        setFundingIndex(i);
        setFundingResults((prev) =>
          prev.map((r, idx) => (idx === i ? { ...r, status: "funding" } : r))
        );
        try {
          await fund(BigInt(ids[i]), payload[i].amount);
          okCount++;
          setFundingResults((prev) =>
            prev.map((r, idx) => (idx === i ? { ...r, status: "done" } : r))
          );
        } catch (fundErr) {
          failCount++;
          const msg = (fundErr as Error).message || String(fundErr);
          setFundingResults((prev) =>
            prev.map((r, idx) =>
              idx === i ? { ...r, status: "failed", error: msg.slice(0, 140) } : r
            )
          );
          // Continue to next row — partial success is better than aborting.
          console.warn(`[BatchFund] row ${i} (escrow #${ids[i]}) failed:`, msg);
        }
      }
      setFundingIndex(null);
      if (failCount === 0) {
        toast.success(`All ${okCount} escrows funded. Recipients can now claim.`, { duration: 10000 });
      } else {
        toast.warning(
          `Funded ${okCount}/${ids.length}. ${failCount} failed — retry from Escrow Actions → Fund.`,
          { duration: 14000 }
        );
      }
    } catch (err) {
      toast.error((err as Error).message || "Batch create failed");
    } finally {
      setSubmitting(false);
    }
  };

  const copyLink = (id: string, idx: number) => {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/pay?tab=escrow&claim=${id}&contract=${OBSCURA_CONFIDENTIAL_ESCROW_ADDRESS ?? ""}`;
    navigator.clipboard.writeText(url);
    setLinkCopiedIdx(idx);
    setTimeout(() => setLinkCopiedIdx(null), 2000);
  };

  if (createdIds && createdIds.length > 0) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4 text-foreground" />
          </div>
          <div>
            <h3 className="font-display text-[15px] text-foreground leading-tight">{createdIds.length} private escrows created</h3>
            <p className="text-[11px] text-muted-foreground mt-0.5">Each recipient and amount stays hidden on-chain.</p>
          </div>
        </div>

        {(() => {
          const okN = fundingResults.filter((r) => r.status === "done").length;
          const failN = fundingResults.filter((r) => r.status === "failed").length;
          const stillFunding = fundingIndex !== null;
          if (stillFunding) {
            return (
              <p className="text-[12px] text-foreground/85 leading-relaxed">
                Auto-funding row <strong>{(fundingIndex ?? 0) + 1}</strong> of {createdIds.length} — confirm 2 MetaMask popups per row (ocUSDC transfer + on-chain record). Each row's amount and recipient remain encrypted.
              </p>
            );
          }
          if (fundingResults.length > 0 && failN === 0) {
            return (
              <p className="text-[12px] text-[hsl(var(--success))]/85 leading-relaxed">
                ✓ All {okN} escrows funded. Share each claim link with its recipient — they call Redeem to receive the ocUSDC. Recipients are encrypted on-chain.
              </p>
            );
          }
          if (fundingResults.length > 0 && failN > 0) {
            return (
              <p className="text-[12px] text-amber-300/85 leading-relaxed">
                Funded {okN}/{createdIds.length}. {failN} row{failN > 1 ? "s" : ""} failed — open Escrow Actions, paste the failed escrow ID, and click Fund to retry.
              </p>
            );
          }
          return (
            <p className="text-sm text-muted-foreground leading-relaxed">
              Share each claim link with its respective recipient. Each escrow's amount and recipient are encrypted on-chain.
            </p>
          );
        })()}

        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {createdIds.map((id, i) => {
            const fr = fundingResults[i];
            const fundLabel =
              fr?.status === "done" ? "funded" :
              fr?.status === "failed" ? "failed" :
              fr?.status === "funding" ? "funding…" :
              fr?.status === "pending" ? "queued" : "";
            const fundColor =
              fr?.status === "done" ? "text-[hsl(var(--success))]" :
              fr?.status === "failed" ? "text-red-300" :
              fr?.status === "funding" ? "text-foreground animate-pulse" :
              "text-muted-foreground/45";
            return (
              <div key={id} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border">
                <span className="font-mono text-[12px] text-foreground font-medium w-12">#{id}</span>
                <span className="font-mono text-[11px] text-muted-foreground truncate flex-1">
                  {filteredRows[i]?.recipient.slice(0, 8)}…{filteredRows[i]?.recipient.slice(-6)}
                </span>
                <span className="font-mono text-[11px] text-foreground/80">{filteredRows[i]?.amount} USDC</span>
                {fundLabel && (
                  <span
                    className={`font-mono text-[10px] uppercase tracking-wider w-16 text-right ${fundColor}`}
                    title={fr?.error}
                  >
                    {fundLabel}
                  </span>
                )}
                <button onClick={() => copyLink(id, i)}
                  className="px-2 py-1 rounded-md bg-muted hover:bg-muted/70 text-foreground text-[10px] tracking-wide inline-flex items-center gap-1 transition-colors border border-border">
                  {linkCopiedIdx === i ? <CheckCircle2 className="w-3 h-3" /> : <Link2 className="w-3 h-3" />}
                  {linkCopiedIdx === i ? "Copied" : "Link"}
                </button>
              </div>
            );
          })}
        </div>

        {createdHash && (
          <a href={`https://sepolia.arbiscan.io/tx/${createdHash}`} target="_blank" rel="noopener noreferrer"
            className="block text-center font-mono text-[11px] text-foreground hover:text-cyan-200">
            View batch tx · {createdHash.slice(0, 12)}…{createdHash.slice(-8)}
          </a>
        )}

        <div className="flex justify-end">
          <motion.button onClick={() => { setCreatedIds(null); setCreatedHash(null); setFundingResults([]); setFundingIndex(null); reset(); setRows([{ recipient: "", amount: "", note: "" }]); }}
            whileTap={{ scale: 0.99 }} className="btn-pay btn-pay-ghost">
            Create another batch
          </motion.button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-muted border border-border flex items-center justify-center">
          <Users className="w-4 h-4 text-foreground" />
        </div>
        <div className="min-w-0">
          <div className="font-display text-[15px] text-foreground leading-tight">Private batch payroll</div>
          <p className="text-[11px] text-muted-foreground/70 mt-0.5">Up to 20 recipients in a single transaction</p>
        </div>
        <span className="ml-auto shrink-0 inline-flex items-center gap-1.5 rounded-full bg-muted border border-border px-2 py-0.5 text-[10.5px] font-medium text-foreground/75">Private USDC</span>
      </div>

      <p className="text-[12px] text-muted-foreground leading-relaxed">
        Create up to 20 private escrows in one transaction. Each (recipient, amount) is encrypted client-side. Observers only see that <em>some number</em> of escrows were created — no amounts, no recipients.
      </p>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div className="px-3 py-2 rounded-lg bg-card border border-border">
          <div className="text-muted-foreground text-[10px]">Total USDC</div>
          <div className="font-mono text-base text-foreground font-medium tabular-nums">{totalUsdc.toFixed(2)}</div>
        </div>
        <div className="px-3 py-2 rounded-lg bg-card border border-border">
          <div className="text-muted-foreground text-[10px]">Valid rows</div>
          <div className="font-mono text-base text-foreground font-medium">
            {validCount}/{rows.length} <span className="text-muted-foreground/60 text-xs">(max 20)</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted border border-border">
        <span className="text-[11px] text-muted-foreground">Plain USDC</span>
        <span className="ml-auto font-mono text-[13px] text-foreground tabular-nums">{usdcBalance ?? "—"}</span>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/50 font-semibold flex items-center gap-1.5">
          <Clock className="w-3 h-3" /> Auto-Refund Window
        </label>
        <div className="grid grid-cols-4 gap-2">
          {EXPIRY_OPTIONS.map((opt) => (
            <button key={opt.days} type="button" onClick={() => setExpiryDays(opt.days)}
              className={`px-2 py-1.5 rounded-lg text-[11px] border transition-colors ${
                expiryDays === opt.days
                  ? "bg-foreground text-background border-foreground font-medium"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <label className="btn-pay btn-pay-ghost px-3 py-1.5 text-[11px] cursor-pointer inline-flex items-center gap-1.5">
          <Upload className="w-3 h-3" /> Import CSV
          <input type="file" accept=".csv,text/csv,text/plain" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); e.target.value = ""; }} />
        </label>
        <span className="text-[10px] text-muted-foreground/40 font-mono">format: 0xaddr,amount[,note]</span>
      </div>

      <div className="space-y-2 max-h-[360px] overflow-y-auto pr-1">
        {rows.map((row, i) => {
          const validAddr = isValidAddress(row.recipient);
          const validAmt = Number(row.amount) > 0;
          return (
            <div key={i} className="grid grid-cols-[auto_1fr_120px_auto] gap-2 items-center">
              <span className="font-mono text-[11px] text-muted-foreground/40 w-6 text-right">#{i + 1}</span>
              <input type="text" placeholder="0x… recipient address"
                value={row.recipient}
                onChange={(e) => updateRow(i, { recipient: e.target.value })}
                className={`pay-input font-mono text-[12px] ${row.recipient && !validAddr ? "border-red-500/40" : ""}`} />
              <input type="number" placeholder="ocUSDC" value={row.amount}
                onChange={(e) => updateRow(i, { amount: e.target.value })}
                className={`pay-input font-mono text-[12px] text-right ${row.amount && !validAmt ? "border-red-500/40" : ""}`} />
              <button type="button" onClick={() => removeRow(i)}
                className="p-1.5 rounded-md text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex gap-2">
        <motion.button onClick={addRow} disabled={rows.length >= 20} whileTap={{ scale: 0.98 }}
          className="btn-pay btn-pay-ghost flex-1 py-2 disabled:opacity-50">
          <Plus className="w-3.5 h-3.5" /> Add row
        </motion.button>
        <motion.button onClick={handleSubmit}
          disabled={isProcessing || isTxPending || submitting || validCount === 0}
          whileTap={{ scale: 0.98 }}
          className="btn-pay btn-pay-primary flex-[2] disabled:opacity-50">
          {isProcessing || submitting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Creating…</> : <>Create + fund {validCount} private escrows</>}
        </motion.button>
      </div>

      {status !== "idle" && (
        <div className="rounded-lg bg-card border border-border p-3">
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}
    </div>
  );
}
