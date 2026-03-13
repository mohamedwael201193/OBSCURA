import { useEffect, useRef, useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Activity,
  CircleDollarSign,
  Fingerprint,
  Inbox,
  LockKeyhole,
  Send,
  Shield,
  Sparkles,
  Wallet,
  Zap,
} from "lucide-react";
import {
  motion,
  useInView,
  useReducedMotion,
  AnimatePresence,
} from "framer-motion";
import { cn } from "@/lib/utils";
import {
  ObscuraFeatureIcon,
  type ObscuraChipTone,
} from "@/components/landing/ObscuraFeatureIcon";

type PayFlowMode = "private" | "public";

type FlowNode = {
  id: string;
  title: string;
  detail: string;
  tag?: string;
  icon: LucideIcon;
  tone: ObscuraChipTone;
};

const PRIVATE_FLOW: FlowNode[] = [
  {
    id: "wallet",
    title: "Connect wallet",
    detail: "MetaMask or WalletConnect on Arbitrum Sepolia.",
    tag: "EOA",
    icon: Wallet,
    tone: "forest",
  },
  {
    id: "shield",
    title: "Shield USDC",
    detail: "Public USDC moves in; your balance becomes encrypted ocUSDC.",
    tag: "ocUSDC",
    icon: Shield,
    tone: "moss",
  },
  {
    id: "encrypt",
    title: "Encrypt in browser",
    detail: "Amounts are sealed with CoFHE before the transaction is sent.",
    tag: "FHE",
    icon: LockKeyhole,
    tone: "lime",
  },
  {
    id: "transfer",
    title: "Confidential transfer",
    detail: "Send to an address, or use a stealth meta-address for recipient privacy.",
    tag: "Send",
    icon: Send,
    tone: "deep",
  },
  {
    id: "activity",
    title: "Activity & inbox",
    detail: "Receipts, stealth claims, streams, and invoices in one feed.",
    tag: "Track",
    icon: Inbox,
    tone: "forest",
  },
];

const PUBLIC_FLOW: FlowNode[] = [
  {
    id: "passkey",
    title: "Passkey sign-in",
    detail: "Register WebAuthn — no seed phrase required for daily sends.",
    tag: "WebAuthn",
    icon: Fingerprint,
    tone: "lime",
  },
  {
    id: "account",
    title: "Smart account",
    detail: "EIP-1167 clone deploys once; your account lives onchain.",
    tag: "ERC-4337",
    icon: Sparkles,
    tone: "forest",
  },
  {
    id: "paymaster",
    title: "Sponsored gas",
    detail: "Obscura paymaster covers fees for eligible UserOperations.",
    tag: "Gasless",
    icon: Zap,
    tone: "moss",
  },
  {
    id: "usdc",
    title: "Send USDC",
    detail: "Standard Circle USDC transfer — visible amounts, familiar UX.",
    tag: "USDC",
    icon: CircleDollarSign,
    tone: "deep",
  },
  {
    id: "activity",
    title: "Shared activity",
    detail: "Same contacts and activity feed as Private mode.",
    tag: "Track",
    icon: Activity,
    tone: "forest",
  },
];

const FLOWS: Record<PayFlowMode, FlowNode[]> = {
  private: PRIVATE_FLOW,
  public: PUBLIC_FLOW,
};

export function PayFlowDiagram() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: false, margin: "-15%" });
  const reduceMotion = useReducedMotion();
  const [mode, setMode] = useState<PayFlowMode>("private");
  const [active, setActive] = useState(0);

  const nodes = FLOWS[mode];

  useEffect(() => {
    setActive(0);
  }, [mode]);

  useEffect(() => {
    if (!inView || reduceMotion) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % nodes.length);
    }, 3400);
    return () => window.clearInterval(id);
  }, [inView, reduceMotion, nodes.length]);

  return (
    <div ref={ref} className="pay-flow-diagram">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
            ▸ How Pay works
          </p>
          <p className="mt-1 font-display text-xl tracking-tight md:text-2xl">
            Follow the flow — step by step
          </p>
        </div>

        <div
          className="inline-flex rounded-full border border-border-subtle bg-background p-1"
          role="tablist"
          aria-label="Payment mode"
        >
          {(["private", "public"] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => setMode(m)}
              className={cn(
                "rounded-full px-4 py-2 font-mono text-[10px] uppercase tracking-wider transition-colors",
                mode === m
                  ? "bg-brand text-brand-ink"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mt-8 overflow-hidden rounded-3xl border border-border-subtle bg-background p-6 md:p-10">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          aria-hidden
          style={{
            background:
              "radial-gradient(55% 50% at 50% 40%, hsl(var(--vault-brand) / 0.12), transparent 70%)",
          }}
        />

        {/* Desktop: horizontal pipeline */}
        <div className="relative hidden lg:block">
          <FlowPipeline
            nodes={nodes}
            active={active}
            onSelect={setActive}
            reduceMotion={!!reduceMotion}
          />
        </div>

        {/* Mobile / tablet: vertical */}
        <div className="relative lg:hidden">
          <FlowPipelineVertical
            nodes={nodes}
            active={active}
            onSelect={setActive}
            reduceMotion={!!reduceMotion}
          />
        </div>

        <AnimatePresence mode="wait">
          <motion.div
            key={`${mode}-${active}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className="relative mt-8 rounded-2xl border border-border-subtle bg-surface-elevated px-5 py-4 md:px-6"
          >
            <div className="flex flex-wrap items-center gap-3">
              <FlowStepIcon node={nodes[active]} isActive compact />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-brand">
                Step {String(active + 1).padStart(2, "0")}
              </span>
              {nodes[active].tag ? (
                <span className="rounded-full border border-border-subtle px-2 py-0.5 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  {nodes[active].tag}
                </span>
              ) : null}
            </div>
            <h4 className="mt-2 font-display text-lg tracking-tight md:text-xl">
              {nodes[active].title}
            </h4>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {nodes[active].detail}
            </p>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

function FlowPipeline({
  nodes,
  active,
  onSelect,
  reduceMotion,
}: {
  nodes: FlowNode[];
  active: number;
  onSelect: (i: number) => void;
  reduceMotion: boolean;
}) {
  const n = nodes.length;

  return (
    <div className="relative flex items-start justify-between gap-2">
      {/* Animated connector */}
      <div
        className="pointer-events-none absolute left-[6%] right-[6%] top-[31px] h-0.5 bg-border-subtle"
        aria-hidden
      >
        <motion.div
          className="h-full origin-left bg-brand"
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
        />
        {!reduceMotion ? (
          <motion.div
            className="absolute top-1/2 size-2.5 -translate-y-1/2 rounded-full bg-brand shadow-[0_0_12px_hsl(var(--vault-brand)/0.55)]"
            style={{ left: `${(active / Math.max(n - 1, 1)) * 100}%`, marginLeft: -5 }}
            animate={{ scale: [1, 1.35, 1] }}
            transition={{ duration: 0.65, ease: [0.16, 1, 0.3, 1], scale: { duration: 1.6, repeat: Infinity } }}
          />
        ) : null}
      </div>

      {nodes.map((node, i) => (
        <FlowNodeButton
          key={node.id}
          node={node}
          index={i}
          isActive={active === i}
          onSelect={() => onSelect(i)}
          layout="horizontal"
        />
      ))}
    </div>
  );
}

function FlowPipelineVertical({
  nodes,
  active,
  onSelect,
  reduceMotion,
}: {
  nodes: FlowNode[];
  active: number;
  onSelect: (i: number) => void;
  reduceMotion: boolean;
}) {
  return (
    <div className="relative flex flex-col gap-0">
      {nodes.map((node, i) => (
        <div key={node.id} className="relative flex gap-4">
          <div className="flex flex-col items-center">
            <FlowNodeDot node={node} isActive={active === i} index={i} />
            {i < nodes.length - 1 ? (
              <div className="relative my-1 h-10 w-px bg-border-subtle">
                <motion.div
                  className="absolute inset-x-0 top-0 w-px bg-brand origin-top"
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: active > i ? 1 : active === i ? 0.5 : 0 }}
                  transition={{ duration: 0.5 }}
                  style={{ height: "100%" }}
                />
                {!reduceMotion && active === i ? (
                  <motion.span
                    className="absolute left-1/2 size-2 -translate-x-1/2 rounded-full bg-brand"
                    animate={{ top: ["0%", "100%", "0%"] }}
                    transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          <button
            type="button"
            onClick={() => onSelect(i)}
            className={cn(
              "mb-4 flex flex-1 items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors",
              active === i
                ? "border-brand/35 bg-brand/8"
                : "border-border-subtle bg-surface-elevated",
            )}
          >
            <FlowStepIcon node={node} isActive={active === i} compact />
            <div className="min-w-0">
              <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                {String(i + 1).padStart(2, "0")}
                {node.tag ? ` · ${node.tag}` : ""}
              </span>
              <div className="mt-0.5 text-sm font-medium text-foreground">{node.title}</div>
            </div>
          </button>
        </div>
      ))}
    </div>
  );
}

function FlowNodeButton({
  node,
  index,
  isActive,
  onSelect,
  layout,
}: {
  node: FlowNode;
  index: number;
  isActive: boolean;
  onSelect: () => void;
  layout: "horizontal";
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "relative z-10 flex max-w-[11rem] flex-col items-center text-center",
        layout === "horizontal" && "flex-1",
      )}
    >
      <FlowNodeDot node={node} isActive={isActive} index={index} />
      <span
        className={cn(
          "mt-3 font-mono text-[9px] uppercase tracking-wider",
          isActive ? "text-brand" : "text-muted-foreground",
        )}
      >
        {String(index + 1).padStart(2, "0")}
      </span>
      <span
        className={cn(
          "mt-1 font-display text-sm leading-tight tracking-tight transition-colors md:text-base",
          isActive ? "text-foreground" : "text-muted-foreground/80",
        )}
      >
        {node.title}
      </span>
    </button>
  );
}

function FlowStepIcon({
  node,
  isActive,
  compact = false,
}: {
  node: FlowNode;
  isActive: boolean;
  compact?: boolean;
}) {
  const Icon = node.icon;

  if (isActive) {
    return (
      <ObscuraFeatureIcon
        icon={Icon}
        tone={node.tone}
        size={compact ? "sm" : "md"}
        className="shrink-0"
      />
    );
  }

  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-border-subtle bg-surface-elevated",
        compact ? "size-9" : "size-11",
      )}
      aria-hidden
    >
      <Icon
        className={cn(compact ? "size-4" : "size-5", "text-muted-foreground/75")}
        strokeWidth={1.65}
      />
    </span>
  );
}

function FlowNodeDot({
  node,
  isActive,
  index,
}: {
  node: FlowNode;
  isActive: boolean;
  index: number;
}) {
  return (
    <motion.span
      layout
      className={cn(
        "relative flex shrink-0 items-center justify-center rounded-2xl transition-colors",
        isActive
          ? "size-[4.25rem] border-0 bg-transparent shadow-none"
          : "size-16 border-2 border-border-subtle bg-surface-elevated shadow-sm",
      )}
      animate={
        isActive
          ? {
              scale: [1, 1.05, 1],
            }
          : { scale: 1 }
      }
      transition={
        isActive
          ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 0.3 }
      }
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={isActive ? "active" : "idle"}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ duration: 0.25 }}
          className="flex items-center justify-center"
        >
          <FlowStepIcon node={node} isActive={isActive} />
        </motion.span>
      </AnimatePresence>
      {isActive ? (
        <motion.span
          className="pointer-events-none absolute -inset-1 rounded-2xl border border-brand/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0.35, 0.75, 0.35] }}
          transition={{ duration: 2, repeat: Infinity }}
          aria-hidden
        />
      ) : (
        <span
          className="pointer-events-none absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-md border border-border-subtle bg-background font-mono text-[8px] font-medium text-muted-foreground"
          aria-hidden
        >
          {String(index + 1).padStart(2, "0")}
        </span>
      )}
    </motion.span>
  );
}
