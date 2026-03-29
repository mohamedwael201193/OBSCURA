import { createConfig, http } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';

// Connectors are injected at runtime by DynamicWagmiConnector.
// Do not add connectors here — they will be overwritten by Dynamic.
export const config = createConfig({
  chains: [arbitrumSepolia],
  transports: {
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
  },
});
