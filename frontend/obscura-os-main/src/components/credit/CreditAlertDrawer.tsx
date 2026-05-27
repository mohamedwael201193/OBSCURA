/**
 * CreditAlertDrawer — bell icon + slide-over panel listing alerts.
 *
 * Categories are color-coded; "Mark all read" + "Clear" + "Enable notifications"
 * controls are inline.
 */
import { Bell, BellOff, ShieldAlert, Gavel, Droplet, TrendingUp, Info, CheckCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useCreditAlerts, type AlertCategory } from "@/hooks/useCreditAlerts";

const CATEGORY: Record<AlertCategory, { icon: React.ElementType; color: string; tint: string }> = {
  liquidation: { icon: ShieldAlert, color: "text-destructive",          tint: "bg-destructive/10 border-destructive/25" },
  auction:     { icon: Gavel,       color: "text-amber-700",            tint: "bg-amber-500/10 border-amber-500/25" },
  faucet:      { icon: Droplet,     color: "text-[hsl(var(--accent))]", tint: "bg-accent/10 border-accent/25" },
  interest:    { icon: TrendingUp,  color: "text-[hsl(var(--success))]", tint: "bg-accent/10 border-accent/25" },
  info:        { icon: Info,        color: "text-muted-foreground",     tint: "bg-muted/50 border-border" },
};

function ago(ts: number): string {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default function CreditAlertDrawer() {
  const [open, setOpen] = useState(false);
  const { alerts, unreadCount, markAllRead, clear, permission, requestPermission } = useCreditAlerts();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative flex h-10 w-10 items-center justify-center rounded-full hairline text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        aria-label={`${unreadCount} unread alerts`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[16px] min-w-[16px] items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-medium text-destructive-foreground">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[88vw] sm:w-[400px] bg-card/95 backdrop-blur-2xl border-l border-border p-0 text-foreground">
          <SheetHeader className="border-b border-border px-5 pb-3 pt-5">
            <SheetTitle className="flex items-center gap-2 font-mono text-sm uppercase tracking-[0.18em] text-muted-foreground">
              <Bell className="w-3.5 h-3.5" /> Alerts
              {unreadCount > 0 && <span className="text-[10px] text-foreground">({unreadCount} new)</span>}
            </SheetTitle>
          </SheetHeader>

          <div className="flex items-center gap-2 border-b border-border px-3 py-3 text-[11px]">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
            >
              <CheckCheck className="w-3 h-3" /> Mark read
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={alerts.length === 0}
              className="inline-flex items-center gap-1 rounded px-2 py-1 text-muted-foreground hover:text-destructive disabled:opacity-30"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
            <div className="ml-auto">
              {permission === "granted" ? (
                <span className="inline-flex items-center gap-1 text-[hsl(var(--success))]">
                  <Bell className="w-3 h-3" /> Browser notifications on
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void requestPermission()}
                  className="inline-flex items-center gap-1 text-foreground hover:opacity-75"
                >
                  <BellOff className="w-3 h-3" /> Enable notifications
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto h-[calc(100vh-130px)] px-3 py-3">
            {alerts.length === 0 ? (
              <div className="mt-8 text-center text-[12px] text-muted-foreground">
                <BellOff className="w-6 h-6 mx-auto mb-2 text-muted-foreground/50" />
                No alerts yet. You'll be notified when your health factor or auctions need attention.
              </div>
            ) : (
              <ul className="grid gap-2">
                {alerts.map((a) => {
                  const c = CATEGORY[a.category];
                  const Icon = c.icon;
                  return (
                    <li
                      key={a.id}
                      className={`rounded-lg border ${c.tint} p-3 ${a.read ? "opacity-60" : ""}`}
                    >
                      <div className="flex items-start gap-2.5">
                        <Icon className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${c.color}`} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className={`text-[12px] font-medium ${c.color}`}>{a.title}</span>
                            <span className="font-mono text-[9.5px] text-muted-foreground">{ago(a.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{a.body}</p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
