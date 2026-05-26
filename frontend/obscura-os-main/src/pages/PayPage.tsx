import { useState, useRef, useEffect } from "react";
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
  Inbox,
  FileText,
  Mail,
  Repeat2,
  CalendarClock,
  Users,
  Database,
  KeyRound,
} from "lucide-react";

import SectionDiagram from "@/components/elite/SectionDiagram";
import { HarmonyAppShell } from "@/components/harmony/HarmonyAppShell";
import { HarmonyDrawer, HarmonyFormCard, HarmonyMetricRow, HarmonySection, HarmonySelect, HarmonySubNav, HarmonyWorkspaceHeader } from "@/components/harmony/harmony-ui";
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
import ReceivablesHub from "@/components/pay-v4/ReceivablesHub";
import ResolverManager from "@/components/pay-v4/ResolverManager";
import UnifiedSendForm from "@/components/pay-v4/UnifiedSendForm";
import BulkPayrollImport from "@/components/pay-v4/BulkPayrollImport";
import StreamsDashboard from "@/components/pay-v4/StreamsDashboard";
import SubscriptionForm from "@/components/pay-v4/SubscriptionForm";
import { ReceiptList } from "@/components/pay-v4/PaymentReceipt";
import { ActivityFeed } from "@/components/harmony/ActivityFeed";
import AddContactModal from "@/components/pay-v4/AddContactModal";
import NewPaymentBanner from "@/components/pay-v4/NewPaymentBanner";

import { useOcUSDCBalance } from "@/hooks/useOcUSDCBalance";
import { useUSDCBalance } from "@/hooks/useUSDCBalance";
import { useOnboardingState } from "@/hooks/useOnboardingState";
import UsdcIcon from "@/components/shared/UsdcIcon";
import { useStealthInbox } from "@/hooks/useStealthInbox";
import { usePreferences, type GasMode, type SendMode, type UIMode } from "@/contexts/PreferencesContext";
import { useStealthRotation } from "@/hooks/useStealthRotation";
import { useReceipts } from "@/hooks/useReceipts";
import { useAddressBook } from "@/hooks/useAddressBook";
import { Input } from "@/components/ui/input";
import { useNotificationPrefs } from "@/hooks/useNotificationPrefs";
import { useSmartAccount } from "@/hooks/useSmartAccount";
import { useOcUSDCTransfer } from "@/hooks/useOcUSDCTransfer";
import { PasskeyEnrollModal } from "@/components/harmony/PasskeyEnrollModal";
import { PaymentModeProvider } from "@/contexts/PaymentModeContext";
import { PaymentModeBar } from "@/components/harmony/PaymentModeBar";

// W5P1.5 — IA refactor: 9 tabs collapsed to 6 user-intent tabs
type Tab =
  | "home"
  | "pay"
  | "getpaid"
  | "automations"
  | "activity"
  | "settings";

const basePayNav: { key: Tab; label: string }[] = [
  { key: "home", label: "Overview" },
  { key: "pay", label: "Pay" },
  { key: "getpaid", label: "Get Paid" },
  { key: "automations", label: "Automations" },
  { key: "activity", label: "Activity" },
  { key: "settings", label: "Settings" },
];

function PayTabNotConnected({ tab, message }: { tab: Parameters<typeof PayHarmonyTabShell>[0]["tab"]; message: string }) {
  return (
    <PayHarmonyTabShell tab={tab}>
      <PayHarmonyNotConnected message={message} />
    </PayHarmonyTabShell>
  );
}

// ── Settings sub-panels (content only — shells rendered by renderActiveSection) ───
const SettingsPrefsCard = () => {
  const prefs = usePreferences();
  return (
    <>
      <HarmonyFormCard title="Interface" eyebrow="UX">
        <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto] gap-y-4 items-center">
          <label className="text-[12px] text-foreground/80">UI mode</label>
          <HarmonySelect value={prefs.uiMode} onChange={(v) => prefs.setPreference("uiMode", v as UIMode)}>
            <option value="beginner">Beginner</option>
            <option value="advanced">Advanced</option>
          </HarmonySelect>

          <label className="text-[12px] text-foreground/80">Default send mode</label>
          <HarmonySelect value={prefs.defaultSendMode} onChange={(v) => prefs.setPreference("defaultSendMode", v as SendMode)}>
            <option value="direct">Direct</option>
            <option value="stealth">Stealth</option>
            <option value="cross-chain">Cross-chain</option>
          </HarmonySelect>

          <label className="text-[12px] text-foreground/80">Gas mode</label>
          <HarmonySelect value={prefs.gasMode} onChange={(v) => prefs.setPreference("gasMode", v as GasMode)}>
            <option value="fast">Fast</option>
            <option value="standard">Standard</option>
            <option value="eco">Eco</option>
          </HarmonySelect>
        </div>
        </div>
      </HarmonyFormCard>

      <HarmonyFormCard title="Onboarding" eyebrow="Wizard">
        <button type="button" onClick={() => prefs.setPreference("hasCompletedOnboarding", false)} className="btn-pay btn-pay-ghost">
          <SettingsIcon className="w-3.5 h-3.5" />
          Replay onboarding wizard
        </button>
      </HarmonyFormCard>
    </>
  );
};

const SettingsPrivacyCard = () => {
  const prefs = usePreferences();
  const rotation = useStealthRotation();
  const inbox = useStealthInbox();
  return (
    <>
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
    </>
  );
};

const SettingsDataCard = () => {
  const receipts = useReceipts();
  return (
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
  );
};

const SettingsNotificationsCard = () => {
  const { prefs, isLoading, pushSupported, enable, disable, savePrefs } = useNotificationPrefs();
  const [email, setEmail] = useState(prefs?.email ?? "");
  const [saving, setSaving] = useState(false);

  const handleEmailSave = async () => {
    setSaving(true);
    try { await savePrefs({ email, email_enabled: !!email }); } finally { setSaving(false); }
  };

  return (
    <>
      <HarmonyFormCard title="Push notifications" eyebrow="Browser">
        <div className="space-y-4">
          {!pushSupported && (
            <p className="text-[12px] text-muted-foreground/60">
              Your browser does not support Web Push. Use Chrome, Edge, or Firefox desktop.
            </p>
          )}
          {pushSupported && (
            <div className="grid grid-cols-[1fr_auto] gap-y-3 items-center">
              <label className="text-[12px] text-foreground/80">Push alerts</label>
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <button
                  type="button"
                  onClick={prefs?.push_enabled ? disable : enable}
                  className={`btn-pay ${prefs?.push_enabled ? "btn-pay-primary" : "btn-pay-ghost"}`}
                >
                  {prefs?.push_enabled ? "Enabled" : "Enable"}
                </button>
              )}
            </div>
          )}
          {prefs?.push_enabled && (
            <p className="text-[11px] text-muted-foreground/55">
              You will receive push notifications for on-chain activity linked to your wallet.
            </p>
          )}
        </div>
      </HarmonyFormCard>

      <HarmonyFormCard title="Email notifications" eyebrow="Optional">
        <div className="space-y-3">
          <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
            Receive email summaries for payments received. Your email is stored server-side and never shared.
          </p>
          <div className="flex gap-2 items-center">
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pay-input flex-1"
            />
            <button
              type="button"
              disabled={saving || !email}
              onClick={handleEmailSave}
              className="btn-pay btn-pay-ghost"
            >
              {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
              Save
            </button>
          </div>
          {prefs?.email_enabled && prefs.email && (
            <p className="text-[11px] text-[#2D6A4F]">
              Email alerts active · {prefs.email}
            </p>
          )}
        </div>
      </HarmonyFormCard>
    </>
  );
};

const SettingsSmartAccountCard = () => {
  const { accountAddress, isDeployed, hasPasskey, status, error } = useSmartAccount();
  const { checkIsOperator, approveSmartOperator } = useOcUSDCTransfer();
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [operatorApproved, setOperatorApproved] = useState<boolean | null>(null);
  const [operatorBusy, setOperatorBusy] = useState(false);
  const [operatorError, setOperatorError] = useState<string | null>(null);

  useEffect(() => {
    if (!isDeployed || !hasPasskey || !accountAddress) {
      setOperatorApproved(null);
      return;
    }

    let cancelled = false;
    checkIsOperator(accountAddress)
      .then((approved) => {
        if (!cancelled) setOperatorApproved(approved);
      })
      .catch(() => {
        if (!cancelled) setOperatorApproved(null);
      });

    return () => { cancelled = true; };
  }, [isDeployed, hasPasskey, accountAddress, checkIsOperator]);

  const handleApproveOperator = async () => {
    if (!accountAddress) return;
    setOperatorBusy(true);
    setOperatorError(null);
    try {
      await approveSmartOperator(accountAddress);
      setOperatorApproved(true);
    } catch (e) {
      setOperatorError(e instanceof Error ? e.message : String(e));
    } finally {
      setOperatorBusy(false);
    }
  };

  return (
    <>
      <HarmonyFormCard title="Smart account" eyebrow="ERC-4337 · Passkey">
        <div className="space-y-4">
          <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
            Enable a gasless smart account secured by a device passkey (WebAuthn). Once enrolled, you can send
            transactions without managing gas fees.
          </p>

          <div className="grid grid-cols-[1fr_auto] gap-y-3 items-center text-[12px]">
            <span className="text-foreground/80">Account address</span>
            <span className="font-mono text-[11px] text-muted-foreground/60 truncate max-w-[160px]">
              {accountAddress ? `${accountAddress.slice(0, 8)}…${accountAddress.slice(-6)}` : "—"}
            </span>

            <span className="text-foreground/80">Deployed</span>
            <span className={isDeployed ? "text-[#2D6A4F]" : "text-muted-foreground/55"}>
              {isDeployed ? "Yes" : "No"}
            </span>

            <span className="text-foreground/80">Passkey</span>
            <span className={hasPasskey ? "text-[#2D6A4F]" : "text-muted-foreground/55"}>
              {hasPasskey ? "Enrolled" : "Not enrolled"}
            </span>

            <span className="text-foreground/80">Status</span>
            <span className="capitalize text-muted-foreground/60">{status}</span>

            <span className="text-foreground/80">ocUSDC smart sends</span>
            <span className={operatorApproved ? "text-[#2D6A4F]" : "text-muted-foreground/55"}>
              {operatorApproved === null ? "—" : operatorApproved ? "Enabled" : "Needs approval"}
            </span>
          </div>

          {error && (
            <p className="text-[11px] text-destructive">{error}</p>
          )}
          {operatorError && (
            <p className="text-[11px] text-destructive">{operatorError}</p>
          )}

          {!isDeployed && (
            <button
              type="button"
              onClick={() => setEnrollOpen(true)}
              className="btn-pay btn-pay-primary"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Enroll passkey &amp; deploy account
            </button>
          )}

          {isDeployed && !hasPasskey && (
            <button
              type="button"
              onClick={() => setEnrollOpen(true)}
              className="btn-pay btn-pay-ghost"
            >
              <KeyRound className="w-3.5 h-3.5" />
              Add passkey to existing account
            </button>
          )}

          {isDeployed && hasPasskey && operatorApproved === false && (
            <button
              type="button"
              onClick={() => void handleApproveOperator()}
              disabled={operatorBusy}
              className="btn-pay btn-pay-primary"
            >
              {operatorBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Enable ocUSDC smart sends
            </button>
          )}
        </div>
      </HarmonyFormCard>

      {enrollOpen && (
        <PasskeyEnrollModal onClose={() => setEnrollOpen(false)} />
      )}
    </>
  );
};

// ── Contacts Section (content only — rendered inside settings tab) ──────────
const ContactsSection = () => {
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
    <HarmonyFormCard
      title="Contacts"
      eyebrow="Address book"
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          onClick={() => void refresh()}
          disabled={isLoading}
          className="inline-flex h-8 items-center gap-1.5 rounded-full hairline px-3 text-xs hover:bg-muted"
        >
          {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RotateCw className="h-3 w-3" />}
          Refresh
        </button>
        <button
          type="button"
          onClick={() => setOpen(true)}
            className="inline-flex h-8 items-center gap-1.5 rounded-full bg-foreground px-3 text-xs font-medium text-background"
          >
            <Plus className="h-3 w-3" />
            Add contact
          </button>
        </div>
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
    </HarmonyFormCard>
  );
};

const PayPage = () => {
  const { isConnected } = useAccount();
  const inbox = useStealthInbox();
  const onboarding = useOnboardingState();
  const [showLegacy, setShowLegacy] = useState(false);

  // Initial URL parse → top tab + sub tab
  const initial = (() => {
    if (typeof window === "undefined") return { tab: "home" as Tab, sub: null as string | null };
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get("tab");
      const s = params.get("sub");
      // Deep-link short-circuits
      if (params.get("claim") || params.get("invoice")) return { tab: "getpaid" as Tab, sub: "inbox" };
      // Map legacy tab names to new IA tabs
      if (t === "send") return { tab: "pay" as Tab, sub: s ?? "send" };
      if (t === "receive") return { tab: "getpaid" as Tab, sub: s ?? "inbox" };
      if (t === "escrow") return { tab: "automations" as Tab, sub: s ?? "escrows" };
      if (t === "streams") return { tab: "automations" as Tab, sub: s ?? "streams" };
      if (t === "receivables") return { tab: "automations" as Tab, sub: s ?? "subscriptions" };
      if (t === "insurance") return { tab: "automations" as Tab, sub: s ?? "subscriptions" };
      if (t === "contacts") return { tab: "settings" as Tab, sub: s ?? "contacts" };
      if (t === "advanced") return { tab: "settings" as Tab, sub: s ?? "legacy" };
      if (t && basePayNav.some((n) => n.key === t)) return { tab: t as Tab, sub: s };
    } catch { /* ignore */ }
    return { tab: "home" as Tab, sub: null };
  })();

  const [tab, setTabState] = useState<Tab>(initial.tab);

  // Per-tab sub-navigation state (workspace inside the tab)
  type PaySub = "send" | "convert" | "bridge";
  type GetPaidSub = "inbox" | "setup" | "request" | "inbound";
  type AutoSub = "streams" | "escrows" | "subscriptions" | "payroll";
  type SettingsSub = "prefs" | "privacy" | "contacts" | "notifications" | "account" | "data" | "legacy";

  const [paySub, setPaySub] = useState<PaySub>(
    initial.tab === "pay" && (initial.sub === "send" || initial.sub === "convert" || initial.sub === "bridge")
      ? (initial.sub as PaySub)
      : "send",
  );
  const [getPaidSub, setGetPaidSub] = useState<GetPaidSub>(() => {
    if (initial.tab === "getpaid" && (initial.sub === "inbox" || initial.sub === "setup" || initial.sub === "request" || initial.sub === "inbound")) {
      return initial.sub as GetPaidSub;
    }
    // Smart default: stealth-registered users land on inbox, others on setup
    return onboarding.isStealthRegistered ? "inbox" : "setup";
  });
  const [autoSub, setAutoSub] = useState<AutoSub>(
    initial.tab === "automations" && (initial.sub === "streams" || initial.sub === "escrows" || initial.sub === "subscriptions" || initial.sub === "payroll")
      ? (initial.sub as AutoSub)
      : "streams",
  );
  const [settingsSub, setSettingsSub] = useState<SettingsSub>(
    initial.tab === "settings" && (initial.sub === "prefs" || initial.sub === "privacy" || initial.sub === "contacts" || initial.sub === "notifications" || initial.sub === "account" || initial.sub === "data" || initial.sub === "legacy")
      ? (initial.sub as SettingsSub)
      : "prefs",
  );

  // Sync URL when tab/sub changes (preserves deep links)
  const writeUrl = (nextTab: Tab, nextSub?: string | null) => {
    if (typeof window === "undefined") return;
    try {
      const params = new URLSearchParams(window.location.search);
      params.set("tab", nextTab);
      if (nextSub) params.set("sub", nextSub); else params.delete("sub");
      const newUrl = `${window.location.pathname}?${params.toString()}${window.location.hash}`;
      window.history.replaceState({}, "", newUrl);
    } catch { /* ignore */ }
  };

  const setTab = (next: Tab) => {
    setTabState(next);
    const sub =
      next === "pay" ? paySub :
      next === "getpaid" ? getPaidSub :
      next === "automations" ? autoSub :
      next === "settings" ? settingsSub : null;
    writeUrl(next, sub);
  };

  const [streamRefreshKey, setStreamRefreshKey] = useState(0);
  const refreshStreams = () => setStreamRefreshKey((k) => k + 1);

  const harmonySidebar = basePayNav.map((item) => ({
    key: item.key,
    label: item.label,
    active: tab === item.key,
    badge:
      item.key === "getpaid" && inbox.unreadCount > 0 ? String(inbox.unreadCount) : undefined,
    onClick: () => setTab(item.key),
  }));

  // Sub-nav change handlers (with URL sync)
  const onPaySub = (next: PaySub) => { setPaySub(next); writeUrl("pay", next); };
  const onGetPaidSub = (next: GetPaidSub) => { setGetPaidSub(next); writeUrl("getpaid", next); };

  // Auto-switch to inbox the first time stealth registration is confirmed
  const prevStealthRegisteredRef = useRef(onboarding.isStealthRegistered);
  useEffect(() => {
    const was = prevStealthRegisteredRef.current;
    prevStealthRegisteredRef.current = onboarding.isStealthRegistered;
    if (!was && onboarding.isStealthRegistered && !onboarding.stealthLoading) {
      setGetPaidSub("inbox");
    }
  }, [onboarding.isStealthRegistered, onboarding.stealthLoading]);
  const onAutoSub = (next: AutoSub) => { setAutoSub(next); writeUrl("automations", next); };
  const onSettingsSub = (next: SettingsSub) => { setSettingsSub(next); writeUrl("settings", next); };

  // W5P1.9: automations create-flow drawer state (right-side slide-in)
  const [autoDrawer, setAutoDrawer] = useState<AutoSub | null>(null);
  const closeAutoDrawer = () => setAutoDrawer(null);
  const closeAndRefreshStreams = () => { setAutoDrawer(null); refreshStreams(); };

  const renderActiveSection = () => {
    switch (tab) {
      case "home":
        return <PayHarmonyHome onNavigate={(t) => setTab(t as Tab)} />;

      case "pay": {
        if (!isConnected) {
          return <PayTabNotConnected tab="pay" message="Connect your wallet to send private payments." />;
        }
        return (
          <PayHarmonyTabShell tab="pay">
            <PaymentModeBar
              onSetupSmart={() => {
                setTabState("settings");
                onSettingsSub("account");
                writeUrl("settings", "account");
              }}
            />
            <HarmonySubNav<PaySub>
              value={paySub}
              onChange={onPaySub}
              items={[
                { key: "send", label: "Send", icon: Send },
                { key: "convert", label: "Make private", icon: Shield },
                { key: "bridge", label: "Bridge", icon: Network, badge: "CCTP" },
              ]}
            />
            {paySub === "send" && (
              <>
                <PayHarmonySendBar onShield={() => onPaySub("convert")} />
                <PayHarmonyPanelCard title="Send a private payment" eyebrow="Encrypted transfer">
                  <UnifiedSendForm />
                </PayHarmonyPanelCard>
              </>
            )}
            {paySub === "convert" && (
              <PayHarmonyPanelCard title="Make USDC private" eyebrow="Shield · Unshield">
                <OcUSDCPanel />
              </PayHarmonyPanelCard>
            )}
            {paySub === "bridge" && (
              <>
                <PayHarmonyPanelCard title="Bridge USDC from another chain" eyebrow="Cross-chain · CCTP">
                  <CrossChainFundForm />
                </PayHarmonyPanelCard>
                <HarmonySection title="How it works" hint="Payment flow on-chain">
                  <div className="rounded-2xl hairline bg-card p-6">
                    <SectionDiagram flow="send" />
                  </div>
                </HarmonySection>
              </>
            )}
          </PayHarmonyTabShell>
        );
      }

      case "getpaid": {
        if (!isConnected) {
          return <PayTabNotConnected tab="getpaid" message="Connect your wallet to set up private receiving and claim payments." />;
        }
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
          <PayHarmonyTabShell tab="getpaid">
            <HarmonySubNav<GetPaidSub>
              value={getPaidSub}
              onChange={onGetPaidSub}
              items={[
                { key: "inbox", label: "Inbox", icon: Inbox, badge: inbox.unreadCount > 0 ? inbox.unreadCount : undefined },
                { key: "setup", label: "Setup", icon: KeyRound },
                { key: "request", label: "Request", icon: FileText },
                { key: "inbound", label: "Inbound streams", icon: Mail },
              ]}
            />
            {getPaidSub === "inbox" && (
              <>
                {invoiceId && <InvoicePayCard invoiceId={invoiceId} contractParam={contractParam} />}
                {claimId && <ClaimEscrowCard claimId={claimId} contractParam={contractParam} />}
                <HarmonyFormCard title="Private inbox" eyebrow="Incoming · Claim" noPadding>
                  <StealthInboxV2 />
                </HarmonyFormCard>
                {!claimId && (
                  <PayHarmonyPanelCard title="Claim a protected payment" eyebrow="By escrow ID">
                    <OcUSDCEscrowActions />
                  </PayHarmonyPanelCard>
                )}
              </>
            )}
            {getPaidSub === "setup" && (
              <>
                <PayHarmonyPanelCard title="Set up private receiving" eyebrow="Private receive address">
                  <RegisterMetaAddressForm />
                </PayHarmonyPanelCard>
                <HarmonySection title="How receiving works" hint="End-to-end flow">
                  <div className="rounded-2xl hairline bg-card p-6">
                    <SectionDiagram flow="receive" />
                  </div>
                </HarmonySection>
              </>
            )}
            {getPaidSub === "request" && (
              <PayHarmonyPanelCard title="Request a payment" eyebrow="Invoice">
                <InvoiceForm />
              </PayHarmonyPanelCard>
            )}
            {getPaidSub === "inbound" && (
              <PayHarmonyPanelCard title="Payments streaming to you" eyebrow="Inbound streams">
                <StreamList mode="recipient" />
              </PayHarmonyPanelCard>
            )}
          </PayHarmonyTabShell>
        );
      }

      case "automations": {
        if (!isConnected) {
          return <PayTabNotConnected tab="automations" message="Connect your wallet to create streams, escrows, and subscriptions." />;
        }
        return (
          <PayHarmonyTabShell tab="automations">
            <HarmonySubNav<AutoSub>
              value={autoSub}
              onChange={onAutoSub}
              items={[
                { key: "streams", label: "Streams", icon: Repeat2 },
                { key: "escrows", label: "Escrows", icon: ShieldCheck },
                { key: "subscriptions", label: "Subscriptions", icon: CalendarClock },
                { key: "payroll", label: "Payroll", icon: Users },
              ]}
            />

            {/* Streams workspace — summary + list; "+ New" opens drawer */}
            {autoSub === "streams" && (
              <div className="space-y-5">
                <HarmonyWorkspaceHeader
                  eyebrow="Automations"
                  title="Continuous streams"
                  description="Pay salaries, retainers, and grants per-second. Amounts stay encrypted on-chain."
                  cta={{ label: "New stream", icon: Plus, onClick: () => setAutoDrawer("streams") }}
                />
                <div className="harmony-form-inner rounded-2xl hairline bg-card p-6">
                  <StreamsDashboard
                    onNavigate={(t) => setTab(t as Tab)}
                    refreshKey={streamRefreshKey}
                    onRefresh={refreshStreams}
                  />
                </div>
              </div>
            )}

            {/* Escrows workspace — list-first; "+ New" opens drawer */}
            {autoSub === "escrows" && (
              <div className="space-y-5">
                <HarmonyWorkspaceHeader
                  eyebrow="Automations"
                  title="Protected escrows"
                  description="Lock funds until a condition is met. Refund window keeps funds recoverable."
                  cta={{ label: "New escrow", icon: Plus, onClick: () => setAutoDrawer("escrows") }}
                />
                <div className="rounded-2xl hairline bg-card p-6">
                  <MyEscrows />
                </div>
              </div>
            )}

            {/* Subscriptions workspace */}
            {autoSub === "subscriptions" && (
              <div className="space-y-5">
                <HarmonyWorkspaceHeader
                  eyebrow="Automations"
                  title="Recurring subscriptions"
                  description="Bill or pay on a regular cadence. Amount and recipients are encrypted."
                  cta={{ label: "New subscription", icon: Plus, onClick: () => setAutoDrawer("subscriptions") }}
                />
                <ReceivablesHub onNavigate={(t) => setTab(t as Tab)} />
              </div>
            )}

            {/* Payroll workspace */}
            {autoSub === "payroll" && (
              <div className="space-y-5">
                <HarmonyWorkspaceHeader
                  eyebrow="Automations · Advanced"
                  title="Batch payroll"
                  description="Send to many recipients in a single resolver-gated batch. Amounts encrypted per row."
                  cta={{ label: "New batch", icon: Plus, onClick: () => setAutoDrawer("payroll") }}
                />
                <HarmonyMetricRow
                  items={[
                    { label: "Active resolvers", value: "—" },
                    { label: "Last batch", value: "—" },
                  ]}
                />
                <details className="rounded-2xl hairline bg-card">
                  <summary className="cursor-pointer list-none px-6 py-4 text-sm font-medium text-foreground">
                    Manage resolvers
                    <span className="ml-2 text-xs text-muted-foreground">
                      (configure payroll authorizers)
                    </span>
                  </summary>
                  <div className="border-t border-border px-6 py-5">
                    <ResolverManager />
                  </div>
                </details>
              </div>
            )}

            {/* Drawer: stream creation */}
            <HarmonyDrawer
              open={autoDrawer === "streams"}
              onClose={closeAutoDrawer}
              eyebrow="New automation"
              title="Create a continuous stream"
              width="md"
            >
              <CreateStreamFormV2 onCreated={closeAndRefreshStreams} />
            </HarmonyDrawer>

            {/* Drawer: escrow creation */}
            <HarmonyDrawer
              open={autoDrawer === "escrows"}
              onClose={closeAutoDrawer}
              eyebrow="New automation"
              title="Create a protected escrow"
              width="md"
            >
              <OcUSDCEscrowForm />
            </HarmonyDrawer>

            {/* Drawer: subscription creation */}
            <HarmonyDrawer
              open={autoDrawer === "subscriptions"}
              onClose={closeAutoDrawer}
              eyebrow="New automation"
              title="Create a recurring subscription"
              width="md"
            >
              <SubscriptionForm onCreated={closeAndRefreshStreams} />
            </HarmonyDrawer>

            {/* Drawer: payroll batch */}
            <HarmonyDrawer
              open={autoDrawer === "payroll"}
              onClose={closeAutoDrawer}
              eyebrow="New automation · Advanced"
              title="Create a batch payroll"
              width="lg"
            >
              <BatchEscrowForm />
            </HarmonyDrawer>
          </PayHarmonyTabShell>
        );
      }

      case "activity":
        return (
          <PayHarmonyTabShell tab="activity">
            <ActivityFeed />
            <HarmonyFormCard title="Local receipts" eyebrow="Browser only · Not synced">
              <ReceiptList />
            </HarmonyFormCard>
          </PayHarmonyTabShell>
        );

      case "settings":
        return (
          <PayHarmonyTabShell tab="settings">
            <HarmonySubNav<SettingsSub>
              value={settingsSub}
              onChange={onSettingsSub}
              items={[
                { key: "prefs", label: "Preferences", icon: SettingsIcon },
                { key: "privacy", label: "Privacy", icon: Shield },
                { key: "contacts", label: "Contacts", icon: BookUser },
                { key: "notifications", label: "Notifications", icon: Mail },
                { key: "account", label: "Smart Account", icon: KeyRound },
                { key: "data", label: "Data", icon: Database },
                { key: "legacy", label: "Legacy", icon: Wrench },
              ]}
            />
            {settingsSub === "prefs" && <SettingsPrefsCard />}
            {settingsSub === "privacy" && <SettingsPrivacyCard />}
            {settingsSub === "contacts" && <ContactsSection />}
            {settingsSub === "notifications" && <SettingsNotificationsCard />}
            {settingsSub === "account" && <SettingsSmartAccountCard />}
            {settingsSub === "data" && <SettingsDataCard />}
            {settingsSub === "legacy" && (
              <HarmonyFormCard title="Legacy tools" eyebrow="Advanced · V1">
                <div className="space-y-3">
                  <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
                    Legacy V1 forms for old escrows and streams. Not needed for new payments.
                  </p>
                  <button type="button" onClick={() => setShowLegacy((v) => !v)} className="btn-pay btn-pay-ghost">
                    <Wrench className="w-3.5 h-3.5" />
                    {showLegacy ? "Hide legacy tools" : "Show legacy tools"}
                  </button>
                  {showLegacy && isConnected && (
                    <div className="space-y-6 pt-2">
                      <OcUSDCTransferForm />
                      <CreateStreamForm onCreated={refreshStreams} />
                      <StealthInbox />
                    </div>
                  )}
                </div>
              </HarmonyFormCard>
            )}
          </PayHarmonyTabShell>
        );
    }
  };

  return (
    <PaymentModeProvider>
      <HarmonyAppShell appName="Pay" sidebar={harmonySidebar} searchPlaceholder="Search pay…">
        {isConnected && tab !== "getpaid" && tab !== "home" && (
          <NewPaymentBanner onOpenInbox={() => setTab("getpaid")} />
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
    </PaymentModeProvider>
  );
};

export default PayPage;
