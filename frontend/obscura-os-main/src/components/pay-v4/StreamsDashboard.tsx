/**
 * StreamsDashboard — redesigned Streams tab (Wave 3, v4 UI).
 *
 * Layout:
 *  1. cUSDC balance banner  — shows tracked balance + "Encrypt more" link to Send
 *  2. Create stream         — V2 form (already styled as pay-card)
 *  3. Bulk payroll import   — collapsible toggle row
 *  4. Active streams        — Sending / Receiving tab switcher
 *
 * CUSDCPanel (wrap/unwrap/reveal) has been removed from Streams.
 * It lives in the Send tab under "Encrypt · Decrypt cUSDC" for clarity.
 */
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lock,
  ArrowDownToLine,
  Upload,
  ChevronDown,
  ChevronUp,
  SendHorizonal,
  Inbox,
  RefreshCw,
  Info,
} from "lucide-react";
import { useAccount } from "wagmi";
import { getTrackedUnits } from "@/lib/trackedBalance";
import CreateStreamFormV2 from "@/components/pay-v4/CreateStreamFormV2";
import StreamList from "@/components/pay-v4/StreamList";
import BulkPayrollImport from "@/components/pay-v4/BulkPayrollImport";

type Tab =
  | "home"
  | "send"
  | "receive"
  | "streams"
  | "escrow"
  | "insurance"
  | "advanced"
  | "contacts"
  | "settings";

interface Props {
  onNavigate: (tab: Tab) => void;
  refreshKey: number;
  onRefresh: () => void;
}

type StreamTab = "sending" | "receiving";

export default function StreamsDashboard({ onNavigate, refreshKey, onRefresh }: Props) {
  const { address } = useAccount();
  const [streamTab, setStreamTab] = useState<StreamTab>("sending");
  const [showBulk, setShowBulk] = useState(false);

  const cusdcUnits = address ? getTrackedUnits(address) : 0n;
  const cusdcNum = Number(cusdcUnits) / 1_000_000;

  return (
    <div className="space-y-4">

      {/* ── 1. cUSDC Balance Banner ─────────────────────────────────────── */}
      <div className="pay-card px-4 py-3.5 flex items-center gap-3">
        {/* Icon */}
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
          <Lock className="w-4 h-4 text-emerald-400" />
        </div>

        {/* Balance */}
        <div className="flex-1 min-w-0">
          <div className="text-[9px] uppercase tracking-[0.22em] text-muted-foreground/35 font-mono">
            cUSDC available for streams
          </div>
          <div className="font-mono text-[14px] font-semibold leading-tight mt-0.5">
            {cusdcNum > 0 ? (
              <>
                <span className="text-emerald-200">≈ {cusdcNum.toFixed(2)}</span>
                <span className="text-[10px] text-emerald-400/50 ml-1.5">cUSDC</span>
              </>
            ) : (
              <span className="text-muted-foreground/40 text-[13px]">No cUSDC yet</span>
            )}
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => onNavigate("send")}
          title="Go to Send → Encrypt cUSDC to get tokens for streams"
          className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-emerald-500/25 bg-emerald-500/[0.04] text-[11px] text-emerald-300/70 hover:text-emerald-300 hover:border-emerald-500/50 hover:bg-emerald-500/[0.08] transition-all"
        >
          <ArrowDownToLine className="w-3 h-3" />
          {cusdcNum > 0 ? "Encrypt more" : "Get cUSDC"} →
        </button>
      </div>

      {/* ── 2. Create Stream (V2 — has its own pay-card) ──────────────── */}
      <CreateStreamFormV2 onCreated={onRefresh} />

      {/* ── 3. Bulk Payroll Import (collapsible) ──────────────────────── */}
      <div>
        {/* Toggle header */}
        <button
          onClick={() => setShowBulk((v) => !v)}
          className="pay-card w-full px-5 py-4 flex items-center gap-3 hover:bg-white/[0.03] transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0">
            <Upload className="w-3.5 h-3.5 text-muted-foreground/55" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[13px] font-medium text-foreground/85 leading-tight">
              Bulk payroll import
            </div>
            <div className="text-[11px] text-muted-foreground/40 mt-0.5">
              Upload a CSV to create streams for many recipients at once
            </div>
          </div>
          <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/25 mr-1 shrink-0">
            CSV
          </span>
          {showBulk
            ? <ChevronUp className="w-4 h-4 text-muted-foreground/40 shrink-0" />
            : <ChevronDown className="w-4 h-4 text-muted-foreground/40 shrink-0" />
          }
        </button>

        {/* Expanded content — BulkPayrollImport has its own Card */}
        <AnimatePresence>
          {showBulk && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <BulkPayrollImport />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── 4. Active Streams ─────────────────────────────────────────── */}
      <div className="space-y-3">

        {/* Section header + tabs */}
        <div className="flex items-center justify-between">
          <div className="flex gap-1.5">
            {([
              { key: "sending" as const, label: "Sending", icon: SendHorizonal },
              { key: "receiving" as const, label: "Receiving", icon: Inbox },
            ]).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setStreamTab(key)}
                className={`inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium rounded-lg border transition-all ${
                  streamTab === key
                    ? "bg-emerald-500/12 border-emerald-500/30 text-emerald-300 shadow-[0_0_10px_rgba(52,211,153,0.08)]"
                    : "bg-transparent border-white/[0.07] text-muted-foreground/50 hover:text-muted-foreground/80 hover:border-white/[0.12]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </button>
            ))}
          </div>

          <button
            onClick={onRefresh}
            className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-[0.15em] text-muted-foreground/35 hover:text-emerald-400 transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>

        {/* How-to hint for receiving tab */}
        {streamTab === "receiving" && (
          <div className="flex items-start gap-2 px-3.5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06] text-[11px] text-muted-foreground/50 leading-relaxed">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-cyan-400/50" />
            Streams paying you appear here once an employer creates a stream to your address.
            If you registered a stealth meta-address, payments may arrive in the{" "}
            <button
              onClick={() => onNavigate("receive")}
              className="text-cyan-400/70 hover:text-cyan-400 underline underline-offset-2 transition-colors"
            >
              Stealth Inbox
            </button>{" "}
            instead.
          </div>
        )}

        {/* Stream list (StreamList has its own pay-card wrapper) */}
        <AnimatePresence mode="wait">
          <motion.div
            key={streamTab}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
          >
            {streamTab === "sending"
              ? <StreamList key={`emp-${refreshKey}`} mode="employer" />
              : <StreamList key={`rec-${refreshKey}`} mode="recipient" />
            }
          </motion.div>
        </AnimatePresence>
      </div>

    </div>
  );
}
