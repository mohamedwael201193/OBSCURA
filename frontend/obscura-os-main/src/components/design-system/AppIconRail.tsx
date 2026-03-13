import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { BarChart3, CheckSquare, Layers, WalletCards } from "lucide-react";
import { cn } from "@/lib/utils";
import ObscuraLogo from "@/components/brand/ObscuraLogo";

const MODULES = [
  { key: "pay", href: "/pay", icon: WalletCards, label: "Pay" },
  { key: "credit", href: "/credit", icon: BarChart3, label: "Credit" },
  { key: "vote", href: "/vote", icon: CheckSquare, label: "Vote" },
  { key: "ecosystem", href: "/ecosystem", icon: Layers, label: "Ecosystem" },
] as const;

export type AppModuleKey = (typeof MODULES)[number]["key"];

function resolveModule(pathname: string): AppModuleKey {
  if (pathname.startsWith("/credit")) return "credit";
  if (pathname.startsWith("/vote")) return "vote";
  if (pathname.startsWith("/ecosystem")) return "ecosystem";
  if (pathname.startsWith("/pay")) return "pay";
  return "pay";
}

export default function AppIconRail({ active }: { active?: AppModuleKey }) {
  const { pathname } = useLocation();
  const current = active ?? resolveModule(pathname);

  return (
    <aside className="hidden md:flex w-[68px] shrink-0 flex-col items-center border-r border-forest/8 bg-sage-2/80 py-5 gap-2">
      <Link
        to="/"
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl border border-forest/10 bg-white shadow-[0_8px_24px_rgba(24,40,14,0.08)] transition-transform hover:scale-105"
        aria-label="Obscura home"
      >
        <ObscuraLogo showWordmark={false} size="sm" tone="light" markClassName="h-7 w-7" />
      </Link>

      {MODULES.map((mod) => {
        const Icon = mod.icon;
        const isActive = current === mod.key;
        return (
          <Link
            key={mod.key}
            to={mod.href}
            title={mod.label}
            className={cn(
              "relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-300",
              isActive
                ? "bg-white text-forest shadow-[0_8px_24px_rgba(24,40,14,0.08)]"
                : "text-forest/45 hover:bg-white/60 hover:text-forest/80",
            )}
          >
            {isActive && (
              <motion.span
                layoutId="app-rail-active"
                className="absolute inset-0 rounded-2xl border border-forest/10 bg-white"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon className="relative z-10 h-[18px] w-[18px]" strokeWidth={1.75} />
          </Link>
        );
      })}
    </aside>
  );
}
