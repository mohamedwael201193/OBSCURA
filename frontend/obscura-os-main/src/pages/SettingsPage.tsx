/**
 * SettingsPage — exposes UX preferences (Beginner/Advanced, default send
 * mode, gas mode, stealth auto-rotate cadence, status bar visibility).
 *
 * Also surfaces Wave 3 destructive actions: rotate stealth meta-address,
 * reset inbox ignore filter, clear receipts.
 */
import { Link } from "react-router-dom";
import { ArrowLeft, RotateCw, Trash2, Settings as SettingsIcon } from "lucide-react";
import { Card, PageHeader } from "@/components/elite/Layout";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  usePreferences,
  type GasMode,
  type SendMode,
  type UIMode,
} from "@/contexts/PreferencesContext";
import { useStealthRotation } from "@/hooks/useStealthRotation";
import { useStealthInbox } from "@/hooks/useStealthInbox";
import { useReceipts } from "@/hooks/useReceipts";

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <Card className="p-5 mb-4">
    <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/55 font-mono mb-3">
      {title}
    </div>
    {children}
  </Card>
);

const RowLabel = ({ children }: { children: React.ReactNode }) => (
  <Label className="text-[12px] text-foreground/80">{children}</Label>
);

const PrettySelect = ({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: React.ReactNode;
}) => (
  <div className="relative inline-block">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="appearance-none bg-gradient-to-b from-white/[0.05] to-white/[0.02] border border-white/10 hover:border-emerald-500/30 focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/30 rounded-md pl-3 pr-8 py-1.5 text-[12px] font-mono text-foreground transition-colors cursor-pointer min-w-[140px]"
    >
      {children}
    </select>
    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-300/70" viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

export default function SettingsPage() {
  const prefs = usePreferences();
  const rotation = useStealthRotation();
  const inbox = useStealthInbox();
  const receipts = useReceipts();

  return (
    <div className="min-h-screen bg-background py-12 px-6">
      <div className="max-w-3xl mx-auto">
        <Link
          to="/pay"
          className="inline-flex items-center gap-1.5 text-[12px] text-muted-foreground/70 hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Pay
        </Link>

        <PageHeader
          breadcrumb={["Pay", "Settings"]}
          title="Settings"
          lede="UX preferences and privacy maintenance. None of these are stored on chain."
        />

        <Section title="Interface">
          <div className="grid grid-cols-[1fr_auto] gap-y-4 items-center">
            <RowLabel>UI mode</RowLabel>
            <PrettySelect value={prefs.uiMode} onChange={(v) => prefs.setPreference("uiMode", v as UIMode)}>
              <option value="beginner" className="bg-[#0a0d12]">Beginner</option>
              <option value="advanced" className="bg-[#0a0d12]">Advanced</option>
            </PrettySelect>

            <RowLabel>Default send mode</RowLabel>
            <PrettySelect value={prefs.defaultSendMode} onChange={(v) => prefs.setPreference("defaultSendMode", v as SendMode)}>
              <option value="direct" className="bg-[#0a0d12]">Direct</option>
              <option value="stealth" className="bg-[#0a0d12]">Stealth</option>
              <option value="cross-chain" className="bg-[#0a0d12]">Cross-chain</option>
            </PrettySelect>

            <RowLabel>Gas mode</RowLabel>
            <PrettySelect value={prefs.gasMode} onChange={(v) => prefs.setPreference("gasMode", v as GasMode)}>
              <option value="fast" className="bg-[#0a0d12]">Fast</option>
              <option value="standard" className="bg-[#0a0d12]">Standard</option>
              <option value="eco" className="bg-[#0a0d12]">Eco</option>
            </PrettySelect>
          </div>
        </Section>

        <Section title="Stealth privacy">
          <div className="space-y-3">
            <div className="grid grid-cols-[1fr_auto] gap-y-3 items-center">
              <RowLabel>Auto-rotate meta-address every (days, 0 = off)</RowLabel>
              <input
                type="number"
                min={0}
                max={365}
                value={prefs.stealthAutoRotateDays}
                onChange={(e) =>
                  prefs.setPreference("stealthAutoRotateDays", Number(e.target.value) || 0)
                }
                className="bg-white/[0.04] border border-white/10 rounded-md px-3 py-1.5 w-24 text-[12px]"
              />
            </div>
            <div className="text-[11px] text-muted-foreground/55">
              Current meta index:{" "}
              <span className="text-foreground/80 font-mono">
                {rotation.current ? rotation.current.index.toString() : "—"}
              </span>{" "}
              · history length: {rotation.historyLength.toString()}
            </div>
            <Button
              variant="outline"
              onClick={() => void rotation.rotate()}
              disabled={rotation.isPending}
            >
              <RotateCw className="w-3.5 h-3.5 mr-1.5" />
              Rotate now
            </Button>
            {rotation.error && (
              <div className="text-[11px] text-red-300">{rotation.error}</div>
            )}
          </div>
        </Section>

        <Section title="Inbox filter">
          <p className="text-[12px] text-muted-foreground/70 mb-3 leading-relaxed">
            The on-chain ignore filter is a per-recipient bloom. Resetting clears
            it (other senders you ignored will start showing up again).
          </p>
          <Button
            variant="outline"
            onClick={() => void inbox.resetFilter()}
          >
            <RotateCw className="w-3.5 h-3.5 mr-1.5" />
            Reset ignore filter
          </Button>
        </Section>

        <Section title="Local data">
          <p className="text-[12px] text-muted-foreground/70 mb-3 leading-relaxed">
            Receipts are stored only in this browser. Export before clearing if
            you want to keep proofs of payment.
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => receipts.exportJSON()}>
              Export receipts
            </Button>
            <Button variant="outline" onClick={() => receipts.clear()}>
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Clear receipts ({receipts.receipts.length})
            </Button>
          </div>
        </Section>

        <Section title="Onboarding">
          <Button variant="outline" onClick={() => prefs.setPreference("hasCompletedOnboarding", false)}>
            <SettingsIcon className="w-3.5 h-3.5 mr-1.5" />
            Replay onboarding wizard
          </Button>
        </Section>
      </div>
    </div>
  );
}
