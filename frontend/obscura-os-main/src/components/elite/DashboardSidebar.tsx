import { motion } from "framer-motion";
import { Github, Twitter, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import ObscuraLogo from "@/components/brand/ObscuraLogo";

export type SidebarSection = {
  heading?: string;
  items: SidebarItem[];
};

export type SidebarItem = {
  key: string;
  label: string;
  description?: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
};

interface DashboardSidebarProps {
  sections: SidebarSection[];
  active: string;
  onSelect: (key: string) => void;
  showFheCard?: boolean;
}

const DashboardSidebar = ({
  sections,
  active,
  onSelect,
  showFheCard = true,
}: DashboardSidebarProps) => {
  return (
    <aside className="hidden lg:flex w-[220px] shrink-0 flex-col border-r border-forest/10 bg-sage-2 px-2 py-4">
      <div className="mb-5 px-3">
        <ObscuraLogo size="sm" tone="light" />
        <p className="mt-1 font-mono text-[9px] uppercase tracking-[0.18em] text-forest/35">
          Private finance OS
        </p>
      </div>
      <nav className="flex-1 space-y-5">
        {sections.map((section, sIdx) => (
          <div key={sIdx}>
            {section.heading && (
              <div className="px-3 mb-1.5 font-mono text-[10px] tracking-[0.2em] uppercase text-forest/35">
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
                    className={cn(
                      "relative w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-[13px] font-medium transition-colors",
                      isActive
                        ? "bg-white text-forest"
                        : "text-forest/50 hover:bg-white/60 hover:text-forest/80",
                    )}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="sidebar-pill"
                        className="absolute inset-0 rounded-xl bg-white"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <Icon className="relative z-10 w-[15px] h-[15px] shrink-0" />
                    <span className="relative z-10 truncate flex-1">{item.label}</span>
                    {item.badge && (
                      <span className="relative z-10 font-mono text-[9px] text-forest/35">{item.badge}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {showFheCard && (
        <div className="mt-4 mb-2 rounded-xl border border-forest/10 bg-white p-3.5">
          <div className="flex items-center gap-2 mb-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-[11px] font-medium text-forest">Powered by FHE</span>
          </div>
          <p className="text-[10px] leading-relaxed text-forest/45">
            Encrypt locally. Reveal on permit.
          </p>
        </div>
      )}

      <div className="flex items-center justify-between px-3 pt-3 border-t border-forest/10">
        <span className="text-[10px] text-forest/40">FHE · Arbitrum</span>
        <div className="flex items-center gap-2 text-forest/30">
          <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-forest">
            <Twitter className="w-3.5 h-3.5" />
          </a>
          <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-forest">
            <Github className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
