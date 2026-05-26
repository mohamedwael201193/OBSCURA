/**
 * PaymentModeContext — global payment mode state.
 *
 * "wallet"  → standard MetaMask / EOA confirmations
 * "smart"   → passkey-signed UserOps via smart account (gasless, biometric)
 *
 * Persisted to localStorage. Auto-downgrades to "wallet" if the smart
 * account is no longer available (passkey removed, account reset, etc.).
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useSmartAccount } from "@/hooks/useSmartAccount";

export type PaymentMode = "wallet" | "smart";

interface PaymentModeContextValue {
  mode: PaymentMode;
  setMode: (m: PaymentMode) => void;
  /** true iff smart account is deployed AND passkey is enrolled */
  isSmartAvailable: boolean;
  isSmartDeployed: boolean;
  isSmartEnrolled: boolean;
  smartAccountAddress: string | null;
  /** True if the last write silently fell back from smart → EOA */
  lastFallback: boolean;
  clearFallback: () => void;
}

const PaymentModeContext = createContext<PaymentModeContextValue>({
  mode: "wallet",
  setMode: () => {},
  isSmartAvailable: false,
  isSmartDeployed: false,
  isSmartEnrolled: false,
  smartAccountAddress: null,
  lastFallback: false,
  clearFallback: () => {},
});

const STORAGE_KEY = "obscura:paymentMode";

export function PaymentModeProvider({ children }: { children: ReactNode }) {
  const { accountAddress, isDeployed, hasPasskey } = useSmartAccount();
  const isSmartAvailable = isDeployed && hasPasskey;

  const [mode, setModeState] = useState<PaymentMode>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored === "smart" ? "smart" : "wallet";
    } catch {
      return "wallet";
    }
  });

  const [lastFallback, setLastFallback] = useState(false);

  // Auto-downgrade to wallet if smart account becomes unavailable
  useEffect(() => {
    if (mode === "smart" && !isSmartAvailable) {
      setModeState("wallet");
    }
  }, [mode, isSmartAvailable]);

  const setMode = useCallback(
    (m: PaymentMode) => {
      if (m === "smart" && !isSmartAvailable) return;
      setModeState(m);
      setLastFallback(false);
      try {
        localStorage.setItem(STORAGE_KEY, m);
      } catch {
        // ignore storage errors
      }
    },
    [isSmartAvailable],
  );

  const clearFallback = useCallback(() => setLastFallback(false), []);

  const value = useMemo<PaymentModeContextValue>(
    () => ({
      mode: isSmartAvailable && mode === "smart" ? "smart" : "wallet",
      setMode,
      isSmartAvailable,
      isSmartDeployed: isDeployed,
      isSmartEnrolled: hasPasskey,
      smartAccountAddress: accountAddress ?? null,
      lastFallback,
      clearFallback,
    }),
    [
      mode,
      setMode,
      isSmartAvailable,
      isDeployed,
      hasPasskey,
      accountAddress,
      lastFallback,
      clearFallback,
    ],
  );

  return (
    <PaymentModeContext.Provider value={value}>
      {children}
    </PaymentModeContext.Provider>
  );
}

export function usePaymentMode() {
  return useContext(PaymentModeContext);
}
