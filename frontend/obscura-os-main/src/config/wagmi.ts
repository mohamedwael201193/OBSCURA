import { createConfig, http } from 'wagmi';
import { arbitrumSepolia, sepolia } from 'wagmi/chains';
import { injected, walletConnect } from 'wagmi/connectors';

export const config = createConfig({
  chains: [arbitrumSepolia, sepolia],
  connectors: [
    injected(),
    walletConnect({ projectId: 'e6b113efbc1f45b94d886018c409c597' }),
  ],
  transports: {
    [arbitrumSepolia.id]: http('https://sepolia-rollup.arbitrum.io/rpc'),
    [sepolia.id]: http('https://ethereum-sepolia-rpc.publicnode.com'),
  },
});
