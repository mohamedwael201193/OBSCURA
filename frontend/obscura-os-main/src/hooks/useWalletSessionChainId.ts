import { useEffect, useState } from "react";
import { useAccount, useChainId } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";

export const ARBITRUM_SEPOLIA_CHAIN_ID = arbitrumSepolia.id;

type ProviderLike = {
  request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
  on?: (event: string, handler: (...args: unknown[]) => void) => void;
  removeListener?: (event: string, handler: (...args: unknown[]) => void) => void;
};

async function readProviderChainId(provider: ProviderLike): Promise<number | null> {
  const hex = await provider.request({ method: "eth_chainId" });
  return typeof hex === "string" ? Number(hex) : null;
}

/**
 * Chain id from the active wallet session (WalletConnect / injected),
 * not wagmi's persisted config chain. Prevents false "Arb Sepolia" UI when
 * the phone wallet is still on another network.
 */
export function useWalletSessionChainId(): number | undefined {
  const { chainId: accountChainId, isConnected, connector } = useAccount();
  const configChainId = useChainId();
  const [providerChainId, setProviderChainId] = useState<number | null>(null);

  useEffect(() => {
    if (!isConnected || !connector) {
      setProviderChainId(null);
      return;
    }

    let mounted = true;
    let providerRef: ProviderLike | null = null;

    const sync = async () => {
      try {
        const provider = (await connector.getProvider()) as ProviderLike | null;
        providerRef = provider;
        if (!provider?.request) {
          if (mounted) setProviderChainId(null);
          return;
        }
        const next = await readProviderChainId(provider);
        if (mounted && next != null) setProviderChainId(next);
      } catch {
        if (mounted) setProviderChainId(null);
      }
    };

    const onChainChanged = (nextChainId: unknown) => {
      if (typeof nextChainId === "string") setProviderChainId(Number(nextChainId));
    };

    void sync();
    providerRef?.on?.("chainChanged", onChainChanged);

    return () => {
      mounted = false;
      providerRef?.removeListener?.("chainChanged", onChainChanged);
    };
  }, [isConnected, connector, accountChainId]);

  if (!isConnected) return undefined;
  return providerChainId ?? accountChainId ?? configChainId;
}

export function useIsArbitrumSepolia() {
  const sessionChainId = useWalletSessionChainId();
  return {
    sessionChainId,
    isCorrectNetwork: sessionChainId === ARBITRUM_SEPOLIA_CHAIN_ID,
    isWrongNetwork: sessionChainId != null && sessionChainId !== ARBITRUM_SEPOLIA_CHAIN_ID,
  };
}
