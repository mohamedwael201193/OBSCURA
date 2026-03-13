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
  liquidation: { icon: ShieldAlert, color: "text-red-300",     tint: "bg-red-500/10 border-red-500/30" },
  auction:     { icon: Gavel,       color: "text-amber-300",   tint: "bg-amber-500/10 border-amber-500/30" },
  faucet:      { icon: Droplet,     color: "text-cyan-300",    tint: "bg-cyan-500/10 border-cyan-500/30" },
  interest:    { icon: TrendingUp,  color: "text-violet-300",  tint: "bg-violet-500/10 border-violet-500/30" },
  info:        { icon: Info,        color: "text-white/60",    tint: "bg-white/5 border-white/15" },
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
        className="relative h-9 w-9 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/75 transition-colors"
        aria-label={`${unreadCount} unread alerts`}
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-[9px] text-white font-medium flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-[88vw] sm:w-[400px] bg-[#06090c]/96 backdrop-blur-2xl border-l border-white/10 p-0">
          <SheetHeader className="px-5 pt-5 pb-3 border-b border-white/8">
            <SheetTitle className="text-sm tracking-[0.18em] uppercase text-white/70 font-mono flex items-center gap-2">
              <Bell className="w-3.5 h-3.5" /> Alerts
              {unreadCount > 0 && <span className="text-[10px] text-violet-300">({unreadCount} new)</span>}
            </SheetTitle>
          </SheetHeader>

          <div className="px-3 py-3 flex items-center gap-2 border-b border-white/8 text-[11px]">
            <button
              type="button"
              onClick={markAllRead}
              disabled={unreadCount === 0}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-white/70 hover:text-white disabled:opacity-30"
            >
              <CheckCheck className="w-3 h-3" /> Mark read
            </button>
            <button
              type="button"
              onClick={clear}
              disabled={alerts.length === 0}
              className="inline-flex items-center gap-1 px-2 py-1 rounded text-white/70 hover:text-red-300 disabled:opacity-30"
            >
              <Trash2 className="w-3 h-3" /> Clear
            </button>
            <div className="ml-auto">
              {permission === "granted" ? (
                <span className="inline-flex items-center gap-1 text-[hsl(var(--success))]/80">
                  <Bell className="w-3 h-3" /> Browser notifications on
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => void requestPermission()}
                  className="inline-flex items-center gap-1 text-violet-300 hover:text-violet-200"
                >
                  <BellOff className="w-3 h-3" /> Enable notifications
                </button>
              )}
            </div>
          </div>

          <div className="overflow-y-auto h-[calc(100vh-130px)] px-3 py-3">
            {alerts.length === 0 ? (
              <div className="mt-8 text-center text-[12px] text-white/40">
                <BellOff className="w-6 h-6 mx-auto mb-2 text-white/20" />
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
                            <span className="text-[9.5px] text-white/40 font-mono">{ago(a.createdAt)}</span>
                          </div>
                          <p className="mt-0.5 text-[11px] text-white/65 leading-snug">{a.body}</p>
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
