import { Award, Lock, TrendingUp } from "lucide-react";
import { useAccount } from "wagmi";
import { HarmonyFormCard } from "@/components/harmony/harmony-ui";
import { useReputationSummary } from "@/hooks/useReputationSummary";

const TIER_LABEL: Record<string, string> = {
  new: "New",
  active: "Active",
  steady: "Steady",
  reliable: "Reliable",
};

export function ReputationSignalsPanel() {
  const { isConnected } = useAccount();
  const { summary, isLoading, error } = useReputationSummary();
  const signals = Object.entries(summary?.signals ?? {}).sort(([, left], [, right]) => right.cappedWeight - left.cappedWeight);

  return (
    <HarmonyFormCard title="Pay reputation" eyebrow="Shared signals">
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-3">
          <div className="rounded-xl hairline bg-muted/35 px-3 py-2.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/55">
              <Award className="h-3.5 w-3.5" /> Tier
            </div>
            <div className="mt-1 text-[18px] font-semibold text-foreground">
              {isLoading ? "..." : TIER_LABEL[summary?.tier ?? "new"]}
            </div>
          </div>
          <div className="rounded-xl hairline bg-muted/35 px-3 py-2.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/55">
              <TrendingUp className="h-3.5 w-3.5" /> Score
            </div>
            <div className="mt-1 text-[18px] font-semibold text-foreground">
              {isLoading ? "..." : summary?.totalCappedWeight ?? 0}
            </div>
          </div>
          <div className="rounded-xl hairline bg-muted/35 px-3 py-2.5">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground/55">
              <Lock className="h-3.5 w-3.5" /> Privacy
            </div>
            <div className="mt-1 text-[12px] font-medium text-foreground/80">No amounts or notes</div>
          </div>
        </div>

        {!isConnected && (
          <div className="rounded-xl hairline bg-muted/25 px-3 py-2 text-[12px] text-muted-foreground/65">
            Connect a wallet to view aggregate Pay signals.
          </div>
        )}

        {error && isConnected && (
          <div className="rounded-xl hairline bg-muted/25 px-3 py-2 text-[12px] text-muted-foreground/65">
            Reputation summary unavailable.
          </div>
        )}

        {isConnected && !isLoading && !error && signals.length === 0 && (
          <div className="rounded-xl hairline bg-muted/25 px-3 py-2 text-[12px] text-muted-foreground/65">
            No completed Pay signals yet.
          </div>
        )}

        {signals.length > 0 && (
          <div className="grid gap-2 sm:grid-cols-2">
            {signals.slice(0, 6).map(([signalType, signal]) => (
              <div key={signalType} className="rounded-xl hairline bg-background/60 px-3 py-2">
                <div className="text-[12px] font-medium text-foreground/85 truncate">{signal.label}</div>
                <div className="mt-1 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-muted-foreground/55">
                  <span>{signal.count} events</span>
                  <span>{signal.cappedWeight} pts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </HarmonyFormCard>
  );
}