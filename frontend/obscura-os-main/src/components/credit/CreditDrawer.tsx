/**
 * CreditDrawer — full section list in a Sheet (mobile). Mirrors the desktop
 * DashboardSidebar exactly so the user has the same map of the surface.
 */
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { SidebarSection } from "@/components/elite/DashboardSidebar";
import type { CreditTabKey } from "./CreditTabBar";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  sections: SidebarSection[];
  active: CreditTabKey;
  onSelect: (k: CreditTabKey) => void;
}

export default function CreditDrawer({ open, onOpenChange, sections, active, onSelect }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="left"
        className="w-[78vw] max-w-[320px] bg-[#06090c]/96 backdrop-blur-2xl border-r border-white/10 p-0"
      >
        <SheetHeader className="px-5 pt-5 pb-3">
          <SheetTitle className="text-sm tracking-[0.18em] uppercase text-white/70 font-mono">Obscura · Credit</SheetTitle>
        </SheetHeader>
        <div className="px-3 pb-6 overflow-y-auto h-[calc(100vh-72px)]">
          {sections.map((section, i) => (
            <div key={i} className="mb-4">
              {section.heading && (
                <div className="px-3 mt-2 mb-1 text-[9.5px] tracking-[0.22em] uppercase text-white/35 font-mono">
                  {section.heading}
                </div>
              )}
              <ul className="grid">
                {section.items.map((it) => {
                  const Icon = it.icon;
                  const isActive = active === (it.key as CreditTabKey);
                  return (
                    <li key={it.key}>
                      <button
                        type="button"
                        onClick={() => { onSelect(it.key as CreditTabKey); onOpenChange(false); }}
                        className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[12.5px] transition-colors ${
                          isActive
                            ? "bg-violet-500/10 text-violet-200 border border-violet-500/25"
                            : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent"
                        }`}
                      >
                        <Icon className="w-3.5 h-3.5" />
                        <span>{it.label}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
