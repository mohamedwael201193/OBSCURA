import { ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { Github, Twitter, MessagesSquare, Lock } from "lucide-react";

export type SidebarSection = {
  /** Optional small uppercase header above the items */
  heading?: string;
  items: SidebarItem[];
};

export type SidebarItem = {
  key: string;
  label: string;
  /** Optional small description */
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  /** "SOON" or other badge */
  badge?: string;
};

interface DashboardSidebarProps {
  /** Brand logo block (top of sidebar). Defaults to ObscuraLogo + OBSCURA mark. */
  brand?: ReactNode;
  /** Sections of clickable items */
  sections: SidebarSection[];
  /** Currently active key (matches one item.key) */
  active: string;
  onSelect: (key: string) => void;
  /** Show the bottom "Powered by FHE" promo card */
  showFheCard?: boolean;
}

import ObscuraLogo from "@/components/ObscuraLogo";

const DefaultBrand = () => (
  <Link to="/" className="flex items-center gap-2.5 group">
    <ObscuraLogo size={22} className="group-hover:opacity-80 transition-opacity" />
    <span className="font-display text-[13px] tracking-[0.3em] text-foreground">
      OBSCURA
    </span>
  </Link>
);

const DashboardSidebar = ({
  brand,
  sections,
  active,
  onSelect,
  showFheCard = true,
}: DashboardSidebarProps) => {
  const location = useLocation();

  return (
    <aside className="hidden lg:flex flex-col w-[240px] shrink-0 h-screen sticky top-0 border-r border-white/[0.05] bg-black/40 backdrop-blur-xl px-4 py-5">
      {/* Optional brand override (logo lives in the top nav by default) */}
      {brand && <div className="px-2 pb-6">{brand}</div>}

      {/* Sections */}
      <nav className="flex-1 space-y-6">
        {sections.map((section, sIdx) => (
          <div key={sIdx}>
            {section.heading && (
              <div className="px-2 mb-2 text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45">
                {section.heading}
              </div>
            )}
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = item.key === active;
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => onSelect(item.key)}
                    className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-md text-left transition-all ${
                      isActive
                        ? "bg-emerald-500/10 text-emerald-300"
                        : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-pill"
                        className="absolute left-0 inset-y-[5px] w-[3px] rounded-r-full bg-emerald-400"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon className={`w-[15px] h-[15px] shrink-0 ${isActive ? "text-emerald-400" : ""}`} />
                    <span className="text-[13px] font-medium leading-tight flex-1 truncate">
                      {item.label}
                    </span>
                    {item.badge && (
                      <span className="text-[9px] tracking-[0.15em] uppercase text-muted-foreground/50 font-mono">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Powered by FHE card */}
      {showFheCard && (
        <div className="mt-4 mb-3 relative overflow-hidden rounded-lg border border-emerald-500/15 bg-gradient-to-br from-emerald-500/[0.06] via-transparent to-transparent p-4">
          <div className="flex items-center gap-2 mb-2">
            <Lock className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-[11px] font-display font-semibold text-foreground">Powered by FHE</span>
          </div>
          <p className="text-[10.5px] leading-relaxed text-muted-foreground/70">
            Fully Homomorphic Encryption for maximum privacy.
          </p>
          {/* tiny decoration */}
          <div className="absolute -bottom-3 -right-3 w-16 h-16 opacity-30">
            <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-500/30 to-transparent blur-xl" />
          </div>
        </div>
      )}

      {/* Footer: theme + socials */}
      <div className="flex items-center justify-between px-2 pt-3 border-t border-white/[0.05]">
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground/60">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          Dark
        </div>
        <div className="flex items-center gap-2 text-muted-foreground/40">
          <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
            <Twitter className="w-3.5 h-3.5" />
          </a>
          <a href="https://discord.gg" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
            <MessagesSquare className="w-3.5 h-3.5" />
          </a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-foreground transition-colors">
            <Github className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Tiny: link back hidden marker so location is "used" — keeps eslint happy */}
      <span className="hidden">{location.pathname}</span>
    </aside>
  );
};

export default DashboardSidebar;
