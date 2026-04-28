import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAccount } from "wagmi";
import {
  LayoutDashboard,
  Send,
  ArrowDownToLine,
  Repeat,
  Shield,
  Lock,
  Sparkles,
  Network,
  Wallet as WalletIcon,
  Eye,
  ShieldCheck,
  Umbrella,
  Wrench,
  HelpCircle,
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
import { useNavigate } from "react-router-dom";

import SectionDiagram from "@/components/elite/SectionDiagram";
import AmbientBackground from "@/components/elite/AmbientBackground";
import DashboardSidebar, {
  SidebarSection,
} from "@/components/elite/DashboardSidebar";
import {
  PageHeader,
  Card,
  CardHeader,
  HowItWorks,
  FeatureStrip,
} from "@/components/elite/Layout";

import CUSDCTransferForm from "@/components/pay-v4/CUSDCTransferForm";
import CUSDCEscrowForm from "@/components/pay-v4/CUSDCEscrowForm";
import CUSDCEscrowActions from "@/components/pay-v4/CUSDCEscrowActions";
import MyEscrows from "@/components/pay-v4/MyEscrows";
import CreateStreamForm from "@/components/pay-v4/CreateStreamForm";
import CreateStreamFormV2 from "@/components/pay-v4/CreateStreamFormV2";
import StreamList from "@/components/pay-v4/StreamList";
import CUSDCPanel from "@/components/pay-v4/CUSDCPanel";
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
import { ReceiptList } from "@/components/pay-v4/PaymentReceipt";
import AddContactModal from "@/components/pay-v4/AddContactModal";

import { useCUSDCBalance } from "@/hooks/useCUSDCBalance";
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

const baseSidebarSections: SidebarSection[] = [
  { items: [{ key: "home", label: "Home", icon: LayoutDashboard }] },
  {
    heading: "Pay",
    items: [
      { key: "send", label: "Send", icon: Send },
      { key: "receive", label: "Receive", icon: ArrowDownToLine },
      { key: "streams", label: "Streams", icon: Repeat },
    ],
  },
  {
    heading: "Protect",
    items: [
      { key: "escrow", label: "Escrow", icon: ShieldCheck },
      { key: "insurance", label: "Insurance", icon: Umbrella },
    ],
  },
  {
    heading: "Tools",
    items: [
      { key: "contacts", label: "Contacts", icon: WalletIcon },
      { key: "settings", label: "Settings", icon: Shield },
      { key: "advanced", label: "Advanced", icon: Wrench },
    ],
  },
];

const homeSteps = [
  { title: "1 · Get cUSDC", description: "Bridge USDC to Arbitrum, then wrap into encrypted cUSDC from the Send tab." },
  { title: "2 · Send privately", description: "Direct, stealth, or cross-chain — amounts are encrypted in your browser before going on-chain." },
  { title: "3 · Stream payroll", description: "Schedule recurring encrypted payments with optional auto-insurance per cycle." },
  { title: "4 · Escrow & insure", description: "Lock funds with resolvers, or buy coverage so missed cycles still pay out." },
];

const featureItems = [
  { icon: Lock, title: "End-to-End Encrypted", description: "FHE keeps every amount and recipient hidden." },
  { icon: Sparkles, title: "Onchain & Verifiable", description: "Public infrastructure, private data." },
  { icon: Network, title: "No Middlemen", description: "You control your keys and your data." },
  { icon: Shield, title: "Built for Web3", description: "Native modules for DeFi, DAOs, and payroll." },
];

const NotConnected = ({ message }: { message: string }) => (
  <Card className="p-10 text-center">
    <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
      <WalletIcon className="w-5 h-5 text-emerald-400" />
    </div>
    <div className="font-display text-[15px] text-foreground mb-1">Wallet not connected</div>
    <p className="text-[12px] text-muted-foreground/65 max-w-sm mx-auto">{message}</p>
  </Card>
);

/** Compact wallet balance pill shown in the page header. */
const WalletPill = () => {
  const { isConnected } = useAccount();
  const { decrypted, reveal, busy, trackedCusdc } = useCUSDCBalance();

  if (!isConnected) return null;

  const isRevealed = decrypted !== null && decrypted !== undefined;
  const display = isRevealed
    ? (Number(decrypted) / 1_000_000).toFixed(2)
    : trackedCusdc
      ? parseFloat(trackedCusdc).toFixed(2)
      : "•••";
  const isApprox = !isRevealed && trackedCusdc !== null && trackedCusdc !== undefined;

  return (
    <button
      onClick={() => void reveal()}
      disabled={busy}
      title={isRevealed ? "On-chain decrypted balance" : "Click to decrypt your balance"}
      className="group inline-flex items-center gap-2 rounded-lg border border-emerald-500/20 bg-emerald-500/[0.04] px-3 py-1.5 hover:border-emerald-500/40 transition-colors disabled:opacity-60"
    >
      <Lock className="w-3.5 h-3.5 text-emerald-400" />
      <span className="text-[10px] uppercase tracking-[0.18em] text-emerald-300/70 font-mono">cUSDC</span>
      <span className="font-mono text-[13px] font-semibold text-emerald-200 tabular-nums">
        {isApprox && <span className="text-emerald-300/50 mr-0.5">≈</span>}
        {busy ? "…" : display}
      </span>
      <Eye className="w-3.5 h-3.5 text-emerald-300/60 group-hover:text-emerald-300 transition-colors" />
    </button>
  );
};

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
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0">
          <SettingsIcon className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h2 className="font-display text-[15px] font-semibold text-foreground">Settings</h2>
          <p className="text-[11px] text-muted-foreground/50">UX preferences and privacy maintenance. None stored on-chain.</p>
        </div>
      </div>

      {/* Interface */}
      <div className="pay-card p-5 space-y-4">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45 font-mono">Interface</div>
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

      {/* Stealth Privacy */}
      <div className="pay-card p-5 space-y-4">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45 font-mono">Stealth Privacy</div>
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
        {rotation.error && <div className="text-[11px] text-red-300">{rotation.error}</div>}
      </div>

      {/* Inbox Filter */}
      <div className="pay-card p-5 space-y-3">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45 font-mono">Inbox Filter</div>
        <p className="text-[12px] text-muted-foreground/60 leading-relaxed">
          The on-chain ignore filter is a per-recipient bloom. Resetting clears it — senders you ignored will reappear.
        </p>
        <button onClick={() => void inbox.resetFilter()} className="btn-pay btn-pay-ghost">
          <RotateCw className="w-3.5 h-3.5" />
          Reset ignore filter
        </button>
      </div>

      {/* Local Data */}
      <div className="pay-card p-5 space-y-3">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45 font-mono">Local Data</div>
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

      {/* Onboarding */}
      <div className="pay-card p-5 space-y-3">
        <div className="text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45 font-mono">Onboarding</div>
        <button onClick={() => prefs.setPreference("hasCompletedOnboarding", false)} className="btn-pay btn-pay-ghost">
          <SettingsIcon className="w-3.5 h-3.5" />
          Replay onboarding wizard
        </button>
      </div>
    </div>
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
    <div className="space-y-4 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-cyan-700/10 border border-cyan-500/25 flex items-center justify-center shrink-0">
          <BookUser className="w-4 h-4 text-cyan-400" />
        </div>
        <div className="flex-1">
          <h2 className="font-display text-[15px] font-semibold text-foreground">Contacts</h2>
          <p className="text-[11px] text-muted-foreground/50">Encrypted on-chain address book. Labels are kept locally.</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <button onClick={() => void refresh()} disabled={isLoading} className="btn-pay btn-pay-ghost">
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCw className="w-3.5 h-3.5" />}
          </button>
          <button onClick={() => setOpen(true)} className="btn-pay btn-pay-cyan">
            <Plus className="w-3.5 h-3.5" />
            Add
          </button>
        </div>
      </div>

      {error && (
        <div className="pay-card p-4 border-red-500/30 bg-red-500/[0.05] text-[12px] text-red-300">{error}</div>
      )}

      {contacts.length === 0 && !isLoading ? (
        <div className="pay-card p-12 text-center space-y-3">
          <BookUser className="w-8 h-8 mx-auto text-muted-foreground/30" />
          <div className="font-display text-[13px] text-foreground">No contacts yet</div>
          <p className="text-[12px] text-muted-foreground/55 max-w-sm mx-auto">
            Add a contact to send encrypted payments without retyping addresses.
          </p>
          <button onClick={() => setOpen(true)} className="btn-pay btn-pay-cyan">
            <Plus className="w-3.5 h-3.5" />
            Add your first contact
          </button>
        </div>
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
                className="pay-card flex items-center gap-3 p-3"
              >
                <div className="w-8 h-8 rounded-full bg-cyan-500/[0.1] border border-cyan-500/25 flex items-center justify-center text-[11px] text-cyan-300 font-mono shrink-0">
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
    </div>
  );
};

const PayPage = () => {
  const navigate = useNavigate();
  const { isConnected } = useAccount();
  const prefs = usePreferences();
  const inbox = useStealthInbox();
  const [tab, setTab] = useState<Tab>("home");
  const [streamRefreshKey, setStreamRefreshKey] = useState(0);
  const refreshStreams = () => setStreamRefreshKey((k) => k + 1);

  // Sidebar with live unread badge on Receive
  const sidebarSections: SidebarSection[] = baseSidebarSections.map((sec) => ({
    ...sec,
    items: sec.items.map((it) =>
      it.key === "receive" && inbox.unreadCount > 0
        ? { ...it, badge: String(inbox.unreadCount) }
        : it
    ),
  }));

  const handleSidebarSelect = (key: string) => {
    if (key === "docs") return void navigate("/docs");
    setTab(key as Tab);
  };

  const renderActiveSection = () => {
    switch (tab) {
      case "home":
        return (
          <div className="space-y-5">
            <SectionDiagram flow="send" />
            {isConnected && (
              <Card>
                <CardHeader title="cUSDC Wallet" eyebrow="Wrap USDC → cUSDC" />
                <div className="p-5"><CUSDCPanel /></div>
              </Card>
            )}
            <HowItWorks
              title="How Obscura Pay works"
              steps={homeSteps}
              footnote={
                <>
                  All encryption uses <span className="text-foreground/80">Phenix CoFHE</span>.
                  Your data stays encrypted, even while the smart contract processes it.
                </>
              }
            />
            <ReceiptList limit={5} />
          </div>
        );

      case "send":
        if (!isConnected) return <NotConnected message="Connect your wallet to send encrypted cUSDC payments." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="cUSDC Wallet" eyebrow="Need cUSDC to send? Wrap here" />
              <div className="p-5"><CUSDCPanel /></div>
            </Card>
            <UnifiedSendForm />
            <Card>
              <CardHeader title="Bridge USDC into Arbitrum" eyebrow="Cross-chain" />
              <div className="p-5"><CrossChainFundForm /></div>
            </Card>
            <SectionDiagram flow="send" />
          </div>
        );

      case "receive":
        if (!isConnected) return <NotConnected message="Connect your wallet to set up private receiving." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Step 1 — Register stealth meta-address" eyebrow="Receive" />
              <div className="p-5"><RegisterMetaAddressForm /></div>
            </Card>
            <StealthInboxV2 />
            <Card>
              <CardHeader title="Streams paying you" />
              <div className="p-5"><StreamList mode="recipient" /></div>
            </Card>
            <SectionDiagram flow="receive" />
          </div>
        );

      case "streams":
        if (!isConnected) return <NotConnected message="Connect your wallet to create payroll streams." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Wallet" eyebrow="Streams" />
              <div className="p-5"><CUSDCPanel /></div>
            </Card>
            <Card>
              <CardHeader title="Create a stream" />
              <div className="p-5"><CreateStreamFormV2 onCreated={refreshStreams} /></div>
            </Card>
            <Card>
              <CardHeader title="Bulk payroll import" eyebrow="CSV" />
              <div className="p-5"><BulkPayrollImport /></div>
            </Card>
            <Card>
              <CardHeader title="Send each cycle" />
              <div className="p-5"><StreamList key={`emp-${streamRefreshKey}`} mode="employer" /></div>
            </Card>
            <Card>
              <CardHeader title="Streams paying you" eyebrow="Inbox" />
              <div className="p-5"><StreamList key={`rec-${streamRefreshKey}`} mode="recipient" /></div>
            </Card>
            <SectionDiagram flow="stream" />
          </div>
        );

      case "escrow":
        if (!isConnected) return <NotConnected message="Connect your wallet to manage encrypted escrows." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Create an escrow" eyebrow="Escrow" />
              <div className="p-5"><CUSDCEscrowForm /></div>
            </Card>
            <Card>
              <CardHeader title="Your escrows" />
              <div className="p-5"><MyEscrows /></div>
            </Card>
            <Card>
              <CardHeader title="Fund / Redeem / Inspect" />
              <div className="p-5"><CUSDCEscrowActions /></div>
            </Card>
            <Card>
              <CardHeader title="Resolver-gated escrows" eyebrow="Advanced" />
              <div className="p-5"><ResolverManager /></div>
            </Card>
          </div>
        );

      case "insurance":
        if (!isConnected) return <NotConnected message="Connect your wallet to buy or manage insurance." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Buy coverage" eyebrow="Insurance" />
              <div className="p-5"><BuyCoverageForm /></div>
            </Card>
            <Card>
              <CardHeader title="Your policies" />
              <div className="p-5"><MyPolicies /></div>
            </Card>
            <Card>
              <CardHeader title="File a dispute" />
              <div className="p-5"><DisputeForm /></div>
            </Card>
            <Card>
              <CardHeader title="Earn yield as an LP" eyebrow="Optional" />
              <div className="p-5"><StakePoolForm /></div>
            </Card>
          </div>
        );

      case "advanced":
        if (!isConnected) return <NotConnected message="Connect your wallet to access advanced tools." />;
        return (
          <div className="space-y-4">
            <Card>
              <CardHeader title="Legacy direct cUSDC transfer" eyebrow="Advanced" />
              <div className="p-5"><CUSDCTransferForm /></div>
            </Card>
            <Card>
              <CardHeader title="Legacy stream creator" eyebrow="V1" />
              <div className="p-5"><CreateStreamForm onCreated={refreshStreams} /></div>
            </Card>
            <Card>
              <CardHeader title="Legacy stealth inbox" eyebrow="V1" />
              <div className="p-5"><StealthInbox /></div>
            </Card>
            <Card>
              <CardHeader title="All receipts" eyebrow="Local data" />
              <div className="p-5"><ReceiptList /></div>
            </Card>
          </div>
        );

      case "settings":
        return <SettingsPanel />;

      case "contacts":
        return <ContactsPanel />;
    }
  };

  return (
    <div className="min-h-screen flex bg-[#06090c] text-foreground antialiased">
      <AmbientBackground />

      <DashboardSidebar
        sections={sidebarSections}
        active={tab}
        onSelect={handleSidebarSelect}
      />

      <div className="flex-1 min-w-0 flex flex-col">
        <main className="flex-1 min-w-0 px-6 lg:px-8 py-7 max-w-5xl w-full mx-auto">
          <PageHeader
            breadcrumb={["Dashboard", "Pay"]}
            title={<>Obscura<span className="text-emerald-400">Pay</span></>}
            lede={<>Send, stream, escrow and insure payments — fully encrypted on-chain.</>}
            badge={
              <div className="flex items-center gap-2">
                <WalletPill />
                {prefs.uiMode === "beginner" && (
                  <span className="hidden md:inline-flex items-center gap-1.5 text-[10.5px] tracking-[0.05em] text-emerald-300/80 px-2.5 py-1 rounded-md border border-emerald-500/20 bg-emerald-500/[0.04]">
                    cUSDC — encrypted stablecoin
                    <HelpCircle className="w-3 h-3 opacity-60" />
                  </span>
                )}
              </div>
            }
          />

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

          <div className="mt-8">
            <FeatureStrip items={featureItems} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default PayPage;
