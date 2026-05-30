import { Link, useLocation } from "react-router-dom";
import { DOC_NAV } from "@docs/navigation";
import { cn } from "@/lib/utils";
import { Home } from "lucide-react";

interface DocSidebarProps {
  className?: string;
  onNavigate?: () => void;
  isHome?: boolean;
  activeSlug?: string;
}

export function DocSidebar({ className, onNavigate, isHome, activeSlug }: DocSidebarProps) {
  const { pathname } = useLocation();
  const slug = activeSlug ?? (pathname.replace(/^\/docs\/?/, "") || "");
  const onHome = isHome ?? (pathname === "/docs" || pathname === "/docs/");

  return (
    <nav className={cn("docs-portal-sidebar", className)} aria-label="Documentation">
      <Link
        to="/docs"
        data-active={onHome}
        className="docs-portal-nav-link docs-portal-nav-home"
        onClick={onNavigate}
      >
        <Home className="h-3.5 w-3.5" aria-hidden />
        Overview
      </Link>

      {DOC_NAV.map((group) => (
        <div key={group.title} className="docs-nav-group">
          <div className="docs-portal-nav-group-title">{group.title}</div>
          {group.items.map((item) => (
            <Link
              key={item.slug}
              to={`/docs/${item.slug}`}
              data-active={!onHome && slug === item.slug}
              className="docs-portal-nav-link"
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}
