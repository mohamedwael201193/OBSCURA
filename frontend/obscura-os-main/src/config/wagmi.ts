import { createConfig, http, fallback } from 'wagmi';
import { arbitrumSepolia, sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

/**
 * Multi-endpoint fallback for Arbitrum Sepolia.
 *
 * The official `sepolia-rollup.arbitrum.io/rpc` endpoint enforces a strict
 * per-IP rate limit and frequently 429s under load. We rank a pool of public
 * RPCs and fail over automatically; viem will retry the next provider on
 * 429 / network errors. Custom URL via VITE_ARBITRUM_SEPOLIA_RPC takes priority.
 */
const customArbRpc = (import.meta as { env?: Record<string, string> }).env?.VITE_ARBITRUM_SEPOLIA_RPC;

const arbSepoliaTransports = [
  ...(customArbRpc ? [http(customArbRpc, { batch: true, retryCount: 3, timeout: 15_000 })] : []),
  http('https://arbitrum-sepolia.gateway.tenderly.co', { batch: true, retryCount: 2, timeout: 15_000 }),
  http('https://arbitrum-sepolia-rpc.publicnode.com', { batch: true, retryCount: 2, timeout: 15_000 }),
  http('https://arbitrum-sepolia.drpc.org', { batch: true, retryCount: 2, timeout: 15_000 }),
  http('https://endpoints.omniatech.io/v1/arbitrum/sepolia/public', { batch: true, retryCount: 2, timeout: 15_000 }),
  http('https://sepolia-rollup.arbitrum.io/rpc', { batch: true, retryCount: 2, timeout: 15_000 }),
];

export const config = createConfig({
  chains: [arbitrumSepolia, sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: 'e6b113efbc1f45b94d886018c409c597' }),
  ],
  transports: {
    [arbitrumSepolia.id]: fallback(arbSepoliaTransports, { rank: false, retryCount: 1 }),
    [sepolia.id]: fallback([
      http('https://ethereum-sepolia-rpc.publicnode.com', { batch: true, retryCount: 2, timeout: 15_000 }),
      http('https://rpc.sepolia.org', { batch: true, retryCount: 2, timeout: 15_000 }),
    ], { rank: false, retryCount: 1 }),
  },
});
