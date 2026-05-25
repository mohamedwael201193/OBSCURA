import { type ReactNode } from "react";
import { cn } from "@/lib/utils";
import SpadeLandingNav from "@/components/landing/spade/SpadeLandingNav";
import SpadeFooter from "@/components/landing/spade/SpadeFooter";

// ── DocsPanel ────────────────────────────────────────────────────────────────
// Lightweight styled card used throughout docs and privacy pages.
interface DocsPanelProps {
  className?: string;
  children: ReactNode;
}

export function DocsPanel({ className, children }: DocsPanelProps) {
  return (
    <div className={cn("docs-panel rounded-xl", className)}>
      {children}
    </div>
  );
}

// ── DocsShell ─────────────────────────────────────────────────────────────────
// Full-page two-column layout: sticky sidebar + scrollable content.
interface DocsShellProps {
  sidebar: ReactNode;
  children: ReactNode;
}

const DocsShell = ({ sidebar, children }: DocsShellProps) => {
  return (
    <div className="landing-spade docs-page min-h-screen bg-sage-1">
      <SpadeLandingNav />

      <div className="mx-auto max-w-[1280px] px-4 sm:px-6 lg:px-8">
        <div className="flex gap-10 py-16">
          {/* Sidebar */}
          <aside className="hidden w-56 shrink-0 lg:block">
            {sidebar}
          </aside>

          {/* Main content */}
          <main className="min-w-0 flex-1 space-y-16">
            {children}
          </main>
        </div>
      </div>

      <SpadeFooter />
    </div>
  );
};

export default DocsShell;
