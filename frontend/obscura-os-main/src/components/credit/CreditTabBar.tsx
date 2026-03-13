/**
 * CreditTabBar — mobile bottom-nav (only <md). Hidden on desktop where
 * DashboardSidebar takes over.
 *
 * Surface: 5 primary sections — Home / Vaults / Borrow / Health / More.
 * "More" opens CreditDrawer with the full section list.
 */
import { LayoutDashboard, PiggyBank, ArrowDownToLine, Activity, MoreHorizontal } from "lucide-react";

export type CreditTabKey =
  | "home" | "vaults" | "markets" | "collateral" | "supply" | "borrow"
  | "repay" | "health" | "auctions" | "score" | "history" | "settings";

interface Item {
  key: CreditTabKey | "__more__";
  label: string;
  icon: React.ElementType;
}

const ITEMS: Item[] = [
  { key: "home",    label: "Home",   icon: LayoutDashboard },
  { key: "vaults",  label: "Vaults", icon: PiggyBank },
  { key: "borrow",  label: "Borrow", icon: ArrowDownToLine },
  { key: "health",  label: "Health", icon: Activity },
  { key: "__more__", label: "More",  icon: MoreHorizontal },
];

interface Props {
  active: CreditTabKey;
  onSelect: (k: CreditTabKey) => void;
  onMore: () => void;
  /** Optional notification dot for the More tab. */
  moreBadge?: number;
}

export default function CreditTabBar({ active, onSelect, onMore, moreBadge }: Props) {
  return (
    <nav
      className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-white/10 bg-[#06090c]/95 backdrop-blur-xl"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      aria-label="Credit primary navigation"
    >
      <ul className="grid grid-cols-5">
        {ITEMS.map((it) => {
          const isActive = it.key !== "__more__" && active === it.key;
          const Icon = it.icon;
          return (
            <li key={it.key}>
              <button
                type="button"
                onClick={() => (it.key === "__more__" ? onMore() : onSelect(it.key as CreditTabKey))}
                className={`relative w-full h-14 flex flex-col items-center justify-center gap-0.5 transition-colors ${
                  isActive ? "text-violet-300" : "text-white/55 hover:text-white/85"
                }`}
                aria-current={isActive ? "page" : undefined}
              >
                <Icon className="w-4 h-4" />
                <span className="font-mono text-[9.5px] uppercase tracking-[0.14em]">{it.label}</span>
                {it.key === "__more__" && moreBadge && moreBadge > 0 && (
                  <span className="absolute top-2 right-1/3 -translate-x-1/2 min-w-[14px] h-[14px] px-1 rounded-full bg-red-500 text-[8.5px] text-white font-medium flex items-center justify-center">
                    {moreBadge > 9 ? "9+" : moreBadge}
                  </span>
                )}
                {isActive && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[2px] rounded-b-full bg-violet-400" />
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
