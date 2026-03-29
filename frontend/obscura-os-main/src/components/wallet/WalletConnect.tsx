import { useDynamicContext, useIsLoggedIn } from '@dynamic-labs/sdk-react-core';
import { useBalance, useSwitchChain, useAccount } from 'wagmi';
import { arbitrumSepolia } from 'wagmi/chains';

export default function WalletConnect() {
  const isLoggedIn = useIsLoggedIn();
  const { setShowAuthFlow, handleLogOut, primaryWallet } = useDynamicContext();
  const { address, chainId } = useAccount();
  const { data: balance } = useBalance({ address, chainId: arbitrumSepolia.id });
  const { switchChain } = useSwitchChain();

  const isWrongNetwork = isLoggedIn && chainId !== undefined && chainId !== arbitrumSepolia.id;

  if (!isLoggedIn) {
    return (
      <button
        onClick={() => setShowAuthFlow(true)}
        className="px-5 py-2 text-xs tracking-[0.15em] uppercase font-mono border border-primary/40 text-primary hover:bg-primary/10 transition-colors duration-300 rounded-sm"
      >
        Connect Wallet
      </button>
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

  const addr = primaryWallet?.address ?? address ?? '';
  const displayName = addr ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : '';
  const ethBalance = balance
    ? `${parseFloat(balance.formatted).toFixed(4)} ETH`
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
        onClick={() => setShowAuthFlow(true)}
        title="Wallet settings"
        className="flex items-center gap-2 px-4 py-2 text-xs font-mono border border-primary/30 text-foreground hover:border-primary/60 transition-colors duration-300 rounded-sm group"
      >
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        <span className="text-primary">{displayName}</span>
        <span
          onClick={(e) => { e.stopPropagation(); handleLogOut(); }}
          title="Disconnect"
          className="text-[9px] text-muted-foreground group-hover:text-red-400 transition-colors cursor-pointer ml-1"
        >
          ✕
        </span>
      </button>
    </div>
  );
}
