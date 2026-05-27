/**
 * PaymentModeContext — global Pay privacy mode state.
 *
 * "public"  → public USDC, smart account, passkey UserOps, sponsored gas
 * "private" → ocUSDC, encrypted FHE flows, wallet execution
 *
 * The legacy `mode` field remains for older hooks:
 *   - Public Mode resolves to "smart" only when the smart account is ready.
 *   - Private Mode always resolves to "wallet" so FHE writes never route
 *     encrypted inputs through ERC-4337.
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
import { resolvePaymentExecutionMode } from "@/lib/payExecutionPolicy";

export type PaymentMode = "wallet" | "smart";
export type PayPrivacyMode = "public" | "private";

interface PaymentModeContextValue {
  privacyMode: PayPrivacyMode;
  setPrivacyMode: (m: PayPrivacyMode) => void;
  isPublicMode: boolean;
  isPrivateMode: boolean;
  activeToken: "USDC" | "ocUSDC";
  executionLabel: string;
  modeSummary: string;
  /** Legacy execution mode for older hooks. */
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
  privacyMode: "private",
  setPrivacyMode: () => {},
  isPublicMode: false,
  isPrivateMode: true,
  activeToken: "ocUSDC",
  executionLabel: "Wallet secured",
  modeSummary: "Encrypted, hidden, wallet-secured",
  mode: "wallet",
  setMode: () => {},
  isSmartAvailable: false,
  isSmartDeployed: false,
  isSmartEnrolled: false,
  smartAccountAddress: null,
  lastFallback: false,
  clearFallback: () => {},
});

const PRIVACY_STORAGE_KEY = "obscura:payPrivacyMode";
const LEGACY_STORAGE_KEY = "obscura:paymentMode";

export function PaymentModeProvider({ children }: { children: ReactNode }) {
  const { accountAddress, isDeployed, hasPasskey } = useSmartAccount();
  const isSmartAvailable = isDeployed && hasPasskey;

  const [privacyMode, setPrivacyModeState] = useState<PayPrivacyMode>(() => {
    try {
      const stored = localStorage.getItem(PRIVACY_STORAGE_KEY);
      if (stored === "public" || stored === "private") return stored;

      return "private";
    } catch {
      return "private";
    }
  });

  const [lastFallback, setLastFallback] = useState(false);

  const effectiveMode: PaymentMode = resolvePaymentExecutionMode(privacyMode, isSmartAvailable);

  useEffect(() => {
    try {
      localStorage.setItem(PRIVACY_STORAGE_KEY, privacyMode);
      localStorage.setItem(LEGACY_STORAGE_KEY, effectiveMode);
    } catch {
      // ignore storage errors
    }
  }, [privacyMode, effectiveMode]);

  const setPrivacyMode = useCallback((m: PayPrivacyMode) => {
    setPrivacyModeState(m);
    setLastFallback(false);
  }, []);

  const setMode = useCallback(
    (m: PaymentMode) => {
      if (m === "smart") {
        if (!isSmartAvailable) return;
        setPrivacyModeState("public");
      } else {
        setPrivacyModeState("private");
      }
      setLastFallback(false);
    },
    [isSmartAvailable],
  );

  const clearFallback = useCallback(() => setLastFallback(false), []);

  const value = useMemo<PaymentModeContextValue>(
    () => ({
      privacyMode,
      setPrivacyMode,
      isPublicMode: privacyMode === "public",
      isPrivateMode: privacyMode === "private",
      activeToken: privacyMode === "public" ? "USDC" : "ocUSDC",
      executionLabel:
        privacyMode === "public"
          ? isSmartAvailable
            ? "Passkey smart account"
            : "Passkey setup needed"
          : "Wallet secured",
      modeSummary:
        privacyMode === "public"
          ? "Fast, gasless, passkey"
          : "Encrypted, hidden, wallet-secured",
      mode: effectiveMode,
      setMode,
      isSmartAvailable,
      isSmartDeployed: isDeployed,
      isSmartEnrolled: hasPasskey,
      smartAccountAddress: accountAddress ?? null,
      lastFallback,
      clearFallback,
    }),
    [
      privacyMode,
      setPrivacyMode,
      effectiveMode,
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
