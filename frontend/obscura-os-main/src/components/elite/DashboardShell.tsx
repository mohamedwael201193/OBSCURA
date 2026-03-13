import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { useAccount } from "wagmi";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Wallet as WalletIcon,
  Vote,
  Shield,
  BookOpen,
  ExternalLink,
} from "lucide-react";

export type SidebarItem = {
  key: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

interface DashboardShellProps {
  /** Brand title for top of sidebar (e.g. "ObscuraPay") */
  title: string;
  /** Subtitle under brand */
  subtitle: string;
  /** Active navigation key */
  active: string;
  /** Sidebar item list */
  items: SidebarItem[];
  /** Called when a sidebar item is clicked */
  onSelect: (key: string) => void;
  /** Page content */
  children: ReactNode;
  /** Optional right rail (privacy panel etc.) */
  rightRail?: ReactNode;
  /** Accent color for highlights */
  accent?: "green" | "cyan" | "violet";
}

const accentClasses = {
  green: {
    text: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
    glow: "shadow-[0_0_20px_rgba(34,197,94,0.25)]",
    dot: "bg-emerald-400",
  },
  cyan: {
    text: "text-cyan-400",
    bg: "bg-cyan-500/15",
    border: "border-cyan-500/40",
    glow: "shadow-[0_0_20px_rgba(6,182,212,0.25)]",
    dot: "bg-cyan-400",
  },
  violet: {
    text: "text-violet-400",
    bg: "bg-violet-500/15",
    border: "border-violet-500/40",
    glow: "shadow-[0_0_20px_rgba(139,92,246,0.25)]",
    dot: "bg-violet-400",
  },
};

export const DashboardShell = ({
  title,
  subtitle,
  active,
  items,
  onSelect,
  children,
  rightRail,
  accent = "green",
}: DashboardShellProps) => {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { address, isConnected } = useAccount();
  const a = accentClasses[accent];
  const location = useLocation();

  const sidebarWidth = collapsed ? 76 : 280;

  const Sidebar = (
    <motion.aside
      animate={{ width: sidebarWidth }}
      transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
      className="h-full border-r border-white/[0.06] bg-black/40 backdrop-blur-xl flex flex-col relative overflow-hidden"
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-${accent === "green" ? "emerald" : accent === "cyan" ? "cyan" : "violet"}-500/60 to-transparent`} />

      {/* Brand block */}
      <div className="p-5 border-b border-white/[0.05] flex items-center gap-3">
        <div className={`relative w-9 h-9 rounded-lg ${a.bg} ${a.border} border flex items-center justify-center shrink-0 ${a.glow}`}>
          <div className={`absolute inset-0 rounded-lg ${a.bg} animate-pulse opacity-50`} />
          <Shield className={`w-4 h-4 ${a.text} relative z-10`} />
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: "auto" }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden whitespace-nowrap"
            >
              <div className="font-display text-sm font-semibold text-foreground leading-tight">{title}</div>
              <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground/70 mt-0.5">{subtitle}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {!collapsed && (
          <div className="px-3 mb-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50">
            Navigation
          </div>
        )}
        {items.map((item) => {
          const isActive = item.key === active;
          const Icon = item.icon;
          return (
            <button
              key={item.key}
              onClick={() => {
                onSelect(item.key);
                setMobileOpen(false);
              }}
              className={`group w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all relative ${
                isActive
                  ? `${a.bg} ${a.text} border ${a.border}`
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03] border border-transparent"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full ${a.dot}`}
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <Icon className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 ${isActive ? a.text : ""}`} />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex-1 overflow-hidden whitespace-nowrap"
                  >
                    <div className="text-sm font-medium leading-tight">{item.label}</div>
                    <div className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">{item.description}</div>
                  </motion.div>
                )}
              </AnimatePresence>
              {!collapsed && item.badge && (
                <span className={`text-[9px] px-1.5 py-0.5 rounded-md ${a.bg} ${a.text} font-mono`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}

        {/* Cross-app links */}
        {!collapsed && (
          <div className="px-3 pt-6 pb-2 text-[10px] tracking-[0.2em] uppercase text-muted-foreground/50">
            Modules
          </div>
        )}
        {[
          { to: "/", label: "Home", desc: "Landing page", icon: Home, match: "/" },
          { to: "/pay", label: "ObscuraPay", desc: "Encrypted payments", icon: WalletIcon, match: "/pay" },
          { to: "/vote", label: "ObscuraVote", desc: "Encrypted governance", icon: Vote, match: "/vote" },
          { to: "/docs", label: "Docs", desc: "Read the manual", icon: BookOpen, match: "/docs" },
        ].map((link) => {
          const isCurrent = location.pathname === link.match;
          const Icon = link.icon;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`group w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                isCurrent
                  ? "text-foreground bg-white/[0.04]"
                  : "text-muted-foreground/70 hover:text-foreground hover:bg-white/[0.03]"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0 transition-transform group-hover:scale-110" />
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div
                    initial={{ opacity: 0, width: 0 }}
                    animate={{ opacity: 1, width: "auto" }}
                    exit={{ opacity: 0, width: 0 }}
                    transition={{ duration: 0.18 }}
                    className="flex-1 overflow-hidden whitespace-nowrap"
                  >
                    <div className="text-xs font-medium leading-tight">{link.label}</div>
                    <div className="text-[10px] text-muted-foreground/40 truncate">{link.desc}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          );
        })}
      </nav>

      {/* Connection footer */}
      <div className="border-t border-white/[0.05] p-3">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-lg bg-black/30 border border-white/[0.04]">
          <span className={`relative flex h-2 w-2 shrink-0`}>
            <span className={`absolute inline-flex h-full w-full rounded-full ${isConnected ? a.dot : "bg-muted-foreground/40"} opacity-75 ${isConnected ? "animate-ping" : ""}`} />
            <span className={`relative inline-flex h-2 w-2 rounded-full ${isConnected ? a.dot : "bg-muted-foreground/40"}`} />
          </span>
          <AnimatePresence initial={false}>
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                className="flex-1 overflow-hidden whitespace-nowrap"
              >
                <div className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/60">
                  {isConnected ? "Connected" : "Not connected"}
                </div>
                {isConnected && address && (
                  <div className="text-[11px] font-mono text-foreground/80 truncate">
                    {address.slice(0, 6)}…{address.slice(-4)}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="hidden lg:flex mt-3 w-full items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs text-muted-foreground/60 hover:text-foreground hover:bg-white/[0.04] transition-colors border border-white/[0.04]"
        >
          {collapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
          {!collapsed && <span>Collapse</span>}
        </button>
      </div>
    </motion.aside>
  );

  return (
    <div className="min-h-screen flex relative">
      {/* Mobile sidebar trigger */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-40 p-2.5 rounded-lg bg-black/60 backdrop-blur-md border border-white/[0.06] text-foreground"
        aria-label="Open menu"
      >
        <ChevronRight className="w-4 h-4" />
      </button>

      {/* Desktop sidebar */}
      <div className="hidden lg:block sticky top-0 h-screen z-30">{Sidebar}</div>

      {/* Mobile sidebar drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.div
              className="fixed top-0 bottom-0 left-0 z-50 lg:hidden"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              {Sidebar}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="sticky top-0 z-20 border-b border-white/[0.05] bg-black/30 backdrop-blur-xl">
          <div className="flex items-center justify-between px-6 lg:px-8 h-16">
            <div className="flex items-center gap-3 min-w-0 ml-12 lg:ml-0">
              <span className={`text-[10px] tracking-[0.25em] uppercase ${a.text}`}>{subtitle}</span>
              <span className="text-muted-foreground/30">/</span>
              <span className="text-sm font-medium text-foreground truncate">
                {items.find((i) => i.key === active)?.label || title}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-2">
              <a
                href="https://sepolia.arbiscan.io"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] tracking-[0.15em] uppercase text-muted-foreground/60 hover:text-foreground flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-white/[0.06] hover:border-white/[0.12] transition-colors"
              >
                Arbitrum Sepolia
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </header>

        {/* Content + right rail grid */}
        <div className="flex-1 flex flex-col xl:flex-row min-w-0">
          <main className="flex-1 min-w-0 px-4 lg:px-8 py-8">{children}</main>
          {rightRail && (
            <aside className="xl:w-[340px] xl:shrink-0 px-4 lg:px-8 xl:px-6 xl:pl-0 pb-8 xl:py-8">
              <div className="xl:sticky xl:top-24">{rightRail}</div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
};

export default DashboardShell;
