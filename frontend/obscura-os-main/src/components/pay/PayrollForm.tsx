import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Send } from "lucide-react";
import { useEncryptedPayroll } from "@/hooks/useEncryptedPayroll";
import AsyncStepper from "@/components/shared/AsyncStepper";
import { toast } from "sonner";

interface PayrollRow {
  id: string;
  address: string;
  amount: string;
}

export default function PayrollForm() {
  const [rows, setRows] = useState<PayrollRow[]>([
    { id: crypto.randomUUID(), address: "", amount: "" },
  ]);
  const { payEmployee, batchPay, status, stepIndex, isTxPending, txHash } =
    useEncryptedPayroll();

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      { id: crypto.randomUUID(), address: "", amount: "" },
    ]);
  };

  const removeRow = (id: string) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const updateRow = (id: string, field: "address" | "amount", value: string) => {
    setRows((prev) =>
      prev.map((r) => (r.id === id ? { ...r, [field]: value } : r))
    );
  };

  const isValidAddress = (addr: string) => /^0x[a-fA-F0-9]{40}$/.test(addr);

  const handleSubmit = async () => {
    const validRows = rows.filter(
      (r) => isValidAddress(r.address) && Number(r.amount) > 0
    );

    if (validRows.length === 0) {
      toast.error("Add at least one valid employee with amount");
      return;
    }

    try {
      if (validRows.length === 1) {
        const r = validRows[0];
        await payEmployee(
          r.address as `0x${string}`,
          BigInt(Math.floor(Number(r.amount)))
        );
      } else {
        await batchPay(
          validRows.map((r) => ({
            address: r.address as `0x${string}`,
            amount: BigInt(Math.floor(Number(r.amount))),
          }))
        );
      }
      toast.success("Payroll submitted successfully");
      setRows([{ id: crypto.randomUUID(), address: "", amount: "" }]);
    } catch (err) {
      toast.error((err as Error).message || "Transaction failed");
    }
  };

  const isProcessing = status !== "idle" && status !== "ready" && status !== "error";

  return (
    <div className="glass-panel rounded-sm p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-display text-sm tracking-wider text-foreground">
          Encrypted Payroll
        </h3>
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-[9px] font-mono text-primary hover:text-primary/80 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Add Employee
        </button>
      </div>

      <div className="space-y-3">
        {rows.map((row, idx) => (
          <motion.div
            key={row.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 p-3 bg-secondary/30 rounded-sm border border-border/30"
          >
            <div className="w-6 h-6 rounded-full bg-secondary flex items-center justify-center text-[9px] font-mono text-muted-foreground">
              {idx + 1}
            </div>
            <input
              type="text"
              placeholder="0x... employee address"
              value={row.address}
              onChange={(e) => updateRow(row.id, "address", e.target.value)}
              className="flex-1 px-3 py-1.5 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Amount"
              value={row.amount}
              onChange={(e) => updateRow(row.id, "amount", e.target.value)}
              className="w-28 px-3 py-1.5 bg-background border border-border/50 rounded-sm text-xs font-mono text-foreground placeholder:text-muted-foreground/30 focus:border-primary/40 focus:outline-none"
            />
            {rows.length > 1 && (
              <button
                onClick={() => removeRow(row.id)}
                className="text-muted-foreground/40 hover:text-red-400 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </motion.div>
        ))}
      </div>

      {/* Async Stepper */}
      {status !== "idle" && (
        <div className="pt-2">
          <AsyncStepper status={status} stepIndex={stepIndex} />
        </div>
      )}

      <motion.button
        onClick={handleSubmit}
        disabled={isProcessing || isTxPending}
        whileHover={!isProcessing ? { scale: 1.01 } : {}}
        whileTap={!isProcessing ? { scale: 0.99 } : {}}
        className="w-full py-3 text-xs tracking-[0.2em] uppercase font-mono bg-primary text-primary-foreground rounded-sm hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <Send className="w-3.5 h-3.5" />
        {isProcessing
          ? "Processing..."
          : rows.length > 1
          ? "Encrypt & Batch Pay"
          : "Encrypt & Pay"}
      </motion.button>

      {txHash && (
        <div className="text-[9px] font-mono text-muted-foreground/60 text-center">
          TX:{" "}
          <a
            href={`https://sepolia.arbiscan.io/tx/${txHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {txHash.slice(0, 10)}...{txHash.slice(-8)}
          </a>
        </div>
      )}
    </div>
  );
}
