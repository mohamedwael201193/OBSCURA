import { useState } from 'react';
import { useConnect, useDisconnect, useAccount, useBalance, useChainId, useSwitchChain } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';
import { formatUnits } from 'viem';

export default function WalletConnect() {
  const [open, setOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address, chainId: arbitrumSepolia.id });
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isConnected && !!address && chainId !== arbitrumSepolia.id;

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen(o => !o)}
          className="px-5 py-2 text-xs tracking-[0.15em] uppercase font-mono border border-primary/40 text-primary hover:bg-primary/10 transition-colors duration-300 rounded-sm"
        >
          Connect Wallet
        </button>
        {open && (
          <div
            className="absolute right-0 top-full mt-1 z-50 min-w-[180px] border border-primary/20 bg-background/95 backdrop-blur rounded-sm shadow-xl overflow-hidden"
            onBlur={() => setOpen(false)}
          >
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                disabled={isPending}
                onClick={() => { connect({ connector }); setOpen(false); }}
                className="w-full px-4 py-3 text-left text-xs font-mono hover:bg-primary/10 transition-colors flex items-center gap-2 disabled:opacity-50"
              >
                <span className="text-primary/60">◆</span>
                {connector.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isWrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
        className="px-5 py-2 text-xs tracking-[0.15em] uppercase font-mono border border-amber-500/40 text-amber-400 hover:bg-amber-500/10 transition-colors duration-300 rounded-sm"
      >
        Switch to Arb Sepolia
      </button>
    );
  }

  const displayName = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : '';
  const ethBalance = balance
    ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)} ETH`
    : '';

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end leading-tight">
        <span className="text-[9px] tracking-widest text-muted-foreground uppercase font-mono">
          Arb Sepolia
        </span>
        {ethBalance && (
          <span className="text-[9px] font-mono text-primary/80">{ethBalance}</span>
        )}
      </div>
      <button
        className="flex items-center gap-2 px-4 py-2 text-xs font-mono border border-primary/30 text-foreground hover:border-primary/60 transition-colors duration-300 rounded-sm group"
      >
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-primary">{displayName}</span>
        <span
          onClick={(e) => { e.stopPropagation(); disconnect(); }}
          title="Disconnect"
          className="text-[9px] text-muted-foreground group-hover:text-red-400 transition-colors cursor-pointer ml-1"
        >
          ✕
        </span>
      </button>
    </div>
  );
}
