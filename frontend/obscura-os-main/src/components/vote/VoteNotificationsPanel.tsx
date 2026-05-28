import { useState } from "react";
import { Bell, BellRing, CheckCircle, Loader2, ShieldCheck, Wrench } from "lucide-react";
import { VoteHarmonyPanelCard } from "@/components/harmony/VoteHarmonyTabShell";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";

const VOTE_NOTIFICATION_TYPES = [
  "vote.*",
  "vote.cast",
  "vote.changed",
  "vote.finalized",
  "governor.*",
  "governor.vote_cast",
];

type BusyAction = "enable" | "repair" | "test" | "vote" | null;

export function VoteNotificationsPanel() {
  const { prefs, isLoading, pushSupported, permission, serviceWorkerReady, enable, repair, testPush, savePrefs } = useNotificationPrefs();
  const [busy, setBusy] = useState<BusyAction>(null);
  const [message, setMessage] = useState<string | null>(null);

  const voteEventsEnabled = !!prefs?.events?.includes("*") || VOTE_NOTIFICATION_TYPES.some((event) => prefs?.events?.includes(event));

  const run = async (
    kind: Exclude<BusyAction, null>,
    action: () => Promise<void | { sent: number; attempted: number; displayed: boolean }>,
  ) => {
    setBusy(kind);
    setMessage(null);
    try {
      const result = await action();
      if (kind === "test" && result && "attempted" in result) {
        setMessage(result.displayed ? `Browser displayed. Server sent ${result.sent}/${result.attempted}.` : `Server sent ${result.sent}/${result.attempted}.`);
      } else if (kind === "vote") {
        setMessage("Vote notification types saved.");
      } else {
        setMessage("Notification setup updated.");
      }
    } catch (error) {
      setMessage((error as Error).message || "Notification update failed.");
    } finally {
      setBusy(null);
    }
  };

  const focusVoteEvents = async () => {
    const existing = prefs?.events?.filter((event) => event !== "*" && !event.startsWith("vote.") && !event.startsWith("governor.")) ?? [];
    await savePrefs({ events: [...existing, ...VOTE_NOTIFICATION_TYPES] });
  };

  return (
    <VoteHarmonyPanelCard title="Vote notifications" eyebrow="Shared alerts">
      <div className="space-y-4 text-sm">
        <div className="grid grid-cols-[1fr_auto] gap-y-2 text-xs text-muted-foreground">
          <span>Push alerts</span>
          <span className="font-mono text-foreground/70">{isLoading ? "loading" : prefs?.push_enabled ? "enabled" : "off"}</span>
          <span>Browser permission</span>
          <span className="font-mono text-foreground/70">{permission}</span>
          <span>Service worker</span>
          <span className="font-mono text-foreground/70">{serviceWorkerReady ? "ready" : "starting"}</span>
          <span>Vote event types</span>
          <span className="font-mono text-foreground/70">{voteEventsEnabled ? "enabled" : "custom"}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("enable", enable)}
            className="btn-pay btn-pay-ghost justify-center disabled:opacity-50"
          >
            {busy === "enable" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
            Enable push
          </button>
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("vote", focusVoteEvents)}
            className="btn-pay btn-pay-ghost justify-center disabled:opacity-50"
          >
            {busy === "vote" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Save Vote alerts
          </button>
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("repair", repair)}
            className="btn-pay btn-pay-ghost justify-center disabled:opacity-50"
          >
            {busy === "repair" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
            Repair browser
          </button>
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("test", testPush)}
            className="btn-pay btn-pay-ghost justify-center disabled:opacity-50"
          >
            {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
            Test push
          </button>
        </div>

        <details className="rounded-xl border border-border/60 bg-muted/30 px-3 py-2">
          <summary className="cursor-pointer select-none text-xs text-muted-foreground hover:text-foreground">
            Vote alert categories
          </summary>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VOTE_NOTIFICATION_TYPES.map((event) => (
              <span key={event} className="rounded-full bg-card px-2 py-1 font-mono text-[10px] text-muted-foreground">
                {event}
              </span>
            ))}
          </div>
        </details>

        <p className="text-xs text-muted-foreground">
          Vote alerts use the shared activity and push dispatcher. Messages stay generic and never include the option you chose.
        </p>
        {message && (
          <p className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
            <CheckCircle className="h-3.5 w-3.5 text-foreground" /> {message}
          </p>
        )}
      </div>
    </VoteHarmonyPanelCard>
  );
}