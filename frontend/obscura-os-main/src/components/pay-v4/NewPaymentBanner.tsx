import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, ArrowRight, X } from "lucide-react";
import { useStealthInbox } from "@/hooks/useStealthInbox";
import { useAccount } from "wagmi";

const DISMISS_KEY = "obscura.inbox.banner-dismiss-ids.v1";

/**
 * NewPaymentBanner — Phase A3 visibility gap fix.
 *
 * Renders a high-visibility "you have N new private payments" banner at
 * the top of the Pay page whenever the stealth inbox surfaces unclaimed
 * items the user has not yet dismissed.
 *
 * Also opportunistically requests the browser Notification permission
 * the first time payments arrive and posts a system notification when
 * the tab is hidden (so a recipient learns about a payment even if
 * they're in another tab).
 *
 * Dismissals are per-item (id = txHash-stealthAddress) and persisted to
 * localStorage so a banner does not re-appear after the user has already
 * actioned it.
 */
export default function NewPaymentBanner({ onOpenInbox }: { onOpenInbox: () => void }) {
  const { address } = useAccount();
  const inbox = useStealthInbox();
  const [dismissed, setDismissed] = useState<Record<string, true>>({});
  const notifiedRef = useRef<Set<string>>(new Set());

  // Load dismissal state per-address.
  useEffect(() => {
    if (!address) {
      setDismissed({});
      return;
    }
    try {
      const raw = localStorage.getItem(`${DISMISS_KEY}:${address.toLowerCase()}`);
      setDismissed(raw ? JSON.parse(raw) : {});
    } catch {
      setDismissed({});
    }
  }, [address]);

  const persistDismissed = (next: Record<string, true>) => {
    setDismissed(next);
    if (!address) return;
    try {
      localStorage.setItem(`${DISMISS_KEY}:${address.toLowerCase()}`, JSON.stringify(next));
    } catch {
      /* silent */
    }
  };

  // Items that are unclaimed AND not previously dismissed by this user.
  const visibleItems = inbox.items.filter(
    (i) => !i.claimed && i.amount > 0n && !dismissed[i.id]
  );
  const count = visibleItems.length;

  // Browser notification: when the page is hidden and a brand-new payment
  // appears, show a system notification once per item id if permission was
  // already granted from Settings. This never prompts automatically.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window) || !("serviceWorker" in navigator)) return;
    if (count === 0) return;
    if (Notification.permission !== "granted") return;
    if (typeof document !== "undefined" && !document.hidden) return; // only when tab hidden
    for (const item of visibleItems) {
      if (notifiedRef.current.has(item.id)) continue;
      notifiedRef.current.add(item.id);
      void navigator.serviceWorker.ready.then((registration) => {
        void registration.showNotification("Obscura - new private payment", {
          body: "You have a new encrypted payment waiting in your stealth inbox.",
          tag: item.id,
          icon: "/favicon.ico",
          badge: "/favicon.ico",
          data: { url: `${window.location.origin}/pay?tab=getpaid&sub=inbox` },
        });
      }).catch(() => undefined);
    }
  }, [count, visibleItems]);

  const dismissAll = () => {
    const next: Record<string, true> = { ...dismissed };
    for (const i of visibleItems) next[i.id] = true;
    persistDismissed(next);
  };

  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.25 }}
          className="mb-4 flex items-center gap-3 rounded-2xl hairline bg-accent/10 px-4 py-3"
        >
          <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-card hairline">
            <Bell className="h-4 w-4 text-foreground" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="font-display text-base text-foreground">
              {count === 1
                ? "You have 1 new private payment waiting"
                : `You have ${count} new private payments waiting`}
            </div>
            <div className="mt-0.5 text-sm text-muted-foreground">
              Sweep them into your encrypted balance from the Receive tab.
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenInbox}
            className="btn-pay btn-pay-emerald shrink-0 text-sm"
          >
            Open inbox <ArrowRight className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={dismissAll}
            title="Dismiss"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full hairline text-muted-foreground hover:bg-muted"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
