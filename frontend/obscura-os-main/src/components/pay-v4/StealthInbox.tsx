import { useState } from "react";
import { Inbox, Eye, EyeOff, Copy, Check, AlertTriangle } from "lucide-react";
import { useAccount } from "wagmi";
import { privateKeyToAddress } from "viem/accounts";
import { useStealthScan, type ScannedPayment } from "@/hooks/useStealthScan";
import { stealthPrivateKey, loadStoredKeys } from "@/lib/stealth";

function ClaimKeyRow({ m }: { m: ScannedPayment }) {
  const { address } = useAccount();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleReveal = () => {
    if (!address) return;
    const keys = loadStoredKeys(address);
    if (!keys) return;
    setRevealed(true);
  };

  const handleCopy = async () => {
    if (!address) return;
    const keys = loadStoredKeys(address);
    if (!keys) return;
    const sk = stealthPrivateKey(
      m.ephemeralPubKey,
      keys.viewingPrivateKey,
      keys.spendingPrivateKey
    );
    await navigator.clipboard.writeText(sk);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  let derivedAddr = "";
  let displayKey = "";
  if (revealed && address) {
    const keys = loadStoredKeys(address);
    if (keys) {
      const sk = stealthPrivateKey(
        m.ephemeralPubKey,
        keys.viewingPrivateKey,
        keys.spendingPrivateKey
      );
      displayKey = sk;
      try {
        derivedAddr = privateKeyToAddress(sk);
      } catch {
        derivedAddr = "";
      }
    }
  }

  return (
    <div className="p-3 bg-secondary/20 border border-border/30 rounded-md space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-sm text-primary">Stream #{m.streamId.toString()}</span>
        <span className="text-xs text-muted-foreground">block {m.blockNumber.toString()}</span>
      </div>
      <div className="font-mono text-sm text-foreground">
        addr: {m.stealthAddress.slice(0, 14)}…{m.stealthAddress.slice(-6)}
      </div>
      <div className="text-xs text-muted-foreground/70">
        escrow #{m.escrowId.toString()}
      </div>

      {!revealed ? (
        <button
          onClick={handleReveal}
          className="w-full mt-1 py-1.5 text-xs tracking-[0.15em] uppercase bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-md flex items-center justify-center gap-1.5"
        >
          <Eye className="w-3 h-3" /> Reveal Claim Key
        </button>
      ) : (
        <div className="space-y-1.5 pt-1 border-t border-border/30">
          <div className="flex items-start gap-1.5 text-[11px] text-amber-500">
            <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
            <span>
              Import this private key into a fresh wallet (e.g. MetaMask), fund with a tiny
              amount of ETH for gas, then call <code>ConfidentialEscrow.redeem({m.escrowId.toString()})</code>.
              Anyone with this key can sweep the escrow.
            </span>
          </div>
          {derivedAddr && (
            <div className="text-xs text-muted-foreground">
              <span className="text-muted-foreground/60">derived: </span>
              {derivedAddr.slice(0, 10)}…{derivedAddr.slice(-8)}
              {derivedAddr.toLowerCase() === m.stealthAddress.toLowerCase() ? (
                <span className="ml-1 text-green-500">✓ matches</span>
              ) : (
                <span className="ml-1 text-destructive">✗ mismatch!</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <code className="font-mono flex-1 text-[11px] text-foreground bg-background/60 px-2 py-1 rounded-md border border-border/40 truncate">
              {displayKey}
            </code>
            <button
              onClick={handleCopy}
              className="px-2 py-1 text-xs bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-md flex items-center gap-1"
            >
              {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={() => setRevealed(false)}
              className="px-2 py-1 text-xs bg-secondary/40 hover:bg-secondary/60 text-muted-foreground border border-border/40 rounded-md flex items-center gap-1"
              title="Hide"
            >
              <EyeOff className="w-3 h-3" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function StealthInbox() {
  const { matches, isScanning, error, scan } = useStealthScan();

  return (
    <div className="glass-panel rounded-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Inbox className="w-4 h-4 text-primary" />
          <h3 className="font-display text-sm tracking-wider text-foreground">Stealth Inbox</h3>
        </div>
        <button
          onClick={scan}
          className="text-xs text-muted-foreground hover:text-primary"
        >
          {isScanning ? "Scanning…" : "Rescan"}
        </button>
      </div>

      <p className="text-sm text-muted-foreground/70">
        Scans the blockchain for payroll cycles sent to your stealth addresses. Everything happens in your browser — nothing is sent to any server.
        Click “Reveal” to get the private key for a cycle, then import it into a fresh wallet to claim the funds.
      </p>

      {error && <div className="text-sm text-destructive">{error}</div>}

      {matches.length === 0 && !isScanning && (
        <div className="text-sm text-muted-foreground/60">
          No incoming cycles found in lookback window.
        </div>
      )}

      <div className="space-y-2">
        {matches.map((m) => (
          <ClaimKeyRow key={`${m.txHash}-${m.stealthAddress}`} m={m} />
        ))}
      </div>
    </div>
  );
}
