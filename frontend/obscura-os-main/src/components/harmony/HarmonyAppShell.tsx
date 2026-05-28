import { Link, useLocation } from "react-router-dom";
import { Banknote, Coins, LayoutGrid, Plus, Search, Settings, Vote } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import NavRightSlot from "@/components/elite/NavRightSlot";
import { cn } from "@/lib/utils";
import ObscuraLogo from "@/components/brand/ObscuraLogo";

export type HarmonySidebarItem = {
  key: string;
  label: string;
  badge?: string;
  icon?: LucideIcon;
  mobileLabel?: string;
  active?: boolean;
  onClick?: () => void;
  href?: string;
};

const apps = [
  { to: "/pay", label: "Pay", icon: Banknote, color: "text-emerald-600" },
  { to: "/credit", label: "Credit", icon: Coins, color: "text-amber-600" },
  { to: "/vote", label: "Vote", icon: Vote, color: "text-violet-600" },
];

export function HarmonyAppShell({
  appName,
  sidebar,
  children,
  searchPlaceholder,
}: {
  appName: "Pay" | "Credit" | "Vote" | "Ecosystem";
  sidebar: HarmonySidebarItem[];
  children: React.ReactNode;
  searchPlaceholder?: string;
}) {
  const { pathname } = useLocation();
  const search = searchPlaceholder ?? `Search ${appName.toLowerCase()}…`;

  return (
    <div className="obscura-app isolate flex min-h-screen bg-background text-foreground">
      {/* App switcher rail */}
      <aside className="hidden w-16 shrink-0 flex-col items-center gap-1 border-r border-border bg-surface py-4 md:flex">
        <Link
          to="/"
          className="mb-2 grid h-10 w-10 place-items-center rounded-xl border border-border bg-card shadow-sm"
          aria-label="Home"
        >
          <ObscuraLogo showWordmark={false} size="sm" tone="light" markClassName="h-6 w-6" />
        </Link>
        {apps.map((app) => {
          const active = pathname.startsWith(app.to);
          const Icon = app.icon;
          return (
            <Link
              key={app.to}
              to={app.to}
              title={app.label}
              className={cn(
                "grid h-10 w-10 place-items-center rounded-xl transition-colors",
                active ? "hairline-strong bg-card" : "hover:bg-muted",
              )}
            >
              <Icon className={cn("h-4 w-4", active ? app.color : "text-muted-foreground")} />
            </Link>
          );
        })}
        <div className="mt-auto flex flex-col gap-1">
          <Link
            to="/ecosystem"
            title="Ecosystem"
            className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
          >
            <LayoutGrid className="h-4 w-4" />
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-xl text-muted-foreground hover:bg-muted"
            aria-label="Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </aside>

      {/* App sidebar */}
      <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
        <div className="border-b border-border px-6 py-5">
          <Link to="/" className="inline-flex transition-opacity hover:opacity-85" aria-label="Obscura home">
            <ObscuraLogo size="sm" tone="light" />
          </Link>
          <p className="mt-1 font-display text-2xl">{appName}</p>
        </div>
        <nav className="flex-1 space-y-0.5 px-3 py-4 text-sm">
          {sidebar.map((item) => {
            const inner = (
              <>
                <span>{item.label}</span>
                {item.badge && (
                  <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                    {item.badge}
                  </span>
                )}
              </>
            );
            const className = cn(
              "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors",
              item.active ? "hairline bg-card text-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            );
            if (item.href) {
              return (
                <Link key={item.key} to={item.href} className={className}>
                  {inner}
                </Link>
              );
            }
            return (
              <button key={item.key} type="button" onClick={item.onClick} className={className}>
                {inner}
              </button>
            );
          })}
        </nav>
        <div className="m-3 rounded-xl hairline bg-card p-4">
          <div className="flex items-center gap-2 text-[hsl(var(--success))]">
            <span className="h-2 w-2 animate-pulse rounded-full bg-[hsl(var(--success))]" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">FHE Network · Online</span>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">Threshold MPC active. 7/9 signers online.</p>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="relative z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3 text-muted-foreground">
            <Link to="/" className="md:hidden" aria-label="Obscura home">
              <ObscuraLogo showWordmark={false} size="sm" tone="light" markClassName="h-7 w-7" />
            </Link>
            <Search className="h-4 w-4 shrink-0" />
            <input
              readOnly
              placeholder={search}
              className="hidden w-full max-w-xs bg-transparent text-sm outline-none placeholder:text-muted-foreground/60 sm:block sm:max-w-sm md:max-w-md"
              aria-label={search}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link
              to="/pay"
              className="hidden h-9 items-center gap-1.5 rounded-full hairline px-3 text-sm hover:bg-muted sm:inline-flex"
            >
              <Plus className="h-3.5 w-3.5" />
              New
            </Link>
            <div className="app-wallet-slot">
              <NavRightSlot />
            </div>
          </div>
        </header>
        <main className="relative z-10 mx-auto w-full max-w-[1300px] px-4 py-8 pb-24 md:px-8 md:py-14 md:pb-14">{children}</main>

        {/* Mobile bottom nav — visible only on small screens */}
        <nav className="fixed bottom-0 left-0 right-0 z-40 flex h-[68px] items-stretch border-t border-border bg-background md:hidden">
          {sidebar.map((item) => {
            const Icon = item.icon;
            const mobileLabel = item.mobileLabel ?? item.label;
            const inner = (
              <div className="flex min-w-0 flex-col items-center gap-0.5">
                <span
                  className={cn(
                    "h-6 w-6 rounded-full flex items-center justify-center",
                    item.active ? "bg-foreground/10" : "",
                  )}
                >
                  {Icon ? (
                    <Icon className={cn("h-3.5 w-3.5", item.active ? "text-foreground" : "text-muted-foreground/60")} />
                  ) : (
                    <span className={cn("text-[10px] font-medium", item.active ? "text-foreground" : "text-muted-foreground/60")}>
                      {item.label.slice(0, 2)}
                    </span>
                  )}
                </span>
                <span className={cn("max-w-full truncate px-0.5 text-[9px] sm:text-[10px]", item.active ? "text-foreground font-medium" : "text-muted-foreground/60")}>
                  {mobileLabel}
                </span>
              </div>
            );
            const btnClass = cn(
              "relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-center transition-colors",
              item.active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            );
            if (item.href) {
              return (
                <Link key={item.key} to={item.href} className={btnClass} aria-label={item.label}>
                  {inner}
                </Link>
              );
            }
            return (
              <button key={item.key} type="button" onClick={item.onClick} className={btnClass} aria-label={item.label}>
                {inner}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
