/**
 * PreferencesContext — global UX prefs (Beginner/Advanced mode, gas mode,
 * default send mode, auto-rotate stealth, etc.) persisted to localStorage.
 *
 * Persisted at `obscura.preferences.v1` (NOT wallet-scoped — these are UX
 * choices, not security state). Mounting `<PreferencesProvider>` once in
 * `App.tsx` lets every screen subscribe via `usePreferences()`.
 */
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "obscura.preferences.v1";

export type UIMode = "beginner" | "advanced";
export type SendMode = "direct" | "stealth" | "cross-chain";
export type GasMode = "fast" | "standard" | "eco";

export interface Preferences {
  uiMode: UIMode;
  defaultSendMode: SendMode;
  gasMode: GasMode;
  stealthAutoRotateDays: number; // 0 = off
  hasCompletedOnboarding: boolean;
}

const DEFAULTS: Preferences = {
  uiMode: "beginner",
  defaultSendMode: "stealth",
  gasMode: "standard",
  stealthAutoRotateDays: 0,
  hasCompletedOnboarding: false,
};

interface PrefsCtx extends Preferences {
  setPreference<K extends keyof Preferences>(key: K, value: Preferences[K]): void;
  setMany(patch: Partial<Preferences>): void;
  reset(): void;
}

const Ctx = createContext<PrefsCtx | null>(null);

function load(): Preferences {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) as Partial<Preferences>) };
  } catch {
    return DEFAULTS;
  }
}

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [prefs, setPrefs] = useState<Preferences>(() => load());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    } catch {
      // storage quota / disabled — silently ignore
    }
  }, [prefs]);

  const value = useMemo<PrefsCtx>(
    () => ({
      ...prefs,
      setPreference: (key, val) => setPrefs((p) => ({ ...p, [key]: val })),
      setMany: (patch) => setPrefs((p) => ({ ...p, ...patch })),
      reset: () => setPrefs(DEFAULTS),
    }),
    [prefs]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function usePreferences(): PrefsCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return v;
}
