/**
 * StealthInboxV2 — drop-in upgrade to the Wave 2 StealthInbox.
 *
 *   • Adds an unread badge / read-state UI based on `useStealthInbox`.
 *   • Adds a Claim-All button that runs sweeps sequentially.
 *   • Adds an Ignore button per row that writes to ObscuraInboxIndex.
 */
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
} from "lucide-react";
import { useStealthInbox } from "@/hooks/useStealthInbox";
import { useStealthMetaAddress } from "@/hooks/useStealthMetaAddress";

export default function StealthInboxV2() {
  const inbox = useStealthInbox();
  const meta = useStealthMetaAddress();

  if (!meta.keysMeta) {
    return (
      <Card className="p-6 text-center">
        <Inbox className="w-6 h-6 mx-auto mb-2 text-muted-foreground/40" />
        <div className="text-[13px] text-foreground/85 mb-1">No meta-address yet</div>
        <p className="text-[11px] text-muted-foreground/65 max-w-sm mx-auto">
          Generate a stealth meta-address from the Receive zone before you can
          scan for incoming stealth payments.
        </p>
      </Card>
    );
  }

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55 font-mono">
            Stealth inbox
          </div>
          <div className="text-[13px] text-foreground/90 flex items-center gap-2">
            {inbox.items.length} payment{inbox.items.length === 1 ? "" : "s"}
            {inbox.unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300 text-[10px]">
                {inbox.unreadCount} unread
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => void inbox.refresh()}
            disabled={inbox.isScanning}
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
            disabled={inbox.unreadCount === 0}
          >
            <CheckCheck className="w-3.5 h-3.5 mr-1" /> Mark all read
          </Button>
          <Button
            size="sm"
            onClick={() => void inbox.claimAll()}
            disabled={inbox.isClaimingAll || inbox.items.length === 0}
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

      {inbox.items.length === 0 ? (
        <div className="text-center py-6 text-[12px] text-muted-foreground/65">
          No incoming payments scanned yet.
        </div>
      ) : (
        <div className="space-y-2">
          {inbox.items.map((m) => (
            <div
              key={m.id}
              className={`flex items-center gap-3 p-3 rounded-md border ${
                m.seen
                  ? "border-white/[0.06] bg-white/[0.02]"
                  : "border-emerald-500/30 bg-emerald-500/[0.04]"
              }`}
            >
              <div className="w-7 h-7 rounded-full bg-emerald-500/[0.1] border border-emerald-500/30 flex items-center justify-center">
                {m.seen ? (
                  <Eye className="w-3.5 h-3.5 text-muted-foreground/50" />
                ) : (
                  <EyeOff className="w-3.5 h-3.5 text-emerald-300" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[12px] text-foreground/90 font-mono truncate">
                  {m.stealthAddress.slice(0, 10)}…{m.stealthAddress.slice(-6)}
                </div>
                <div className="text-[10px] text-muted-foreground/55 font-mono">
                  block #{m.blockNumber.toString()} · view-tag {m.viewTag}
                  {m.amount > 0n && (
                    <span className="text-emerald-300/80"> · {(Number(m.amount) / 1_000_000).toFixed(2)} cUSDC</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
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
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
