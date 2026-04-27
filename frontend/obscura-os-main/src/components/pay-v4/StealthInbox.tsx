/**
 * StealthInbox — Scans for stealth payments and auto-sweeps them to the main wallet.
 *
 * The old UX required: copy key → import to MetaMask → fund ETH → call contract.
 * The NEW UX: one button "Auto-Sweep" — the app derives the key in-browser,
 * funds gas automatically, and signs the transfer without any MetaMask import.
 *
 * This follows the Umbra protocol pattern using viem privateKeyToAccount +
 * createWalletClient with HTTP transport (see useSweepStealth.ts).
 */
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Inbox, Eye, Copy, Check, AlertTriangle, Shield, Zap, ExternalLink,
  RefreshCw, ChevronDown, ChevronUp, Lock, ArrowRight, Loader2, CheckCircle2,
  EyeOff, KeyRound,
} from "lucide-react";
import { useAccount, usePublicClient } from "wagmi";
import { formatUnits } from "viem";
import { privateKeyToAddress } from "viem/accounts";
import { useStealthScan, type ScannedPayment } from "@/hooks/useStealthScan";
import { useSweepStealth } from "@/hooks/useSweepStealth";
import { stealthPrivateKey, loadStoredKeys } from "@/lib/stealth";
import {
  OBSCURA_STEALTH_REGISTRY_ABI,
  OBSCURA_STEALTH_REGISTRY_ADDRESS,
} from "@/config/wave2";

// ─── Sweep Card ────────────────────────────────────────────────────────────────

function SweepCard({ m, index }: { m: ScannedPayment; index: number }) {
  const { address } = useAccount();
  const { sweep, state, stepLabel, reset } = useSweepStealth();
  const [amountInput, setAmountInput] = useState(
    m.amount > 0n ? formatUnits(m.amount, 6) : ""
  );
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [advKey, setAdvKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copiedAddr, setCopiedAddr] = useState(false);

  const arbiscanTx = `https://sepolia.arbiscan.io/tx/${m.txHash}`;
  const arbiscanAddr = `https://sepolia.arbiscan.io/address/${m.stealthAddress}`;

  let derivedKey = "";
  let derivedAddr = "";
  let keyMatch = false;
  if (advKey && address) {
    const keys = loadStoredKeys(address);
    if (keys) {
      try {
        derivedKey = stealthPrivateKey(m.ephemeralPubKey, keys.viewingPrivateKey, keys.spendingPrivateKey);
        derivedAddr = privateKeyToAddress(derivedKey as `0x${string}`);
        keyMatch = derivedAddr.toLowerCase() === m.stealthAddress.toLowerCase();
      } catch { /* noop */ }
    }
  }

  const copyKey = async () => {
    if (!derivedKey) return;
    await navigator.clipboard.writeText(derivedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const isBusy = state.step !== "idle" && state.step !== "done" && state.step !== "error";
  const isDone = state.step === "done";
  const isError = state.step === "error";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06 }}
      className="border border-emerald-500/20 bg-emerald-500/[0.02] rounded-xl overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-emerald-500/10">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-full bg-emerald-500/[0.12] border border-emerald-500/25 flex items-center justify-center">
            {isDone
              ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              : <Lock className="w-3.5 h-3.5 text-emerald-400" />}
          </div>
          <div>
            <div className="text-[13px] font-semibold text-foreground">
              {m.amount > 0n ? `${formatUnits(m.amount, 6)} cUSDC — Stealth Payment` : "Stealth Payment"}
            </div>
            <div className="text-[10px] text-muted-foreground/55 font-mono">
              block {m.blockNumber.toString()}{m.streamId > 0n && ` · stream #${m.streamId.toString()}`}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => { navigator.clipboard.writeText(m.stealthAddress); setCopiedAddr(true); setTimeout(() => setCopiedAddr(false), 1200); }}
            className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.05] text-muted-foreground/55 hover:text-foreground transition-colors"
            title="Copy stealth address"
          >
            {copiedAddr ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <a href={arbiscanTx} target="_blank" rel="noopener noreferrer"
            className="p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.05] text-muted-foreground/55 hover:text-emerald-300 transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
          </a>
          <a href={arbiscanAddr} target="_blank" rel="noopener noreferrer"
            className="text-[10px] text-muted-foreground/45 hover:text-emerald-300 transition-colors font-mono"
          >
            {m.stealthAddress.slice(0, 8)}…
          </a>
        </div>
      </div>

      {/* Auto-Sweep Section */}
      <div className="px-4 py-4 space-y-3">
        {isDone ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 bg-emerald-500/[0.08] border border-emerald-500/25 rounded-xl text-center space-y-2"
          >
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <div className="text-[14px] font-semibold text-emerald-200">Swept successfully!</div>
            <div className="text-[12px] text-emerald-300/70">cUSDC is now in your main wallet. Dashboard balance updated automatically — or click REVEAL to decrypt live on-chain.</div>
            {state.txHash && (
              <a href={`https://sepolia.arbiscan.io/tx/${state.txHash}`} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-[11px] text-emerald-400/80 hover:text-emerald-300"
              >
                <ExternalLink className="w-3 h-3" /> View sweep tx
              </a>
            )}
            <button onClick={reset} className="block mx-auto text-[11px] text-muted-foreground/45 hover:text-foreground mt-1">Dismiss</button>
          </motion.div>
        ) : (
          <>
            <div>
              <label className="text-[10px] text-muted-foreground/50 tracking-wider uppercase mb-1.5 block">
                Amount to Sweep (cUSDC)
              </label>
              {m.amount > 0n ? (
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3 py-2 bg-emerald-500/[0.06] border border-emerald-500/20 rounded-lg text-[13px] font-mono text-emerald-300">
                    {formatUnits(m.amount, 6)} cUSDC
                  </div>
                  <span className="text-[10px] text-emerald-400/60 shrink-0">auto-detected ✓</span>
                </div>
              ) : (
                <input
                  type="number"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder="e.g. 2.5 — enter what your employer sent"
                  className="w-full px-3 py-2 bg-background border border-border/50 rounded-lg text-[12px] font-mono focus:border-emerald-500/40 focus:outline-none"
                />
              )}
            </div>

            <div className="p-3 bg-emerald-500/[0.04] border border-emerald-500/15 rounded-lg text-[11px] text-emerald-300/70 leading-relaxed">
              <div className="font-semibold text-emerald-200 mb-1 flex items-center gap-1.5">
                <Zap className="w-3 h-3" /> Auto-Sweep — no MetaMask import needed
              </div>
              The app derives the stealth key in your browser, sends 0.002 ETH from your wallet for gas (one MetaMask popup), then signs and submits the cUSDC transfer automatically. Your main wallet receives the cUSDC.
            </div>

            {isBusy && (
              <div className="p-3 bg-white/[0.03] border border-white/[0.06] rounded-lg flex items-center gap-2.5">
                <Loader2 className="w-4 h-4 text-emerald-400 animate-spin shrink-0" />
                <div>
                  <div className="text-[12px] text-foreground/80">{stepLabel}</div>
                  <div className="text-[10px] text-muted-foreground/50 mt-0.5">
                    {state.step === "funding_gas" && "This is the only MetaMask popup — for gas funding."}
                    {state.step === "encrypting" && "Sign the FHE permit — authorizes amount encryption."}
                    {state.step === "sweeping" && "Signing from stealth key in-browser — no MetaMask."}
                  </div>
                </div>
              </div>
            )}

            {isError && (
              <div className="p-3 bg-red-500/[0.08] border border-red-500/20 rounded-lg text-[12px] text-red-300 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-red-400" />
                <div>
                  <div className="font-medium text-red-200 mb-0.5">Sweep failed</div>
                  {state.error}
                  <button onClick={reset} className="block mt-1 text-[10px] text-red-400/70 hover:text-red-300">Try again</button>
                </div>
              </div>
            )}

            {!isBusy && !isDone && (
              <button
                disabled={isBusy || (!amountInput && m.amount === 0n)}
                onClick={() => {
                  const amt = m.amount > 0n
                    ? m.amount
                    : (() => { try { return BigInt(Math.round(parseFloat(amountInput) * 1_000_000)); } catch { return 0n; } })();
                  void sweep(m, amt > 0n ? amt : undefined);
                }}
                className="w-full py-3 text-sm tracking-[0.2em] uppercase bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 rounded-xl flex items-center justify-center gap-2 transition-colors disabled:opacity-50 font-semibold"
              >
                <ArrowRight className="w-4 h-4" />
                Auto-Sweep to My Wallet
              </button>
            )}
          </>
        )}
      </div>

      {/* Advanced: export private key */}
      <div className="border-t border-white/[0.04]">
        <button
          onClick={() => setShowAdvanced((v) => !v)}
          className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
        >
          <span className="text-[11px] text-muted-foreground/45">Advanced: export private key (manual MetaMask import)</span>
          {showAdvanced ? <ChevronUp className="w-3 h-3 text-muted-foreground/35" /> : <ChevronDown className="w-3 h-3 text-muted-foreground/35" />}
        </button>
        <AnimatePresence>
          {showAdvanced && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 space-y-2 border-t border-white/[0.04]">
                <div className="text-[11px] text-amber-400/70 flex items-start gap-1.5 pt-2">
                  <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                  Anyone with this key can access funds in the stealth address.
                </div>
                {!advKey ? (
                  <button onClick={() => setAdvKey(true)} className="flex items-center gap-1.5 text-[11px] text-muted-foreground/55 hover:text-foreground transition-colors">
                    <Eye className="w-3 h-3" /> Reveal private key
                  </button>
                ) : (
                  <div className="space-y-1.5">
                    {derivedKey && (
                      <div className="flex items-center gap-1.5">
                        <code className="font-mono flex-1 text-[10px] text-emerald-300/75 bg-emerald-500/[0.05] px-2 py-1.5 rounded-lg border border-emerald-500/18 truncate">
                          {derivedKey.slice(0, 22)}…{derivedKey.slice(-10)}
                        </code>
                        <button onClick={copyKey} className="px-2 py-1.5 text-[10px] bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-lg shrink-0">
                          {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <button onClick={() => setAdvKey(false)} className="p-1.5 bg-white/[0.04] text-muted-foreground/55 border border-white/[0.05] rounded-lg">
                          <EyeOff className="w-3 h-3" />
                        </button>
                      </div>
                    )}
                    {derivedAddr && (
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="text-muted-foreground/40">Derived:</span>
                        <span className="font-mono text-foreground/50">{derivedAddr.slice(0, 12)}…{derivedAddr.slice(-8)}</span>
                        {keyMatch ? <span className="text-emerald-400 flex items-center gap-0.5"><Check className="w-2.5 h-2.5" /> ok</span> : <span className="text-red-400">mismatch</span>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

// ─── Benefit cards ─────────────────────────────────────────────────────────────

const BENEFIT_CARDS = [
  {
    icon: Shield,
    title: "Unlinkable payments",
    desc: "Each payment goes to a fresh one-time address. Blockchain analysts cannot link payments to your identity or employer.",
  },
  {
    icon: Lock,
    title: "Wallet stays clean",
    desc: "Your main wallet address never appears on-chain as a recipient. Multiple employers cannot collude to trace you.",
  },
  {
    icon: Zap,
    title: "ERC-5564 standard",
    desc: "Same standard used by Umbra, Vitalik's guide, and all major stealth protocols. Fully compatible.",
  },
];

// ─── Key mismatch hook ─────────────────────────────────────────────────────────

/**
 * Checks if the keys in localStorage match what's registered on-chain.
 * If the user clicked "Rotate & Republish" AFTER the sender sent a payment,
 * the scan will find nothing because the viewTag is derived from the old keys.
 */
function useKeyMismatch(address: `0x${string}` | undefined) {
  const publicClient = usePublicClient();
  const [mismatch, setMismatch] = useState<"ok" | "mismatch" | "checking" | null>(null);

  useEffect(() => {
    if (!address || !publicClient || !OBSCURA_STEALTH_REGISTRY_ADDRESS) return;
    const local = loadStoredKeys(address);
    if (!local) { setMismatch(null); return; }
    setMismatch("checking");
    publicClient
      .readContract({
        address: OBSCURA_STEALTH_REGISTRY_ADDRESS,
        abi: OBSCURA_STEALTH_REGISTRY_ABI,
        functionName: "getMetaAddress",
        args: [address],
      })
      .then((res) => {
        const [s, v, ts] = res as readonly [`0x${string}`, `0x${string}`, bigint];
        if (ts === 0n) { setMismatch(null); return; }
        const spendMatch = s.toLowerCase() === local.meta.spendingPubKey.toLowerCase();
        const viewMatch = v.toLowerCase() === local.meta.viewingPubKey.toLowerCase();
        setMismatch(spendMatch && viewMatch ? "ok" : "mismatch");
      })
      .catch(() => setMismatch(null));
  }, [address, publicClient]);

  return mismatch;
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function StealthInbox() {
  const { address } = useAccount();
  const { matches, isScanning, error, scan } = useStealthScan();
  const [showBenefits, setShowBenefits] = useState(false);
  const hasKeys = address ? !!loadStoredKeys(address) : false;
  const keyMismatch = useKeyMismatch(address);

  useEffect(() => {
    if (hasKeys && address) scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  return (
    <div className="space-y-4">
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
        <button onClick={scan} disabled={isScanning || !hasKeys}
          className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-emerald-300 disabled:opacity-50 transition-colors"
        >
          <RefreshCw className={`w-3 h-3 ${isScanning ? "animate-spin" : ""}`} />
          {isScanning ? "Scanning…" : "Rescan"}
        </button>
      </div>

      <div className="p-3 bg-blue-500/[0.07] border border-blue-500/20 rounded-xl text-[12px] text-blue-300/80 leading-relaxed">
        <strong className="text-blue-200">Most users:</strong> If your employer used <strong>Direct mode</strong> (the default), your cUSDC is already in your wallet — go to Dashboard → <strong>REVEAL</strong>. This tab is only for <strong>Stealth mode</strong> payments.
      </div>

      {/* Key mismatch warning — most common cause of "inbox empty" during testing */}
      {keyMismatch === "mismatch" && (
        <div className="p-3 bg-amber-500/[0.08] border border-amber-500/25 rounded-xl text-[12px] text-amber-300/85 flex items-start gap-2.5">
          <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <div className="font-semibold text-amber-200 mb-1">Key mismatch — your local keys differ from on-chain</div>
            <div className="text-[11px] leading-relaxed text-amber-300/70">
              Your browser's stealth keys <strong>don't match</strong> what's registered on-chain. This means stealth payments sent using your old keys won't be found by this scan. This usually happens when you clicked <strong>"Rotate & Republish"</strong> after your employer sent a payment.
            </div>
            <div className="mt-1.5 text-[11px] text-amber-300/60">
              <strong className="text-amber-200">Fix:</strong> If the payment was sent to your OLD keys, ask your employer to re-send using the new keys. Or check Arbiscan directly for Announcement events on the stealth registry.
            </div>
          </div>
        </div>
      )}

      <div className="border border-white/[0.07] rounded-xl overflow-hidden">
        <button onClick={() => setShowBenefits((v) => !v)}
          className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
        >
          <div className="flex items-center gap-2 text-[12px] text-foreground/80 font-medium">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Why use Stealth mode? The privacy benefits
          </div>
          {showBenefits ? <ChevronUp className="w-3.5 h-3.5 text-muted-foreground/40" /> : <ChevronDown className="w-3.5 h-3.5 text-muted-foreground/40" />}
        </button>
        <AnimatePresence>
          {showBenefits && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
              <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/[0.05]">
                {BENEFIT_CARDS.map((b) => (
                  <div key={b.title} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-lg bg-emerald-500/[0.07] border border-emerald-500/15 flex items-center justify-center shrink-0 mt-0.5">
                      <b.icon className="w-3.5 h-3.5 text-emerald-400" />
                    </div>
                    <div>
                      <div className="text-[12px] font-medium text-foreground/85">{b.title}</div>
                      <div className="text-[11px] text-muted-foreground/60 leading-relaxed">{b.desc}</div>
                    </div>
                  </div>
                ))}
                <div className="p-3 bg-emerald-500/[0.04] border border-emerald-500/15 rounded-lg text-[11px] text-emerald-300/70">
                  <strong className="text-emerald-200">Obscura Auto-Sweep</strong>: Unlike Umbra and other protocols where you manually import a private key into MetaMask, Obscura derives the key in-browser and sweeps automatically. Maximum privacy, minimum friction.
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {!hasKeys && (
        <div className="p-4 bg-amber-500/[0.06] border border-amber-500/20 rounded-xl text-[12px] text-amber-300/80 flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
          <div>
            <div className="font-semibold text-amber-200 mb-0.5">No stealth keys found</div>
            Go to the <strong>Stealth</strong> tab → Step 1 to register a meta-address. Your keys are generated and stored locally in your browser.
          </div>
        </div>
      )}

      {error && <div className="p-3 bg-red-500/[0.07] border border-red-500/20 rounded-xl text-[12px] text-red-300">{error}</div>}

      {isScanning && matches.length === 0 && (
        <div className="space-y-2">
          {[0, 1].map((i) => <div key={i} className="h-24 rounded-xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />)}
        </div>
      )}

      {!isScanning && matches.length === 0 && hasKeys && (
        <div className="py-10 text-center">
          <div className="w-10 h-10 rounded-full bg-emerald-500/[0.07] border border-emerald-500/15 flex items-center justify-center mx-auto mb-3">
            <Inbox className="w-4.5 h-4.5 text-emerald-400/50" />
          </div>
          <div className="text-[13px] text-foreground/50 mb-1">No stealth payments in the lookback window</div>
          <div className="text-[11px] text-muted-foreground/38">Payments announced on the Stealth Registry (last ~14 days) will appear here.</div>
        </div>
      )}

      {matches.length > 0 && (
        <div className="space-y-3">
          <div className="text-[10px] tracking-[0.2em] uppercase text-emerald-400/55 font-mono">
            {matches.length} payment{matches.length > 1 ? "s" : ""} — auto-sweep each below
          </div>
          {matches.map((m, i) => <SweepCard key={`${m.txHash}-${m.stealthAddress}`} m={m} index={i} />)}
        </div>
      )}
    </div>
  );
}
