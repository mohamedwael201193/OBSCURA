/**
 * ReceivablesHub — unified Receivables tab.
 *
 * Surfaces four capabilities in a single, scrollable view:
 *   1. Active subscriptions (subscriber side) + upcoming debits
 *   2. New recurring payment (SubscriptionForm)
 *   3. Coverage + Policies (BuyCoverageForm + MyPolicies)
 *   4. Dispute + LP stake (DisputeForm + StakePoolForm)
 *
 * All sections use Harmony design primitives (hairline borders, bg-card).
 * No dark-glass patterns, no technical FHE jargon in copy.
 */
import { useState } from "react";
import {
  ArrowDownLeft,
  Calendar,
  ChevronDown,
  ChevronRight,
  Landmark,
  RefreshCw,
  Repeat,
  Shield,
  Wallet,
} from "lucide-react";
import { useInsuranceSubscription } from "@/hooks/useInsuranceSubscription";
import SubscriptionForm from "@/components/pay-v4/SubscriptionForm";
import BuyCoverageForm from "@/components/pay-v4/BuyCoverageForm";
import MyPolicies from "@/components/pay-v4/MyPolicies";
import DisputeForm from "@/components/pay-v4/DisputeForm";
import StakePoolForm from "@/components/pay-v4/StakePoolForm";

interface Props {
  onNavigate: (tab: string) => void;
}

type Section = "subscriptions" | "new-subscription" | "coverage" | "dispute";

function SectionCard({
  id,
  icon: Icon,
  title,
  description,
  open,
  onToggle,
  children,
}: {
  id: Section;
  icon: React.ElementType;
  title: string;
  description: string;
  open: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl hairline bg-card overflow-hidden">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between p-6 text-left"
      >
        <div className="flex items-center gap-4">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-muted">
            <Icon className="h-4 w-4 text-muted-foreground" />
          </span>
          <div>
            <p className="font-display text-lg">{title}</p>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
        )}
      </button>
      {open && <div className="border-t border-border px-6 pb-6 pt-5">{children}</div>}
    </div>
  );
}

function SubscriptionsPanel({ onNavigate }: { onNavigate: (tab: string) => void }) {
  const { subscriptions, isLoading, refresh } = useInsuranceSubscription();
  const active = subscriptions.filter((s) => s.active);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {isLoading
            ? "Loading subscriptions..."
            : active.length === 0
              ? "No active subscriptions"
              : `${active.length} active subscription${active.length !== 1 ? "s" : ""}`}
        </p>
        <button
          type="button"
          onClick={() => refresh()}
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-muted text-muted-foreground transition-colors"
          aria-label="Refresh subscriptions"
        >
          <RefreshCw className="h-3.5 w-3.5" />
        </button>
      </div>

      {active.length === 0 && !isLoading ? (
        <div className="rounded-xl hairline bg-muted/40 px-5 py-8 text-center">
          <Repeat className="mx-auto h-8 w-8 text-muted-foreground/30" />
          <p className="mt-3 text-sm text-muted-foreground">No recurring payments set up yet.</p>
          <p className="mt-1 text-xs text-muted-foreground/60">
            Create one below to automate subscriptions, payroll, or recurring transfers.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {active.map((sub) => {
            const lastDate =
              sub.lastConsumedAt > 0n
                ? new Date(Number(sub.lastConsumedAt) * 1000).toLocaleDateString()
                : "Never";
            const progress =
              sub.maxCycles > 0n
                ? Math.round((Number(sub.cyclesConsumed) / Number(sub.maxCycles)) * 100)
                : 0;
            return (
              <li key={String(sub.subId)} className="py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium">
                      Sub #{String(sub.subId)} — Stream #{String(sub.streamId)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {String(sub.cyclesConsumed)} / {String(sub.maxCycles)} cycles · Last:{" "}
                      {lastDate}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider ${
                      sub.active
                        ? "bg-[hsl(var(--success))]/10 text-[hsl(var(--success))]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {sub.active ? "Active" : "Inactive"}
                  </span>
                </div>
                {sub.maxCycles > 0n && (
                  <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-accent transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="pt-2 text-center">
        <button
          type="button"
          onClick={() => onNavigate("streams")}
          className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors"
        >
          <Calendar className="h-3.5 w-3.5" /> View streams ?
        </button>
      </div>
    </div>
  );
}

export default function ReceivablesHub({ onNavigate }: Props) {
  const [open, setOpen] = useState<Section | null>("subscriptions");

  const toggle = (id: Section) => setOpen((cur) => (cur === id ? null : id));

  return (
    <div className="space-y-4">
      {/* -- 1. Active subscriptions -------------------------------- */}
      <SectionCard
        id="subscriptions"
        icon={Repeat}
        title="Recurring payments"
        description="Subscriptions you've set up. Track cycles and upcoming debits."
        open={open === "subscriptions"}
        onToggle={() => toggle("subscriptions")}
      >
        <SubscriptionsPanel onNavigate={onNavigate} />
      </SectionCard>

      {/* -- 2. New recurring payment ------------------------------- */}
      <SectionCard
        id="new-subscription"
        icon={ArrowDownLeft}
        title="New recurring payment"
        description="Automate payroll, subscriptions, or any periodic transfer."
        open={open === "new-subscription"}
        onToggle={() => toggle("new-subscription")}
      >
        <SubscriptionForm />
      </SectionCard>

      {/* -- 3. Coverage + policies --------------------------------- */}
      <SectionCard
        id="coverage"
        icon={Shield}
        title="Coverage & policies"
        description="Buy coverage for a stream. View and manage your active policies."
        open={open === "coverage"}
        onToggle={() => toggle("coverage")}
      >
        <div className="space-y-6">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Buy coverage
            </p>
            <BuyCoverageForm />
          </div>
          <div className="border-t border-border pt-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Active policies
            </p>
            <MyPolicies />
          </div>
        </div>
      </SectionCard>

      {/* -- 4. Dispute + LP stake ----------------------------------- */}
      <SectionCard
        id="dispute"
        icon={Landmark}
        title="Dispute & liquidity"
        description="File a dispute on a missed payment or provide liquidity to earn yield."
        open={open === "dispute"}
        onToggle={() => toggle("dispute")}
      >
        <div className="space-y-6">
          <div>
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              File a dispute
            </p>
            <DisputeForm />
          </div>
          <div className="border-t border-border pt-5">
            <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              Provide liquidity
            </p>
            <StakePoolForm />
          </div>
        </div>
      </SectionCard>
    </div>
  );
}
