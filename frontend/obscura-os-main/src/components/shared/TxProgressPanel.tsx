/**
 * TxProgressPanel — animated multi-step transaction visualiser.
 *
 * Renders a full-width card that replaces the submit area while a multi-tx
 * pay flow is in progress. Each step has a bespoke animated SVG icon that
 * transitions through idle → active (looping animation) → done (check) →
 * error (×).  Steps are connected by animated progress lines.
 *
 * Usage:
 *   const progress = useTxProgress(INVOICE_PAY_STEALTH_STEPS);
 *   ...
 *   <TxProgressPanel steps={progress.steps} title="Paying invoice privately" />
 */
import { motion, AnimatePresence } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { TxStep, TxStepType } from "@/hooks/useTxProgress";

// ── SVG icon atoms ────────────────────────────────────────────────────────────

/** Animated FHE lock with circuit nodes */
function FheEncryptIcon({ active, done, error }: { active: boolean; done: boolean; error: boolean }) {
  const c = done ? "#34d399" : error ? "#f87171" : active ? "#22d3ee" : "#334155";
  const glow = active ? "#22d3ee44" : "transparent";
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} fill="none">
      {/* Glow ring */}
      {active && (
        <motion.circle cx={20} cy={20} r={18}
          stroke={glow} strokeWidth={6}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: [0.3, 0.7, 0.3], scale: [0.9, 1.05, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      {/* Circuit nodes */}
      {active && [[6, 10], [34, 10], [6, 30], [34, 30]].map(([x, y], i) => (
        <motion.circle key={i} cx={x} cy={y} r={2} fill="#22d3ee"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.3 }}
        />
      ))}
      {/* Padlock body */}
      <motion.rect x={12} y={20} width={16} height={13} rx={2.5}
        stroke={c} strokeWidth={2} fill={done ? "#34d39922" : active ? "#22d3ee11" : "transparent"}
        animate={active ? { strokeOpacity: [0.6, 1, 0.6] } : {}}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      {/* Shackle */}
      <motion.path d="M14 20v-4a6 6 0 0 1 12 0v4"
        stroke={c} strokeWidth={2} strokeLinecap="round"
        animate={active ? { pathLength: [0.6, 1, 0.6] } : { pathLength: 1 }}
        transition={{ duration: 1.5, repeat: active ? Infinity : 0 }}
      />
      {/* Keyhole */}
      {done ? (
        <motion.path d="M17 29l2 2 4-4" stroke="#34d399" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
      ) : (
        <circle cx={20} cy={26} r={2} fill={c} opacity={active ? 0.9 : 0.4} />
      )}
    </svg>
  );
}

/** Animated coin/token flowing right */
function TransferIcon({ active, done, error }: { active: boolean; done: boolean; error: boolean }) {
  const c = done ? "#34d399" : error ? "#f87171" : active ? "#22d3ee" : "#334155";
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} fill="none">
      {/* Tail trail */}
      {active && [0, 1, 2].map((i) => (
        <motion.circle key={i} cy={20} r={2.5 - i * 0.6}
          fill="#22d3ee"
          initial={{ cx: 24 }}
          animate={{ cx: [24, 8], opacity: [0, 0.6, 0] }}
          transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.18, ease: "easeIn" }}
        />
      ))}
      {/* Arrow line */}
      <motion.line x1={8} y1={20} x2={28} y2={20}
        stroke={c} strokeWidth={2} strokeLinecap="round"
        animate={active ? { x2: [28, 24, 28] } : {}}
        transition={{ duration: 0.9, repeat: Infinity }}
      />
      <motion.path d="M24 15l6 5-6 5" stroke={c} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round"
        animate={active ? { x: [0, 2, 0] } : {}}
        transition={{ duration: 0.9, repeat: Infinity }}
      />
      {/* Coin */}
      <motion.circle cx={12} cy={20} r={5}
        stroke={c} strokeWidth={2}
        fill={done ? "#34d39922" : active ? "#22d3ee11" : "transparent"}
        animate={active ? { cx: [12, 30], opacity: [1, 0] } : {}}
        transition={{ duration: 1.2, repeat: Infinity, ease: "easeIn" }}
      />
      {done && (
        <motion.path d="M15 30l2 2 4-4" stroke="#34d399" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </svg>
  );
}

/** Radio-tower announce with expanding rings */
function AnnounceIcon({ active, done, error }: { active: boolean; done: boolean; error: boolean }) {
  const c = done ? "#34d399" : error ? "#f87171" : active ? "#a78bfa" : "#334155";
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} fill="none">
      {/* Expanding rings */}
      {active && [0, 1, 2].map((i) => (
        <motion.circle key={i} cx={20} cy={22} r={4}
          stroke="#a78bfa" strokeWidth={1.5}
          initial={{ r: 4, opacity: 0.8 }}
          animate={{ r: [4, 18 + i * 2], opacity: [0.8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, delay: i * 0.5, ease: "easeOut" }}
        />
      ))}
      {/* Tower base */}
      <motion.path d="M20 28v-8" stroke={c} strokeWidth={2.5} strokeLinecap="round" />
      <motion.path d="M16 28h8" stroke={c} strokeWidth={2} strokeLinecap="round" />
      {/* Antenna arcs */}
      <motion.path d="M14 18a8.5 8.5 0 0 1 12 0" stroke={c} strokeWidth={1.5}
        strokeLinecap="round"
        animate={active ? { opacity: [0.3, 1, 0.3] } : { opacity: 0.5 }}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <motion.path d="M11 14.5a13.5 13.5 0 0 1 18 0" stroke={c} strokeWidth={1}
        strokeLinecap="round"
        animate={active ? { opacity: [0.1, 0.6, 0.1] } : { opacity: 0.25 }}
        transition={{ duration: 1.2, repeat: Infinity, delay: 0.3 }}
      />
      {done && (
        <motion.path d="M16 33l2 2 4-4" stroke="#34d399" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </svg>
  );
}

/** Hourglass with countdown number */
function WaitIcon({ active, done, countdownSec }: { active: boolean; done: boolean; error: boolean; countdownSec?: number }) {
  const c = done ? "#34d399" : active ? "#f59e0b" : "#334155";
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} fill="none">
      {/* Hourglass outline */}
      <motion.path d="M13 10h14l-7 9.5L13 10z" stroke={c} strokeWidth={1.5} strokeLinejoin="round"
        fill={active ? "#f59e0b11" : "transparent"}
        animate={active ? { opacity: [0.7, 1, 0.7] } : {}}
        transition={{ duration: 1, repeat: Infinity }}
      />
      <motion.path d="M13 30h14l-7-9.5L13 30z" stroke={c} strokeWidth={1.5} strokeLinejoin="round"
        fill={active ? "#f59e0b22" : "transparent"}
      />
      {/* Falling sand particles */}
      {active && [0, 1, 2].map((i) => (
        <motion.circle key={i} cx={20} cy={19}
          r={1} fill="#f59e0b"
          initial={{ cy: 19, opacity: 1 }}
          animate={{ cy: [19, 27], opacity: [1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.25 }}
        />
      ))}
      {/* Countdown text */}
      {active && typeof countdownSec === "number" && countdownSec > 0 && (
        <text x="20" y="44" textAnchor="middle" fontSize="7" fill="#f59e0b" fontFamily="monospace">
          {countdownSec}s
        </text>
      )}
      {done && (
        <motion.path d="M15 37l2 2 4-4" stroke="#34d399" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </svg>
  );
}

/** Document being stamped */
function RecordIcon({ active, done, error }: { active: boolean; done: boolean; error: boolean }) {
  const c = done ? "#34d399" : error ? "#f87171" : active ? "#22d3ee" : "#334155";
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} fill="none">
      {/* Document */}
      <motion.rect x={10} y={8} width={18} height={22} rx={2}
        stroke={c} strokeWidth={1.5}
        fill={done ? "#34d39911" : active ? "#22d3ee08" : "transparent"}
        animate={active ? { strokeOpacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      <line x1={14} y1={14} x2={24} y2={14} stroke={c} strokeWidth={1} opacity={0.5} />
      <line x1={14} y1={18} x2={24} y2={18} stroke={c} strokeWidth={1} opacity={0.5} />
      <line x1={14} y1={22} x2={20} y2={22} stroke={c} strokeWidth={1} opacity={0.5} />
      {/* Stamp animation */}
      {active && (
        <motion.circle cx={28} cy={30} r={7}
          stroke="#22d3ee" strokeWidth={1.5}
          fill="#22d3ee11"
          initial={{ scale: 1.4, opacity: 0 }}
          animate={{ scale: [1.4, 1], opacity: [0, 0.8, 0.8] }}
          transition={{ duration: 0.7, repeat: Infinity, repeatDelay: 1 }}
        />
      )}
      {done ? (
        <motion.path d="M14 26l3 3 6-6" stroke="#34d399" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
      ) : (
        active && <motion.path d="M23 26l3 3-3 3" stroke="#22d3ee" strokeWidth={1.5}
          strokeLinecap="round" strokeLinejoin="round"
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
    </svg>
  );
}

/** Shield being assembled (create) */
function CreateIcon({ active, done, error }: { active: boolean; done: boolean; error: boolean }) {
  const c = done ? "#34d399" : error ? "#f87171" : active ? "#22d3ee" : "#334155";
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} fill="none">
      {active && (
        <motion.circle cx={20} cy={20} r={16}
          stroke="#22d3ee" strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray="6 6"
          animate={{ rotate: 360 }}
          style={{ transformOrigin: "center" }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}
      <motion.path
        d="M20 8l10 4v8c0 5.5-4 10.5-10 12-6-1.5-10-6.5-10-12V12z"
        stroke={c} strokeWidth={1.8}
        fill={done ? "#34d39920" : active ? "#22d3ee12" : "transparent"}
        animate={active ? { strokeOpacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 1.2, repeat: Infinity }}
      />
      {done ? (
        <motion.path d="M15 20l3 3 7-7" stroke="#34d399" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
      ) : (
        active && <motion.path d="M16 20l2.5 2.5 5-5" stroke="#22d3ee" strokeWidth={1.5}
          strokeLinecap="round" strokeLinejoin="round"
          animate={{ opacity: [0.3, 0.9, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      )}
    </svg>
  );
}

/** Vault / safe icon (fund / redeem) */
function VaultIcon({ active, done, error, type }: { active: boolean; done: boolean; error: boolean; type: "fund" | "redeem" }) {
  const c = done ? "#34d399" : error ? "#f87171" : active ? (type === "redeem" ? "#a78bfa" : "#22d3ee") : "#334155";
  const accent = type === "redeem" ? "#a78bfa" : "#22d3ee";
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} fill="none">
      <motion.rect x={8} y={10} width={24} height={20} rx={3}
        stroke={c} strokeWidth={1.8}
        fill={done ? "#34d39911" : active ? `${accent}0d` : "transparent"}
        animate={active ? { strokeOpacity: [0.5, 1, 0.5] } : {}}
        transition={{ duration: 1.3, repeat: Infinity }}
      />
      {/* Dial */}
      <motion.circle cx={20} cy={20} r={5}
        stroke={c} strokeWidth={1.5}
        animate={active ? { rotate: type === "fund" ? 720 : -720 } : {}}
        style={{ transformOrigin: "20px 20px" }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
      />
      <line x1={20} y1={15} x2={20} y2={20} stroke={c} strokeWidth={1.5} strokeLinecap="round" />
      {/* Coin in/out */}
      {active && (
        <motion.circle cx={20} cy={type === "fund" ? 8 : 30} r={2.5}
          fill={accent}
          animate={{ cy: type === "fund" ? [8, 14] : [30, 24], opacity: [1, 0] }}
          transition={{ duration: 0.9, repeat: Infinity, ease: "easeIn" }}
        />
      )}
      {done && (
        <motion.path d="M15 32l2 2 4-4" stroke="#34d399" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.4 }}
        />
      )}
    </svg>
  );
}

/** Generic subscribe */
function SubscribeIcon({ active, done, error }: { active: boolean; done: boolean; error: boolean }) {
  const c = done ? "#34d399" : error ? "#f87171" : active ? "#22d3ee" : "#334155";
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} fill="none">
      <motion.circle cx={20} cy={20} r={12}
        stroke={c} strokeWidth={1.8}
        strokeDasharray={active ? "4 3" : "none"}
        fill={done ? "#34d39911" : "transparent"}
        animate={active ? { rotate: 360 } : {}}
        style={{ transformOrigin: "center" }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
      />
      {done && (
        <motion.path d="M14 20l4 4 8-8" stroke="#34d399" strokeWidth={2}
          strokeLinecap="round" strokeLinejoin="round"
          initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
          transition={{ duration: 0.5 }}
        />
      )}
    </svg>
  );
}

/** Error X */
function ErrorIcon() {
  return (
    <svg viewBox="0 0 40 40" width={40} height={40} fill="none">
      <motion.circle cx={20} cy={20} r={14}
        stroke="#f87171" strokeWidth={1.5}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3 }}
      />
      <motion.path d="M14 14l12 12M26 14L14 26" stroke="#f87171" strokeWidth={2}
        strokeLinecap="round"
        initial={{ pathLength: 0 }} animate={{ pathLength: 1 }}
        transition={{ duration: 0.4 }}
      />
    </svg>
  );
}

// ── Icon dispatcher ──────────────────────────────────────────────────────────
function StepIcon({ step }: { step: TxStep }) {
  const active = step.status === "active";
  const done   = step.status === "done";
  const error  = step.status === "error";

  if (error) return <ErrorIcon />;

  switch (step.type as TxStepType) {
    case "fhe_encrypt": return <FheEncryptIcon active={active} done={done} error={error} />;
    case "transfer":    return <TransferIcon active={active} done={done} error={error} />;
    case "announce":    return <AnnounceIcon active={active} done={done} error={error} />;
    case "wait":        return <WaitIcon active={active} done={done} error={error} countdownSec={step.countdownSec} />;
    case "record":      return <RecordIcon active={active} done={done} error={error} />;
    case "create":      return <CreateIcon active={active} done={done} error={error} />;
    case "subscribe":   return <SubscribeIcon active={active} done={done} error={error} />;
    case "fund":        return <VaultIcon active={active} done={done} error={error} type="fund" />;
    case "redeem":      return <VaultIcon active={active} done={done} error={error} type="redeem" />;
    case "borrow":      return <TransferIcon active={active} done={done} error={error} />;
    case "bid":         return <SubscribeIcon active={active} done={done} error={error} />;
    case "accrue":      return <RecordIcon active={active} done={done} error={error} />;
    default:            return <CreateIcon active={active} done={done} error={error} />;
  }
}

// ── Step colours ──────────────────────────────────────────────────────────────
function stepColor(type: TxStepType): string {
  switch (type) {
    case "fhe_encrypt": return "cyan";
    case "transfer":    return "cyan";
    case "announce":    return "violet";
    case "wait":        return "amber";
    case "record":      return "cyan";
    case "create":      return "cyan";
    case "fund":        return "cyan";
    case "redeem":      return "violet";
    case "borrow":      return "violet";
    case "bid":         return "amber";
    case "accrue":      return "cyan";
    default:            return "cyan";
  }
}

function connectorClass(fromStatus: TxStepStatus): string {
  if (fromStatus === "done") return "bg-emerald-500/60";
  if (fromStatus === "active") return "bg-cyan-500/40";
  return "bg-white/[0.07]";
}

// ── Background network decoration ────────────────────────────────────────────
function NetworkBg() {
  return (
    <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.07]"
      viewBox="0 0 400 100" preserveAspectRatio="xMidYMid slice" fill="none">
      {/* Hex grid dots */}
      {Array.from({ length: 60 }).map((_, i) => {
        const col = i % 10;
        const row = Math.floor(i / 10);
        const x = col * 44 + (row % 2 ? 22 : 0) + 4;
        const y = row * 20 + 5;
        return <circle key={i} cx={x} cy={y} r={1.2} fill="#22d3ee" />;
      })}
      {/* Connecting lines */}
      <line x1={44} y1={5} x2={88} y2={25} stroke="#22d3ee" strokeWidth={0.5} />
      <line x1={132} y1={5} x2={176} y2={25} stroke="#a78bfa" strokeWidth={0.5} />
      <line x1={220} y1={5} x2={264} y2={25} stroke="#22d3ee" strokeWidth={0.5} />
      <line x1={308} y1={25} x2={352} y2={5} stroke="#a78bfa" strokeWidth={0.5} />
    </svg>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
interface TxProgressPanelProps {
  steps: TxStep[];
  title?: string;
  /** Shown under title while processing */
  subtitle?: string;
  /** Shown when all done */
  doneMessage?: string;
  className?: string;
}

export default function TxProgressPanel({
  steps,
  title = "Processing transaction",
  subtitle,
  doneMessage,
  className = "",
}: TxProgressPanelProps) {
  const allDone   = steps.every((s) => s.status === "done");
  const hasError  = steps.some((s) => s.status === "error");
  const activeIdx = steps.findIndex((s) => s.status === "active");

  return (
    <motion.div
      className={`relative overflow-hidden rounded-2xl border bg-[#0a0f1a] ${
        hasError
          ? "border-red-500/30 shadow-[0_0_30px_rgba(248,113,113,0.08)]"
          : allDone
          ? "border-emerald-500/30 shadow-[0_0_30px_rgba(52,211,153,0.10)]"
          : "border-cyan-500/20 shadow-[0_0_40px_rgba(34,211,238,0.08)]"
      } ${className}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {/* Mesh background */}
      <NetworkBg />

      {/* Top gradient accent */}
      <div className={`absolute top-0 left-0 right-0 h-px ${
        hasError ? "bg-gradient-to-r from-transparent via-red-500/60 to-transparent"
        : allDone ? "bg-gradient-to-r from-transparent via-emerald-500/60 to-transparent"
        : "bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent"
      }`} />

      <div className="relative p-5 space-y-5">
        {/* Header */}
        <div className="flex items-center gap-3">
          {/* Animated shield logo */}
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center border shrink-0 ${
            hasError ? "bg-red-500/10 border-red-500/30"
            : allDone ? "bg-emerald-500/10 border-emerald-500/30"
            : "bg-cyan-500/10 border-cyan-500/20"
          }`}>
            {allDone ? (
              <motion.svg viewBox="0 0 24 24" width={18} height={18} fill="none"
                initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
                <path d="M5 12l4 4 10-10" stroke="#34d399" strokeWidth={2.5}
                  strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            ) : hasError ? (
              <svg viewBox="0 0 24 24" width={18} height={18} fill="none">
                <path d="M6 6l12 12M18 6L6 18" stroke="#f87171" strokeWidth={2.5}
                  strokeLinecap="round" />
              </svg>
            ) : (
              <motion.svg viewBox="0 0 24 24" width={18} height={18} fill="none"
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}>
                <path d="M12 2l8 3v7c0 5-3.5 9-8 10-4.5-1-8-5-8-10V5z"
                  stroke="#22d3ee" strokeWidth={1.8}
                  fill="#22d3ee0d" />
                <motion.path d="M9 12l2 2 4-4" stroke="#22d3ee" strokeWidth={1.8}
                  strokeLinecap="round" strokeLinejoin="round"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.5, repeat: Infinity }}
                />
              </motion.svg>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className={`text-[11px] font-display font-semibold ${
              hasError ? "text-red-300"
              : allDone ? "text-emerald-300"
              : "text-foreground/90"
            }`}>
              {allDone ? (doneMessage || "All transactions confirmed") : hasError ? "Transaction failed" : title}
            </div>
            {!allDone && !hasError && subtitle && (
              <div className="text-[10px] text-muted-foreground/50 mt-0.5">{subtitle}</div>
            )}
            {/* Progress fraction */}
            {!allDone && !hasError && (
              <div className="text-[10px] text-muted-foreground/40 mt-0.5 font-mono">
                Step {Math.max(activeIdx + 1, 1)} of {steps.length}
              </div>
            )}
          </div>
          {/* Spinning ring while active */}
          {!allDone && !hasError && (
            <motion.div className="w-7 h-7 rounded-full border-2 border-cyan-500/20 border-t-cyan-400 shrink-0"
              animate={{ rotate: 360 }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
            />
          )}
        </div>

        {/* Overall progress bar */}
        <div className="h-1 rounded-full bg-white/[0.05] overflow-hidden">
          <motion.div
            className={`h-full rounded-full ${hasError ? "bg-red-400" : "bg-gradient-to-r from-cyan-500 to-emerald-400"}`}
            initial={{ width: "0%" }}
            animate={{
              width: `${Math.round(
                (steps.filter((s) => s.status === "done").length / steps.length) * 100
              )}%`,
            }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </div>

        {/* Steps */}
        <div className="space-y-1">
          {steps.map((step, idx) => {
            const isActive = step.status === "active";
            const isDone   = step.status === "done";
            const isError  = step.status === "error";
            const isIdle   = step.status === "idle";
            const color    = stepColor(step.type);

            return (
              <div key={step.id}>
                {/* Step row */}
                <motion.div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                    isActive
                      ? `bg-${color}-500/[0.07] border border-${color}-500/20`
                      : isDone
                      ? "bg-emerald-500/[0.05] border border-emerald-500/15"
                      : isError
                      ? "bg-red-500/[0.07] border border-red-500/20"
                      : "border border-transparent"
                  }`}
                  animate={isActive ? { scale: [1, 1.005, 1] } : { scale: 1 }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {/* SVG icon */}
                  <div className="w-10 h-10 shrink-0">
                    <StepIcon step={step} />
                  </div>

                  {/* Labels */}
                  <div className="flex-1 min-w-0">
                    <div className={`text-[11px] font-display font-semibold ${
                      isError ? "text-red-300"
                      : isDone ? "text-emerald-300"
                      : isActive ? "text-foreground/95"
                      : "text-muted-foreground/35"
                    }`}>
                      {step.label}
                    </div>
                    <div className={`text-[10px] leading-snug mt-0.5 ${
                      isActive ? "text-muted-foreground/60" : "text-muted-foreground/30"
                    }`}>
                      {isError && step.errorMsg
                        ? step.errorMsg.slice(0, 60) + (step.errorMsg.length > 60 ? "…" : "")
                        : step.sublabel}
                    </div>
                    {/* Tx hash */}
                    {isDone && step.txHash && (
                      <motion.a
                        href={`https://sepolia.arbiscan.io/tx/${step.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[9px] font-mono text-emerald-400/70 hover:text-emerald-300 mt-0.5"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ delay: 0.2 }}
                      >
                        {step.txHash.slice(0, 10)}…{step.txHash.slice(-6)}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </motion.a>
                    )}
                  </div>

                  {/* Right status badge */}
                  <div className="shrink-0">
                    {isIdle && (
                      <div className="w-5 h-5 rounded-full border border-white/[0.1] flex items-center justify-center">
                        <span className="text-[8px] font-mono text-muted-foreground/30">{idx + 1}</span>
                      </div>
                    )}
                    {isActive && (
                      <motion.div className="w-5 h-5 rounded-full border-2 border-cyan-500/30 border-t-cyan-400"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      />
                    )}
                    {isDone && (
                      <motion.div className="w-5 h-5 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center"
                        initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 400 }}>
                        <svg viewBox="0 0 12 12" width={10} height={10} fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#34d399" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </motion.div>
                    )}
                    {isError && (
                      <div className="w-5 h-5 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center">
                        <svg viewBox="0 0 12 12" width={10} height={10} fill="none">
                          <path d="M3 3l6 6M9 3l-6 6" stroke="#f87171" strokeWidth={1.8} strokeLinecap="round" />
                        </svg>
                      </div>
                    )}
                  </div>
                </motion.div>

                {/* Connector line between steps */}
                {idx < steps.length - 1 && (
                  <div className="flex items-center ml-8 py-0.5">
                    <div className={`w-px h-3 mx-[17px] rounded-full transition-colors duration-500 ${connectorClass(step.status)}`} />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* FHE notice */}
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.025] border border-white/[0.06]">
          <svg viewBox="0 0 16 16" width={12} height={12} fill="none" className="shrink-0">
            <path d="M8 1l6 2.5v5C14 12 11.5 15 8 16 4.5 15 2 12 2 8.5v-5z"
              stroke="#22d3ee" strokeWidth={1.2} fill="#22d3ee0a" />
          </svg>
          <span className="text-[9px] text-muted-foreground/40 leading-relaxed">
            Powered by Fhenix CoFHE — amounts sealed with Fully Homomorphic Encryption. Never exposed on-chain.
          </span>
        </div>
      </div>
    </motion.div>
  );
}
