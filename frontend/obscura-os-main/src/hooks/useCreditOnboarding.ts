/**
 * useCreditOnboarding — first-visit detection + persistent dismissal.
 *
 * Stored in localStorage so the user only sees the onboarding modal on
 * the first credit-page visit. Reset via `reset()` for testing.
 */
import { useCallback, useEffect, useState } from "react";

const KEY = "obscura-credit-onboarded-v1";

export function useCreditOnboarding() {
  const [completed, setCompleted] = useState<boolean>(() => {
    try { return localStorage.getItem(KEY) === "1"; } catch { return true; }
  });
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!completed) {
      // Defer slightly so the page paints first
      const id = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(id);
    }
  }, [completed]);

  const complete = useCallback(() => {
    try { localStorage.setItem(KEY, "1"); } catch { /* */ }
    setCompleted(true);
    setOpen(false);
  }, []);

  const reset = useCallback(() => {
    try { localStorage.removeItem(KEY); } catch { /* */ }
    setCompleted(false);
    setOpen(true);
  }, []);

  const dismiss = useCallback(() => setOpen(false), []);
  const launch  = useCallback(() => setOpen(true), []);

  return { open, completed, complete, reset, dismiss, launch };
}
