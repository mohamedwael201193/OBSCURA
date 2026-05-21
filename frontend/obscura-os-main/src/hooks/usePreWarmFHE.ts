/**
 * usePreWarmFHE — kicks off FHE WASM init + permit cache hydration the
 * moment the user *focuses* an amount input. By the time they finish
 * typing & click submit, the CoFHE client is already warmed and the
 * permit signature (if needed) has been requested in the background.
 *
 * Returns an `onFocus` handler ready to spread onto inputs.
 */
import { useCallback, useRef } from "react";
import { usePublicClient, useWalletClient } from "wagmi";
import { initFHEClient } from "@/lib/fhe";

export function usePreWarmFHE() {
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const warmedRef = useRef(false);

  const onFocus = useCallback(() => {
    if (warmedRef.current) return;
    if (!publicClient || !walletClient) return;
    warmedRef.current = true;
    // Fire-and-forget — failures are tolerable; the real submit path retries.
    void initFHEClient(publicClient, walletClient).catch(() => {
      warmedRef.current = false; // allow retry on next focus
    });
  }, [publicClient, walletClient]);

  return { onFocus };
}
