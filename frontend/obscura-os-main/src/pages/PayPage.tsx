import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import {
  Send,
  ArrowDownToLine,
  Repeat,
  Shield,
  Lock,
  Network,
  Wallet as WalletIcon,
  ShieldCheck,
  Umbrella,
  Wrench,
  Settings as SettingsIcon,
  BookUser,
  RotateCw,
  Trash2,
  Plus,
  Pencil,
  Check,
  X,
  Loader2,
} from "lucide-react";

import SectionDiagram from "@/components/elite/SectionDiagram";
import { HarmonyAppShell } from "@/components/harmony/HarmonyAppShell";
import { HarmonyFormCard, HarmonySection } from "@/components/harmony/harmony-ui";
import { PayHarmonyHome } from "@/components/harmony/PayHarmonyHome";
import {
  PayHarmonyDetails,
  PayHarmonyNotConnected,
  PayHarmonyNotice,
  PayHarmonyPanelCard,
  PayHarmonySendBar,
  PayHarmonyTabShell,
} from "@/components/harmony/PayHarmonyTabShell";

import OcUSDCTransferForm from "@/components/pay-v4/OcUSDCTransferForm";
import OcUSDCEscrowForm from "@/components/pay-v4/OcUSDCEscrowForm";
import OcUSDCEscrowActions from "@/components/pay-v4/OcUSDCEscrowActions";
import MyEscrows from "@/components/pay-v4/MyEscrows";
import BatchEscrowForm from "@/components/pay-v4/BatchEscrowForm";
import ClaimEscrowCard from "@/components/pay-v4/ClaimEscrowCard";
import InvoiceForm from "@/components/pay-v4/InvoiceForm";
import InvoicePayCard from "@/components/pay-v4/InvoicePayCard";
import CreateStreamForm from "@/components/pay-v4/CreateStreamForm";
import CreateStreamFormV2 from "@/components/pay-v4/CreateStreamFormV2";
import StreamList from "@/components/pay-v4/StreamList";
import OcUSDCPanel from "@/components/pay-v4/OcUSDCPanel";
import RegisterMetaAddressForm from "@/components/pay-v4/RegisterMetaAddressForm";
import StealthInbox from "@/components/pay-v4/StealthInbox";
import StealthInboxV2 from "@/components/pay-v4/StealthInboxV2";
import CrossChainFundForm from "@/components/pay-v4/CrossChainFundForm";
import BuyCoverageForm from "@/components/pay-v4/BuyCoverageForm";
import DisputeForm from "@/components/pay-v4/DisputeForm";
import StakePoolForm from "@/components/pay-v4/StakePoolForm";
import MyPolicies from "@/components/pay-v4/MyPolicies";
import ResolverManager from "@/components/pay-v4/ResolverManager";
import UnifiedSendForm from "@/components/pay-v4/UnifiedSendForm";
import BulkPayrollImport from "@/components/pay-v4/BulkPayrollImport";
import StreamsDashboard from "@/components/pay-v4/StreamsDashboard";
import SubscriptionForm from "@/components/pay-v4/SubscriptionForm";
import { ReceiptList } from "@/components/pay-v4/PaymentReceipt";
import AddContactModal from "@/components/pay-v4/AddContactModal";
import NewPaymentBanner from "@/components/pay-v4/NewPaymentBanner";

import { useOcUSDCBalance } from "@/hooks/useOcUSDCBalance";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import UsdcIcon from "@/components/shared/UsdcIcon";
import { useStealthInbox } from "@/hooks/useStealthInbox";
import { usePreferences, type GasMode, type SendMode, type UIMode } from "@/contexts/PreferencesContext";
import { useStealthRotation } from "@/hooks/useStealthRotation";
import { useReceipts } from "@/hooks/useReceipts";
import { useAddressBook } from "@/hooks/useAddressBook";
import { Input } from "@/components/ui/input";

type Tab =
  | "home"
  | "send"
  | "receive"
  | "streams"
  | "escrow"
  | "insurance"
  | "advanced"
  | "contacts"
  | "settings";

const basePayNav: { key: Tab; label: string }[] = [
  { key: "home", label: "Overview" },
  { key: "send", label: "Send" },
  { key: "receive", label: "Receive" },
  { key: "streams", label: "Streams" },
  { key: "escrow", label: "Escrow" },
  { key: "insurance", label: "Insurance" },
  { key: "contacts", label: "Contacts" },
  { key: "settings", label: "Settings" },
  { key: "advanced", label: "Legacy" },
];

function PayTabNotConnected({ tab, message }: { tab: Parameters<typeof PayHarmonyTabShell>[0]["tab"]; message: string }) {
  return (
    <PayHarmonyTabShell tab={tab}>
      <PayHarmonyNotConnected message={message} />
    </PayHarmonyTabShell>
  );
}

// ── Settings Panel (rendered inside PayPage as a tab) ──────────────────────
const PrettySelect = ({ value, onChange, children }: { value: string; onChange: (v: string) => void; children: React.ReactNode }) => (
  <div className="relative inline-block">
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="pay-select pr-8 min-w-[160px]"
    >
      {children}
    </select>
    <svg className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-300/70" viewBox="0 0 12 12" fill="none">
      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);

const SettingsPanel = () => {
  const prefs = usePreferences();
  const rotation = useStealthRotation();
  const inbox = useStealthInbox();
  const receipts = useReceipts();

  return (
    <PayHarmonyTabShell tab="settings">
      <HarmonyFormCard title="Interface" eyebrow="UX">
        <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-y-4 items-center">
          <label className="text-[12px] text-foreground/80">UI mode</label>
          <PrettySelect value={prefs.uiMode} onChange={(v) => prefs.setPreference("uiMode", v as UIMode)}>
            <option value="beginner" className="bg-[#0a0d12]">Beginner</option>
            <option value="advanced" className="bg-[#0a0d12]">Advanced</option>
          </PrettySelect>

          <label className="text-[12px] text-foreground/80">Default send mode</label>
          <PrettySelect value={prefs.defaultSendMode} onChange={(v) => prefs.setPreference("defaultSendMode", v as SendMode)}>
            <option value="direct" className="bg-[#0a0d12]">Direct</option>
            <option value="stealth" className="bg-[#0a0d12]">Stealth</option>
            <option value="cross-chain" className="bg-[#0a0d12]">Cross-chain</option>
          </PrettySelect>

          <label className="text-[12px] text-foreground/80">Gas mode</label>
          <PrettySelect value={prefs.gasMode} onChange={(v) => prefs.setPreference("gasMode", v as GasMode)}>
            <option value="fast" className="bg-[#0a0d12]">Fast</option>
            <option value="standard" className="bg-[#0a0d12]">Standard</option>
            <option value="eco" className="bg-[#0a0d12]">Eco</option>
          </PrettySelect>
        </div>
        </div>
      </HarmonyFormCard>

      <HarmonyFormCard title="Stealth privacy" eyebrow="Meta-address">
        <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-y-3 items-center">
          <label className="text-[12px] text-foreground/80 pr-4">Auto-rotate meta-address every (days, 0 = off)</label>
          <input
            type="number"
            min={0}
            max={365}
            value={prefs.stealthAutoRotateDays}
            onChange={(e) => prefs.setPreference("stealthAutoRotateDays", Number(e.target.value) || 0)}
            className="pay-input w-24 text-center"
          />
        </div>
        <div className="text-[11px] text-muted-foreground/55">
          Current meta index:{" "}
          <span className="text-foreground/80 font-mono">{rotation.current ? rotation.current.index.toString() : "—"}</span>
          {" "}· history length: {rotation.historyLength.toString()}
        </div>
        <button
          onClick={() => void rotation.rotate()}
          disabled={rotation.isPending}
          className="btn-pay btn-pay-ghost"
        >
          <RotateCw className="w-3.5 h-3.5" />
          {rotation.isPending ? "Rotating…" : "Rotate now"}
        </button>
        {rotation.error && <div className="text-[11px] text-destructive">{rotation.error}</div>}
        </div>
      </HarmonyFormCard>

      <HarmonyFormCard title="Inbox filter" eyebrow="On-chain">
        <div className="space-y-3">
        <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
          The on-chain ignore filter is a per-recipient bloom. Resetting clears it — senders you ignored will reappear.
        </p>
        <button onClick={() => void inbox.resetFilter()} className="btn-pay btn-pay-ghost">
          <RotateCw className="w-3.5 h-3.5" />
          Reset ignore filter
        </button>
        </div>
      </HarmonyFormCard>

      <HarmonyFormCard title="Local data" eyebrow="Receipts">
        <div className="space-y-3">
        <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
          Receipts are stored only in this browser. Export before clearing if you want to keep proofs of payment.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => receipts.exportJSON()} className="btn-pay btn-pay-ghost">
            Export receipts
          </button>
          <button onClick={() => receipts.clear()} className="btn-pay btn-pay-ghost">
            <Trash2 className="w-3.5 h-3.5 text-red-400" />
            <span className="text-red-400">Clear receipts ({receipts.receipts.length})</span>
          </button>
        </div>
        </div>
      </HarmonyFormCard>

      <HarmonyFormCard title="Onboarding" eyebrow="Wizard">
        <button type="button" onClick={() => prefs.setPreference("hasCompletedOnboarding", false)} className="btn-pay btn-pay-ghost">
          <SettingsIcon className="w-3.5 h-3.5" />
          Replay onboarding wizard
        </button>
      </HarmonyFormCard>
    </PayHarmonyTabShell>
  );
};

// ── Contacts Panel (rendered inside PayPage as a tab) ───────────────────────
const ContactsPanel = () => {
  const { contacts, isLoading, isPending, error, refresh, removeContact, relabel } = useAddressBook();
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftLabel, setDraftLabel] = useState("");

  const startEdit = (id: string, current: string | null) => {
    setEditingId(id);
    setDraftLabel(current ?? "");
  };

  const saveEdit = async (cidStr: string) => {
    if (!draftLabel.trim()) return;
    try {
      await relabel(BigInt(cidStr), draftLabel.trim());
      setEditingId(null);
    } catch { /* error surfaced in UI */ }
  };

  return (
    <PayHarmonyTabShell
      tab="contacts"
      actions={
        <>
          <button
            type="button"
            onClick={() => void refresh()}
            disabled={isLoading}
            className="inline-flex h-10 items-center gap-2 rounded-full hairline px-4 text-sm hover:bg-muted"
          >
            {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCw className="h-3.5 w-3.5" />}
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-flex h-10 items-center gap-2 rounded-full bg-foreground px-4 text-sm font-medium text-background"
          >
            <Plus className="h-3.5 w-3.5" />
            Add contact
          </button>
        </>
      }
    >
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>
      )}

      {contacts.length === 0 && !isLoading ? (
        <HarmonyFormCard title="No contacts yet" eyebrow="Address book">
          <div className="py-8 text-center">
            <BookUser className="mx-auto h-8 w-8 text-muted-foreground/40" />
            <p className="mx-auto mt-4 max-w-sm text-sm text-muted-foreground">
              Add a contact to send encrypted payments without retyping addresses.
            </p>
            <button type="button" onClick={() => setOpen(true)} className="btn-pay btn-pay-emerald mt-6">
              <Plus className="w-3.5 h-3.5" />
              Add your first contact
            </button>
          </div>
        </HarmonyFormCard>
      ) : (
        <div className="space-y-2">
          {contacts.map((c) => {
            const idStr = c.contactId.toString();
            const isEditing = editingId === idStr;
            return (
              <motion.div
                key={idStr}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-3 rounded-2xl hairline bg-card p-4"
              >
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-muted font-mono text-[11px]">
                  {idStr}
                </div>
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <Input
                      value={draftLabel}
                      onChange={(e) => setDraftLabel(e.target.value)}
                      autoFocus
                      className="text-[12px] bg-white/[0.03] border-white/[0.09] focus:border-cyan-500/40"
                    />
                  ) : (
                    <div className="text-[13px] text-foreground truncate">
                      {c.label ?? <span className="text-muted-foreground/40">Contact #{idStr}</span>}
                    </div>
                  )}
                  <div className="text-[10px] text-muted-foreground/35 font-mono truncate mt-0.5">
                    {c.labelHash} · {new Date(Number(c.createdAt) * 1000).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button onClick={() => void saveEdit(idStr)} disabled={isPending} className="p-1.5 hover:bg-white/[0.06] rounded-md text-emerald-400 transition-colors">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => setEditingId(null)} disabled={isPending} className="p-1.5 hover:bg-white/[0.06] rounded-md text-muted-foreground/50 transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button onClick={() => startEdit(idStr, c.label)} disabled={isPending} className="p-1.5 hover:bg-white/[0.06] rounded-md text-muted-foreground/50 hover:text-foreground transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => void removeContact(c.contactId)} disabled={isPending} className="p-1.5 hover:bg-white/[0.06] rounded-md text-muted-foreground/50 hover:text-red-400 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AddContactModal open={open} onClose={() => setOpen(false)} />
    </PayHarmonyTabShell>
  );
};

const PayPage = () => {
  const { isConnected } = useAccount();
  const inbox = useStealthInbox();
  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "home";
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      // Auto-route claim & invoice links to escrow tab even when ?tab is omitted.
      if (params.get("claim")) return "escrow";
      if (params.get("invoice")) return "escrow";
      if (t) return t as Tab;
    } catch { /* ignore */ }
    return "home";
  });
  const [streamRefreshKey, setStreamRefreshKey] = useState(0);
  const refreshStreams = () => setStreamRefreshKey((k) => k + 1);

  const harmonySidebar = basePayNav.map((item) => ({
    key: item.key,
    label: item.label,
    active: tab === item.key,
    badge:
      item.key === "receive" && inbox.unreadCount > 0 ? String(inbox.unreadCount) : undefined,
    onClick: () => setTab(item.key),
  }));

  const renderActiveSection = () => {
    switch (tab) {
      case "home":
        return <PayHarmonyHome onNavigate={(t) => setTab(t)} />;

      case "send":
        if (!isConnected) {
          return <PayTabNotConnected tab="send" message="Connect your wallet to send encrypted ocUSDC payments." />;
        }
        return (
          <PayHarmonyTabShell tab="send">
            <PayHarmonySendBar
              onShield={() => document.getElementById("send-encrypt-panel")?.scrollIntoView({ behavior: "smooth" })}
            />
            <PayHarmonyPanelCard title="Quick send" eyebrow="Encrypted transfer">
              <UnifiedSendForm />
            </PayHarmonyPanelCard>
            <PayHarmonyPanelCard title="Bridge USDC into Arbitrum" eyebrow="Cross-chain · CCTP">
              <CrossChainFundForm />
            </PayHarmonyPanelCard>
            <HarmonySection title="Payment flow" hint="What happens on-chain">
              <div className="rounded-2xl hairline bg-card p-6">
                <SectionDiagram flow="send" />
              </div>
            </HarmonySection>
            <div id="send-encrypt-panel">
              <PayHarmonyPanelCard title="Shield · Unshield ocUSDC" eyebrow="Get ocUSDC">
                <OcUSDCPanel />
              </PayHarmonyPanelCard>
            </div>
          </PayHarmonyTabShell>
        );

      case "receive":
        if (!isConnected) {
          return <PayTabNotConnected tab="receive" message="Connect your wallet to set up private receiving." />;
        }
        return (
          <PayHarmonyTabShell tab="receive">
            <PayHarmonyPanelCard title="Register stealth meta-address" eyebrow="Step 1">
              <RegisterMetaAddressForm />
            </PayHarmonyPanelCard>
            <HarmonyFormCard title="Stealth inbox" eyebrow="Scan · Claim" noPadding>
              <StealthInboxV2 />
            </HarmonyFormCard>
            <PayHarmonyPanelCard title="Streams paying you" eyebrow="Inbound">
              <StreamList mode="recipient" />
            </PayHarmonyPanelCard>
            <HarmonySection title="Receive flow" hint="End-to-end">
              <div className="rounded-2xl hairline bg-card p-6">
                <SectionDiagram flow="receive" />
              </div>
            </HarmonySection>
          </PayHarmonyTabShell>
        );

      case "streams":
        if (!isConnected) {
          return <PayTabNotConnected tab="streams" message="Connect your wallet to create payroll streams." />;
        }
        return (
          <PayHarmonyTabShell tab="streams">
            <PayHarmonyPanelCard title="Confidential subscription" eyebrow="Subscriptions">
              <SubscriptionForm onCreated={refreshStreams} />
            </PayHarmonyPanelCard>
            <div className="harmony-form-inner rounded-2xl hairline bg-card p-6">
              <StreamsDashboard
                onNavigate={(t) => setTab(t)}
                refreshKey={streamRefreshKey}
                onRefresh={refreshStreams}
              />
            </div>
          </PayHarmonyTabShell>
        );

      case "escrow": {
        if (!isConnected) {
          return <PayTabNotConnected tab="escrow" message="Connect your wallet to manage encrypted escrows." />;
        }
        // Read ?claim and ?contract on every render so the hero card stays
        // visible after the user redeems and we don't have to remount.
        let claimId: string | null = null;
        let invoiceId: string | null = null;
        let contractParam: string | null = null;
        if (typeof window !== "undefined") {
          try {
            const params = new URLSearchParams(window.location.search);
            const c = params.get("claim");
            if (c && /^\d+$/.test(c)) claimId = c;
            const inv = params.get("invoice");
            if (inv && /^\d+$/.test(inv)) invoiceId = inv;
            contractParam = params.get("contract");
          } catch { /* ignore */ }
        }
        return (
          <PayHarmonyTabShell tab="escrow">
            {invoiceId && <InvoicePayCard invoiceId={invoiceId} contractParam={contractParam} />}
            {claimId && <ClaimEscrowCard claimId={claimId} contractParam={contractParam} />}

            <div id="create-escrow-anchor">
              <PayHarmonyPanelCard title="Create an escrow" eyebrow="Send · Confidential">
                <OcUSDCEscrowForm />
              </PayHarmonyPanelCard>
            </div>

            <PayHarmonyDetails eyebrow="Send · Batch" title="Confidential batch payroll — up to 20 in one tx">
              <BatchEscrowForm />
            </PayHarmonyDetails>

            {!claimId && (
              <PayHarmonyPanelCard title="Claim / Redeem by escrow ID" eyebrow="Receive · Claim link">
                <OcUSDCEscrowActions />
              </PayHarmonyPanelCard>
            )}

            <PayHarmonyPanelCard title="Request a private payment" eyebrow="Confidential invoice">
              <InvoiceForm />
            </PayHarmonyPanelCard>

            <PayHarmonyPanelCard title="Your escrows" eyebrow="Manage">
              <MyEscrows />
            </PayHarmonyPanelCard>

            <PayHarmonyDetails eyebrow="Advanced" title="Resolver-gated escrows (time-locks & approvers)">
              <ResolverManager />
            </PayHarmonyDetails>
          </PayHarmonyTabShell>
        );
      }

      case "insurance":
        if (!isConnected) {
          return <PayTabNotConnected tab="insurance" message="Connect your wallet to buy or manage insurance." />;
        }
        return (
          <PayHarmonyTabShell tab="insurance">
            <div id="buy-coverage-anchor">
              <PayHarmonyPanelCard title="Buy coverage" eyebrow="Insurance">
                <BuyCoverageForm />
              </PayHarmonyPanelCard>
            </div>
            <PayHarmonyPanelCard title="Your policies" eyebrow="Active">
              <MyPolicies />
            </PayHarmonyPanelCard>
            <PayHarmonyPanelCard title="File a dispute" eyebrow="Claims">
              <DisputeForm />
            </PayHarmonyPanelCard>
            <PayHarmonyPanelCard title="Earn yield as an LP" eyebrow="Optional">
              <StakePoolForm />
            </PayHarmonyPanelCard>
          </PayHarmonyTabShell>
        );

      case "advanced":
        if (!isConnected) {
          return <PayTabNotConnected tab="advanced" message="Connect your wallet to access legacy V1 surfaces." />;
        }
        return (
          <PayHarmonyTabShell tab="advanced">
            <PayHarmonyNotice title="Legacy V1 surfaces.">
              Deprecated forms for old escrows and streams. Use Send, Streams, or Escrow for new payments.
            </PayHarmonyNotice>
            <PayHarmonyPanelCard title="Legacy direct ocUSDC transfer" eyebrow="V1">
              <OcUSDCTransferForm />
            </PayHarmonyPanelCard>
            <PayHarmonyPanelCard title="Legacy stream creator" eyebrow="V1">
              <CreateStreamForm onCreated={refreshStreams} />
            </PayHarmonyPanelCard>
            <PayHarmonyPanelCard title="Legacy stealth inbox" eyebrow="V1">
              <StealthInbox />
            </PayHarmonyPanelCard>
            <PayHarmonyPanelCard title="All receipts" eyebrow="Local data">
              <ReceiptList />
            </PayHarmonyPanelCard>
          </PayHarmonyTabShell>
        );

      case "settings":
        return <SettingsPanel />;

      case "contacts":
        return <ContactsPanel />;
    }
  };

  return (
    <HarmonyAppShell appName="Pay" sidebar={harmonySidebar} searchPlaceholder="Search pay…">
      {isConnected && tab !== "receive" && tab !== "home" && (
        <NewPaymentBanner onOpenInbox={() => setTab("receive")} />
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          {renderActiveSection()}
        </motion.div>
      </AnimatePresence>
    </HarmonyAppShell>
  );
};

export default PayPage;
