/**
 * StealthInboxV2 — drop-in upgrade to the Wave 2 StealthInbox.
 *
 *   • Embeds stealth key setup inline — no navigation required.
 *   • Auto-scans for incoming payments after setup completes.
 *   • Adds an unread badge / read-state UI based on `useStealthInbox`.
 *   • Adds a Claim-All button that runs sweeps sequentially.
 *   • Adds an Ignore button per row that writes to ObscuraInboxIndex.
 */
import { useState } from "react";
import { motion } from "framer-motion";
import { Card } from "@/components/elite/Layout";
import { Button } from "@/components/ui/button";
import {
  Loader2,
  Eye,
  EyeOff,
  Inbox,
  RefreshCw,
  CheckCheck,
  Ban,
  CheckCircle2,
  ArrowDownToLine,
  KeyRound,
  Lock,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useStealthInbox } from "@/hooks/useStealthInbox";
import { useStealthMetaAddress } from "@/hooks/useStealthMetaAddress";

export default function StealthInboxV2() {
  const inbox = useStealthInbox();
  const meta = useStealthMetaAddress();

  const [isSettingUp, setIsSettingUp] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [setupError, setSetupError] = useState<string | null>(null);

  const handleSetup = async () => {
    setIsSettingUp(true);
    setSetupError(null);
    try {
      await meta.generateAndPublish();
      await inbox.unlockInbox();
      toast.success("Private receiving enabled. Inbox unlocked for this session.");
    } catch (e) {
      setSetupError((e as Error).message);
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleUnlock = async () => {
    setIsUnlocking(true);
    setSetupError(null);
    try {
      await inbox.unlockInbox();
      toast.success("Inbox unlocked for this session.");
    } catch (e) {
      setSetupError((e as Error).message);
    } finally {
      setIsUnlocking(false);
    }
  };

  const handleLock = () => {
    inbox.lockInbox();
    toast.success("Inbox locked.");
  };

  if (!meta.keysMeta) {
    const busy = isSettingUp || meta.isPending;
    return (
      <Card className="p-6 space-y-5">
        {/* Hero */}
        <div className="flex flex-col items-center text-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-muted hairline flex items-center justify-center">
            <KeyRound className="w-6 h-6 text-foreground/60" />
          </div>
          <div>
            <h3 className="font-display text-base text-foreground mb-1">Enable private receiving</h3>
            <p className="text-[12px] text-muted-foreground leading-relaxed max-w-sm">
              Generate stealth keys once — senders can pay you at a unique private address each time.
              Your private key never leaves this device.
            </p>
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-2 max-w-md mx-auto">
          {[
            { n: "1", title: "Generate keys locally",   desc: "Spending + viewing keys — never leave your device." },
            { n: "2", title: "Sign to encrypt them",    desc: "One wallet signature secures your keys in local storage." },
            { n: "3", title: "Publish receive address", desc: "Public keys on-chain so senders can pay you privately." },
          ].map(({ n, title, desc }) => (
            <div key={n} className="flex gap-3 items-start rounded-xl bg-muted/40 hairline p-3">
              <span className="w-5 h-5 rounded-full bg-muted hairline flex items-center justify-center shrink-0 text-[10px] font-mono text-foreground/55">
                {n}
              </span>
              <div>
                <div className="text-[12px] font-medium text-foreground/85">{title}</div>
                <div className="text-[11px] text-muted-foreground/60">{desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-2 pt-2 border-t border-border/60">
          <motion.button
            onClick={() => void handleSetup()}
            disabled={busy}
            whileTap={{ scale: 0.98 }}
            className="btn-pay btn-pay-primary disabled:opacity-50 min-w-[220px]"
          >
            {busy ? (
              <>
                <svg className="animate-spin w-3.5 h-3.5 mr-2 shrink-0" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Setting up…
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                Enable private receiving
              </>
            )}
          </motion.button>
          {setupError && (
            <p className="text-[12px] text-red-400 text-center max-w-xs">{setupError}</p>
          )}
          <p className="text-[11px] text-muted-foreground/40">
            Requires 2 wallet interactions — sign to save keys, then confirm on-chain
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55 font-mono">
            Private inbox
          </div>
          <div className="text-[13px] text-foreground/90 flex items-center gap-2">
            {inbox.isUnlocked ? `${inbox.items.length} payment${inbox.items.length === 1 ? "" : "s"}` : "Locked"}
            {inbox.unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px]">
                {inbox.unreadCount} unread
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!inbox.isUnlocked ? (
            <Button
              size="sm"
              onClick={() => void handleUnlock()}
              disabled={isUnlocking || inbox.isScanning}
            >
              {isUnlocking ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 mr-1" />}
              Unlock inbox
            </Button>
          ) : (
            <Button variant="outline" size="sm" onClick={handleLock} disabled={inbox.isScanning}>
              <Lock className="w-3.5 h-3.5 mr-1" /> Lock
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void inbox.refresh()}
            disabled={!inbox.isUnlocked || inbox.isScanning}
          >
            {inbox.isScanning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <RefreshCw className="w-3.5 h-3.5" />
            )}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={inbox.markAllAsSeen}
            disabled={!inbox.isUnlocked || inbox.unreadCount === 0}
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
          </Button>
          <Button
            size="sm"
            onClick={() => void inbox.claimAll()}
            disabled={!inbox.isUnlocked || inbox.isClaimingAll || inbox.unclaimedCount === 0}
          >
            {inbox.isClaimingAll ? (
              <>
                <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> {inbox.sweepStepLabel}
              </>
            ) : (
              "Claim all"
            )}
          </Button>
        </div>
      </div>

      {inbox.scanError && (
        <div className="text-[12px] text-red-300 mb-3">{inbox.scanError}</div>
      )}
      {inbox.bulkError && (
        <div className="text-[12px] text-red-300 mb-3">{inbox.bulkError}</div>
      )}
      {setupError && (
        <div className="text-[12px] text-red-300 mb-3">{setupError}</div>
      )}
      {inbox.isUnlocked && inbox.scanSummary.scannedAt && (
        <div className="text-[11px] text-muted-foreground/55 mb-3">
          Scanned {inbox.scanSummary.indexedAnnouncements} indexed and {inbox.scanSummary.rpcAnnouncements} recent on-chain announcements.
        </div>
      )}

      {!inbox.isUnlocked ? (
        <div className="text-center py-8">
          <Lock className="w-6 h-6 mx-auto mb-2 text-foreground/60" />
          <div className="text-[13px] text-foreground/80 mb-1">Inbox locked</div>
          <p className="text-[12px] text-muted-foreground/60 max-w-xs mx-auto mb-4">
            Unlock once to scan indexed stealth announcements with your local viewing key. No scan runs until you unlock.
          </p>
          <Button size="sm" onClick={() => void handleUnlock()} disabled={isUnlocking}>
            {isUnlocking ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : <KeyRound className="w-3.5 h-3.5 mr-1" />}
            Unlock inbox
          </Button>
        </div>
      ) : inbox.items.length === 0 ? (
        <div className="text-center py-8">
          <Inbox className="w-6 h-6 mx-auto mb-2 text-foreground/60" />
          <div className="text-[13px] text-foreground/80 mb-1">Inbox empty</div>
          <p className="text-[12px] text-muted-foreground/60 max-w-xs mx-auto">
            No matching private payments found in indexed or recent on-chain announcements.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {inbox.items.map((m) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 p-3 rounded-md border ${
                m.claimed
                  ? "border-emerald-500/15 bg-emerald-500/[0.02] opacity-60"
                  : m.seen
                    ? "border-white/[0.06] bg-white/[0.02]"
                    : "border-emerald-500/30 bg-emerald-500/[0.04]"
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500/[0.1] border border-emerald-500/30 flex items-center justify-center">
                {m.claimed ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-foreground" />
                ) : m.seen ? (
                  <Eye className="w-3.5 h-3.5 text-muted-foreground/50" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-[hsl(var(--success))]" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-foreground/90 font-mono truncate">
                  {m.stealthAddress.slice(0, 10)}…{m.stealthAddress.slice(-6)}
                </div>
                <div className="text-[10px] text-muted-foreground/55 font-mono">
                  block #{m.blockNumber.toString()} · view-tag {m.viewTag}
                  {m.amount > 0n && (
                    <span className="text-[hsl(var(--success))]/80"> · {(Number(m.amount) / 1_000_000).toFixed(2)} ocUSDC</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {m.claimed ? (
                  <span className="text-[10px] text-foreground/60 font-mono uppercase tracking-wide px-2 py-1 rounded border border-emerald-500/20 bg-emerald-500/[0.06]">
                    Swept ✓
                  </span>
                ) : (
                  <>
                    {m.amount > 0n && (
                      <Button
                        size="sm"
                        onClick={() => void inbox.claimOne(m)}
                        disabled={inbox.isClaimingAll || inbox.sweepingId === m.id}
                        className="text-[11px]"
                      >
                        {inbox.sweepingId === m.id ? (
                          <Loader2 className="w-3 h-3 animate-spin mr-1" />
                        ) : (
                          <ArrowDownToLine className="w-3 h-3 mr-1" />
                        )}
                        Sweep
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => inbox.markAsSeen(m.id)}
                      disabled={m.seen}
                    >
                      Read
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => void inbox.ignoreSender(m.ephHash)}
                      title="Ignore this sender (on-chain bloom filter)"
                    >
                      <Ban className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
