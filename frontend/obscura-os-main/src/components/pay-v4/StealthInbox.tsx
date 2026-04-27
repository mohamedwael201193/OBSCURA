import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Inbox, Eye, EyeOff, Copy, Check, AlertTriangle, Shield, Zap, ExternalLink, RefreshCw, ChevronDown, ChevronUp, Lock } from "lucide-react";
import { useAccount } from "wagmi";
import { privateKeyToAddress } from "viem/accounts";
import { useStealthScan, type ScannedPayment } from "@/hooks/useStealthScan";
import { stealthPrivateKey, loadStoredKeys } from "@/lib/stealth";

function ClaimKeyRow({ m, index }: { m: ScannedPayment; index: number }) {
  const { address } = useAccount();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);
  const [step, setStep] = useState(0); // which claim step is expanded

  const handleReveal = () => {
    if (!address) return;
    const keys = loadStoredKeys(address);
    if (!keys) return;
    setRevealed(true);
    setStep(1);
  };

  const handleCopyKey = async () => {
    if (!address) return;
    const keys = loadStoredKeys(address);
    if (!keys) return;
    const sk = stealthPrivateKey(m.ephemeralPubKey, keys.viewingPrivateKey, keys.spendingPrivateKey);
    await navigator.clipboard.writeText(sk);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleCopyAddr = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setCopiedAddr(true);
    setTimeout(() => setCopiedAddr(false), 1500);
  };

  let derivedAddr = "";
  let displayKey = "";
  let isMatch = false;
  if (revealed && address) {
    const keys = loadStoredKeys(address);
    if (keys) {
      const sk = stealthPrivateKey(m.ephemeralPubKey, keys.viewingPrivateKey, keys.spendingPrivateKey);
      displayKey = sk;
      try {
        derivedAddr = privateKeyToAddress(sk);
        isMatch = derivedAddr.toLowerCase() === m.stealthAddress.toLowerCase();
      } catch {
        derivedAddr = "";
      }
    }
  }

  const arbiscanUrl = `https://sepolia.arbiscan.io/address/${m.stealthAddress}`;
  const txUrl = `https://sepolia.arbiscan.io/tx/${m.txHash}`;

  const claimSteps = [
    {
      label: "Copy private key",
      desc: "The private key controls the one-time stealth wallet that holds your cUSDC.",
    },
    {
      label: "Import into MetaMask",
      desc: 'In MetaMask → click your account avatar → "Import account" → paste the private key.',
    },
    {
      label: "Fund with ETH for gas",
      desc: `Send a tiny ETH (~0.001 ETH) to ${derivedAddr ? `${derivedAddr.slice(0, 8)}…${derivedAddr.slice(-6)}` : "the stealth address"} to pay the gas for the transfer.`,
    },
    {
      label: "Sweep cUSDC to your main wallet",
      desc: `From the imported MetaMask account, call cUSDC → confidentialTransfer(${address ? address.slice(0, 8) + "…" : "yourWallet"}, amount). Your cUSDC moves to your main wallet.`,
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="border border-emerald-500/20 bg-emerald-500/[0.03] rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-emerald-500/10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-[11px] font-mono text-emerald-400">
            #{(index + 1)}
          </div>
          <div>
            <div className="text-[13px] text-foreground font-medium">Stealth Payment</div>
            <div className="text-[10px] text-muted-foreground/60 font-mono">
              block {m.blockNumber.toString()}
            </div>
          </div>
        </div>
        <a
          href={txUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-emerald-300 transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Arbiscan
        </a>
      </div>

      {/* Address row */}
      <div className="px-4 py-3 flex items-center justify-between gap-2 border-b border-white/[0.04]">
        <div className="min-w-0">
          <div className="text-[10px] text-muted-foreground/50 tracking-wider uppercase mb-0.5">One-time stealth address</div>
          <div className="font-mono text-[12px] text-foreground/80 truncate">
            {m.stealthAddress.slice(0, 18)}…{m.stealthAddress.slice(-8)}
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => handleCopyAddr(m.stealthAddress)}
            className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-muted-foreground/60 hover:text-foreground transition-colors"
            title="Copy address"
          >
            {copiedAddr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <a
            href={arbiscanUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] text-muted-foreground/60 hover:text-emerald-300 transition-colors"
            title="View on Arbiscan"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Claim section */}
      <div className="px-4 py-3">
        {!revealed ? (
          <button
            onClick={handleReveal}
            className="w-full py-2.5 text-sm tracking-[0.15em] uppercase bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" /> Reveal Claim Key &amp; Instructions
          </button>
        ) : (
          <div className="space-y-3">
            {/* Private key */}
            <div>
              <div className="text-[10px] text-muted-foreground/50 tracking-wider uppercase mb-1.5 flex items-center gap-1.5">
                <Lock className="w-3 h-3" /> Private Key — Step 1 of 4
              </div>
              <div className="flex items-center gap-1.5">
                <code className="font-mono flex-1 text-[11px] text-emerald-300/90 bg-emerald-500/[0.06] px-3 py-2 rounded-lg border border-emerald-500/20 truncate">
                  {displayKey.slice(0, 24)}…{displayKey.slice(-10)}
                </code>
                <button
                  onClick={handleCopyKey}
                  className="px-3 py-2 text-[11px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 rounded-lg flex items-center gap-1.5 shrink-0 transition-colors"
                >
                  {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied!" : "Copy"}
                </button>
                <button
                  onClick={() => setRevealed(false)}
                  className="p-2 text-[11px] bg-white/[0.04] hover:bg-white/[0.07] text-muted-foreground border border-white/[0.06] rounded-lg transition-colors"
                  title="Hide"
                >
                  <EyeOff className="w-3 h-3" />
                </button>
              </div>
              {derivedAddr && (
                <div className="mt-1.5 flex items-center gap-1.5 text-[10px]">
                  <span className="text-muted-foreground/50">Derives to:</span>
                  <span className="font-mono text-foreground/60">{derivedAddr.slice(0, 10)}…{derivedAddr.slice(-8)}</span>
                  {isMatch ? (
                    <span className="text-emerald-400 flex items-center gap-0.5"><Check className="w-2.5 h-2.5" /> verified</span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-0.5"><AlertTriangle className="w-2.5 h-2.5" /> mismatch</span>
                  )}
                </div>
              )}
            </div>

            {/* Step-by-step claim guide */}
            <div className="space-y-1.5">
              {claimSteps.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setStep(step === i + 1 ? 0 : i + 1)}
                  className="w-full text-left"
                >
                  <div className={`px-3 py-2.5 rounded-lg border transition-colors ${
                    step === i + 1
                      ? "bg-emerald-500/[0.07] border-emerald-500/25"
                      : "bg-white/[0.02] border-white/[0.05] hover:border-white/[0.09]"
                  }`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-mono font-bold shrink-0 ${
                          step === i + 1 ? "bg-emerald-500/20 text-emerald-300" : "bg-white/[0.06] text-muted-foreground/60"
                        }`}>{i + 1}</span>
                        <span className={`text-[12px] font-medium ${step === i + 1 ? "text-emerald-200" : "text-foreground/70"}`}>
                          {s.label}
                        </span>
                      </div>
                      {step === i + 1 ? <ChevronUp className="w-3 h-3 text-emerald-400/60" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/40" />}
                    </div>
                    <AnimatePresence>
                      {step === i + 1 && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="pt-2 pl-7 text-[11px] text-muted-foreground/70 leading-relaxed">
                            {s.desc}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const BENEFIT_CARDS = [
  {
    icon: Shield,
    title: "Unlinkable payments",
    desc: "Each payment goes to a fresh one-time address. Blockchain analysts can't link payments to your identity.",
  },
  {
    icon: Lock,
    title: "Wallet stays clean",
    desc: "Your main wallet never appears on-chain as a recipient. Zero correlation between your employers.",
  },
  {
    icon: Zap,
    title: "ERC-5564 standard",
    desc: "Compatible with all wallets and dApps that support the stealth address standard.",
  },
];

export default function StealthInbox() {
  const { address } = useAccount();
  const { matches, isScanning, error, scan } = useStealthScan();
  const [showBenefits, setShowBenefits] = useState(false);
  const hasKeys = address ? !!loadStoredKeys(address) : false;

  // Auto-scan on mount if keys are available
  useEffect(() => {
    if (hasKeys && address) {
      scan();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/20 flex items-center justify-center">
            <Inbox className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-[14px] font-display font-semibold text-foreground">Stealth Inbox</h3>
            <div className="text-[10px] text-muted-foreground/55 tracking-wide">
              {isScanning ? "Scanning blockchain…" : matches.length > 0 ? `${matches.length} stealth payment${matches.length > 1 ? "s" : ""} found` : "No stealth payments found"}
            </div>
          </div>
        </div>
        <button
          onClick={scan}
          disabled={isScanning || !hasKeys}
          className="flex items-center gap-1.5 text-[11px] tracking-wider text-muted-foreground hover:text-emerald-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin" : ""}`} />
          {isScanning ? "Scanning…" : "Rescan"}
        </button>
      </div>

      {/* Direct mode info box */}
      <div className="p-3 bg-blue-500/[0.08] border border-blue-500/20 rounded-lg text-[12px] text-blue-300/80 leading-relaxed">
        <strong className="text-blue-200">Most users:</strong> If your employer used <strong>Direct mode</strong> (the default), your cUSDC is already in your wallet — go to Dashboard → <strong>REVEAL</strong> to see it. This tab is only for <strong>Stealth mode</strong> payments.
      </div>

      {/* "What is stealth?" collapsible */}
      <div className="border border-white/[0.07] rounded-xl overflow-hidden">
        <button
          onClick={() => setShowBenefits((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2 text-[12px] text-foreground/80 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Why use Stealth mode? Maximum privacy explained
          </div>
          {showBenefits ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/50" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/50" />}
        </button>
        <AnimatePresence>
          {showBenefits && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 pt-1 grid gap-3 border-t border-white/[0.05]">
                {BENEFIT_CARDS.map((b) => (
                  <div key={b.title} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <b.icon className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-foreground/85">{b.title}</div>
                      <div className="text-[11px] text-muted-foreground/60 leading-relaxed">{b.desc}</div>
                    </div>
                  </div>
                ))}
                <div className="mt-1 p-3 bg-amber-500/[0.06] border border-amber-500/15 rounded-lg text-[11px] text-amber-300/80">
                  <strong>Trade-off:</strong> Stealth payments require you to manually claim funds by importing a private key into MetaMask. Direct mode is easier. Use Stealth when your employer's privacy matters more than convenience.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* No keys warning */}
      {!hasKeys && (
        <div className="p-4 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl text-[12px] text-amber-300/80 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <div className="font-medium text-amber-200 mb-0.5">No stealth keys found</div>
            Register a stealth meta-address in <strong>Step 1</strong> above first. Your keys are stored locally in your browser.
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3 bg-red-500/[0.08] border border-red-500/20 rounded-lg text-[12px] text-red-300">
          {error}
        </div>
      )}

      {/* Scanning skeleton */}
      {isScanning && matches.length === 0 && (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isScanning && matches.length === 0 && hasKeys && (
        <div className="py-8 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/[0.08] border border-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-4.5 h-4.5 text-emerald-400/60" />
          </div>
          <div className="text-[13px] text-foreground/60 mb-1">No stealth payments in the lookback window</div>
          <div className="text-[11px] text-muted-foreground/45">
            Stealth payments go to one-time derived addresses and are announced on-chain. Scan again after receiving payment.
          </div>
        </div>
      )}

      {/* Results */}
      {matches.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] tracking-[0.2em] uppercase text-emerald-400/70 font-mono">
            {matches.length} payment{matches.length > 1 ? "s" : ""} — claim each below
          </div>
          {matches.map((m, i) => (
            <ClaimKeyRow key={`${m.txHash}-${m.stealthAddress}`} m={m} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
