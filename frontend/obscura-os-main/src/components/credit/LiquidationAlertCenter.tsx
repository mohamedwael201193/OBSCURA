/**
 * LiquidationAlertCenter — invisible mount-component that:
 *   1. Subscribes to useCreditAlerts (which subscribes to useHealthEngine)
 *   2. Prompts for Notification permission once if the user has debt
 *   3. Renders a non-blocking inline banner during "critical" state
 *
 * Most rendering is delegated to CreditAlertDrawer — this component is the
 * "side effect runner" plus the one-time permission gate.
 */
import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ShieldAlert, X } from "lucide-react";
import { useCreditAlerts } from "@/hooks/useCreditAlerts";
import { useHealthEngine } from "@/hooks/useHealthEngine";
import { useState } from "react";

const PERMISSION_PROMPT_KEY = "obscura:credit:notif-prompted-v1";

export default function LiquidationAlertCenter() {
  const { permission, requestPermission } = useCreditAlerts();
  const { hasDebt, aggregateSeverity, worstMarket, worstHF } = useHealthEngine();
  const promptedRef = useRef(false);
  const [criticalDismissed, setCriticalDismissed] = useState(false);

  // One-time permission prompt when user actually has debt
  useEffect(() => {
    if (!hasDebt || promptedRef.current) return;
    if (permission !== "default") { promptedRef.current = true; return; }
    try {
      if (localStorage.getItem(PERMISSION_PROMPT_KEY) === "1") {
        promptedRef.current = true;
        return;
      }
    } catch { /* */ }
    // defer slightly to avoid a permission popup while the page is still loading
    const id = setTimeout(() => {
      void requestPermission();
      try { localStorage.setItem(PERMISSION_PROMPT_KEY, "1"); } catch { /* */ }
      promptedRef.current = true;
    }, 4000);
    return () => clearTimeout(id);
  }, [hasDebt, permission, requestPermission]);

  // Reset dismissal whenever severity changes
  useEffect(() => {
    setCriticalDismissed(false);
  }, [aggregateSeverity]);

  if (aggregateSeverity !== "critical" || criticalDismissed) return null;
  const hfText = worstHF === null ? "—" : worstHF.toFixed(2);

  return (
    <AnimatePresence>
      <motion.div
        key="liq-banner"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="fixed bottom-16 lg:bottom-4 inset-x-3 lg:inset-x-auto lg:right-4 lg:max-w-sm z-40"
      >
        <div className="rounded-xl border border-red-500/50 bg-red-500/15 backdrop-blur-xl p-3 flex items-start gap-3 shadow-2xl shadow-red-500/20">
          <div className="w-8 h-8 rounded-lg bg-red-500/25 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-red-200" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11.5px] tracking-[0.12em] uppercase font-mono text-red-200">Liquidation imminent</div>
            <p className="mt-0.5 text-[11.5px] text-red-100/90 leading-snug">
              HF {hfText}{worstMarket && ` · ${worstMarket.market.label}`}. Repay or add collateral now.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCriticalDismissed(true)}
            className="text-red-200/80 hover:text-white flex-shrink-0"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
