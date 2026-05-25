import { useState } from "react";
import { useConnect, useDisconnect, useAccount, useBalance, useChainId, useSwitchChain } from "wagmi";
import { arbitrumSepolia } from "wagmi/chains";
import { formatUnits } from "viem";
import { cn } from "@/lib/utils";

type WalletConnectProps = {
  /** Light nav (landing) uses forest greens for contrast on white */
  tone?: "dark" | "light";
};

export default function WalletConnect({ tone = "dark" }: WalletConnectProps) {
  const [open, setOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connectors, connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const { data: balance } = useBalance({ address, chainId: arbitrumSepolia.id });
  const { switchChain } = useSwitchChain();

  const light = tone === "light";

  const connectBtn = light
    ? "border-forest/45 text-forest bg-white hover:bg-sage-1"
    : "border-primary/40 text-primary hover:bg-primary/10";

  const networkLabel = light ? "text-forest/75" : "text-muted-foreground";
  const balanceText = light ? "text-forest font-semibold" : "text-primary/80";
  const walletBtn = light
    ? "border-forest/45 bg-white text-forest hover:border-forest/70 hover:bg-sage-1/80"
    : "border-primary/30 text-foreground hover:border-primary/60";
  const addressText = light ? "text-forest font-semibold" : "text-primary";
  const statusDot = light ? "bg-emerald-600" : "bg-primary";

  if (!isConnected) {
    return (
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            "rounded-sm px-5 py-2 font-mono text-xs uppercase tracking-[0.15em] transition-colors duration-300 border",
            connectBtn,
          )}
        >
          Connect Wallet
        </button>
        {open && (
          <div
            className={cn(
              "absolute right-0 top-full z-50 mt-1 min-w-[180px] overflow-hidden rounded-sm border shadow-xl backdrop-blur",
              light
                ? "border-forest/20 bg-white"
                : "border-primary/20 bg-background/95",
            )}
            onBlur={() => setOpen(false)}
          >
            {connectors.map((connector) => (
              <button
                key={connector.uid}
                disabled={isPending}
                onClick={() => {
                  connect({ connector });
                  setOpen(false);
                }}
                className={cn(
                  "flex w-full items-center gap-2 px-4 py-3 text-left font-mono text-xs transition-colors disabled:opacity-50",
                  light ? "text-forest hover:bg-sage-1" : "hover:bg-primary/10",
                )}
              >
                <span className={light ? "text-forest/50" : "text-primary/60"}>◆</span>
                {connector.name}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (isConnected && address && chainId !== arbitrumSepolia.id) {
    return (
      <button
        onClick={() => switchChain({ chainId: arbitrumSepolia.id })}
        className="rounded-sm border border-amber-500/40 px-5 py-2 font-mono text-xs uppercase tracking-[0.15em] text-amber-600 transition-colors duration-300 hover:bg-amber-500/10"
      >
        Switch to Arb Sepolia
      </button>
    );
  }

  const displayName = address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "";
  const ethBalance = balance
    ? `${parseFloat(formatUnits(balance.value, balance.decimals)).toFixed(4)} ETH`
    : "";

  return (
    <div className="flex items-center gap-2.5">
      <div className="flex flex-col items-end leading-tight">
        <span className={cn("font-mono text-[10px] uppercase tracking-widest", networkLabel)}>
          Arb Sepolia
        </span>
        {ethBalance ? (
          <span className={cn("font-mono text-[10px]", balanceText)}>{ethBalance}</span>
        ) : null}
      </div>
      <button
        type="button"
        className={cn(
          "group flex items-center gap-2 rounded-sm border px-3.5 py-2 font-mono text-xs transition-colors duration-300",
          walletBtn,
        )}
      >
        <span className={cn("size-2 shrink-0 rounded-full animate-pulse", statusDot)} />
        <span className={addressText}>{displayName}</span>
        <span
          onClick={(e) => {
            e.stopPropagation();
            disconnect();
          }}
          title="Disconnect"
          className={cn(
            "ml-0.5 cursor-pointer text-[10px] transition-colors",
            light
              ? "text-forest/45 group-hover:text-red-600"
              : "text-muted-foreground group-hover:text-red-400",
          )}
        >
          ✕
        </span>
      </button>
    </div>
  );
}
