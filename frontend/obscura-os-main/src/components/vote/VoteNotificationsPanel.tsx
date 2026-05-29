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

export function VoteNotificationsPanel({ embedded = false }: { embedded?: boolean }) {
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

  const body = (
    <div className="space-y-5 text-sm">
        <div className="rounded-xl border border-border bg-white p-4">
          <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground mb-3">Alert status</p>
          <div className="grid grid-cols-[1fr_auto] gap-y-3 text-sm">
            <span className="text-muted-foreground">Push alerts</span>
            <span className="font-medium text-foreground">{isLoading ? "…" : prefs?.push_enabled ? "Enabled" : "Off"}</span>
            <span className="text-muted-foreground">Browser permission</span>
            <span className="font-medium capitalize text-foreground">{permission}</span>
            <span className="text-muted-foreground">Service worker</span>
            <span className="font-medium text-foreground">{serviceWorkerReady ? "Ready" : "Starting"}</span>
            <span className="text-muted-foreground">Vote events</span>
            <span className="font-medium text-foreground">{voteEventsEnabled ? "Enabled" : "Custom"}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("enable", enable)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
          >
            {busy === "enable" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
            Enable push
          </button>
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("vote", focusVoteEvents)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-foreground px-4 text-sm font-semibold text-background disabled:opacity-50"
          >
            {busy === "vote" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            Save Vote alerts
          </button>
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("repair", repair)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
          >
            {busy === "repair" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
            Repair browser
          </button>
          <button
            type="button"
            disabled={!pushSupported || busy !== null}
            onClick={() => void run("test", testPush)}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground hover:bg-muted/40 disabled:opacity-50"
          >
            {busy === "test" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <BellRing className="h-3.5 w-3.5" />}
            Test push
          </button>
        </div>

        <details className="rounded-xl border border-border bg-white px-4 py-3">
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
  );

  if (embedded) return body;

  return (
    <VoteHarmonyPanelCard title="Vote notifications" eyebrow="Shared alerts">
      {body}
    </VoteHarmonyPanelCard>
  );
}