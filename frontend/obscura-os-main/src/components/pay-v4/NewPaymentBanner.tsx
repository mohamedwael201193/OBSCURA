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

  // Browser push: when the page is hidden and a brand-new payment appears,
  // post a system notification once per item id.
  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (count === 0) return;
    if (Notification.permission === "default") {
      // Request once; if user denies we silently fall back to in-page banner.
      void Notification.requestPermission();
      return;
    }
    if (Notification.permission !== "granted") return;
    if (typeof document !== "undefined" && !document.hidden) return; // only when tab hidden
    for (const item of visibleItems) {
      if (notifiedRef.current.has(item.id)) continue;
      notifiedRef.current.add(item.id);
      try {
        new Notification("Obscura — new private payment", {
          body: "You have a new encrypted payment waiting in your stealth inbox.",
          tag: item.id,
          icon: "/favicon.ico",
        });
      } catch {
        /* silent */
      }
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
          className="mb-4 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/[0.08] to-cyan-500/[0.04] px-4 py-3"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Bell className="w-4 h-4 text-emerald-300" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-display text-[13.5px] font-semibold text-emerald-100">
              {count === 1
                ? "You have 1 new private payment waiting"
                : `You have ${count} new private payments waiting`}
            </div>
            <div className="text-[11.5px] text-emerald-200/70 mt-0.5">
              Sweep them into your encrypted balance from the Receive tab.
            </div>
          </div>
          <button
            onClick={onOpenInbox}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-black font-display font-semibold text-[12px] transition-colors"
          >
            Open inbox <ArrowRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={dismissAll}
            title="Dismiss"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-emerald-300/60 hover:text-emerald-200 hover:bg-white/[0.05] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
