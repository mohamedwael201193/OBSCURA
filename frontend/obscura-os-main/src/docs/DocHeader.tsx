import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { buildSearchIndex } from "@docs/index";
import { Search, Menu, ExternalLink, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { DocSidebar } from "./DocSidebar";

const SEARCH_INDEX = buildSearchIndex();

interface DocHeaderProps {
  searchOpen?: boolean;
  onSearchOpenChange?: (open: boolean) => void;
}

export function DocHeader({ searchOpen: controlledOpen, onSearchOpenChange }: DocHeaderProps = {}) {
  const [internalOpen, setInternalOpen] = useState(false);
  const searchOpen = controlledOpen ?? internalOpen;
  const setSearchOpen = onSearchOpenChange ?? setInternalOpen;
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isHome = pathname === "/docs" || pathname === "/docs/";

  const openSearch = useCallback(() => setSearchOpen(true), [setSearchOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        openSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openSearch]);

  return (
    <>
      <header className="docs-portal-header">
        <div className="docs-header-inner">
          <div className="docs-header-left">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="lg:hidden shrink-0" aria-label="Open navigation menu">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-[min(300px,85vw)] p-0 border-r border-[rgba(24,40,14,0.08)]">
                <DocSidebar onNavigate={() => setMobileOpen(false)} isHome={isHome} />
              </SheetContent>
            </Sheet>

            <Link to="/" className="docs-logo" aria-label="Obscura home">
              <span className="docs-logo-mark">Obscura</span>
              <span className="docs-logo-sub">Developers</span>
            </Link>
          </div>

          <button
            type="button"
            onClick={openSearch}
            className="docs-search-trigger"
            aria-label="Search documentation (Command K)"
          >
            <Search className="h-4 w-4 shrink-0 text-[#2d8a5e]" strokeWidth={2.25} />
            <span className="docs-search-placeholder">Search documentation…</span>
            <kbd className="docs-search-kbd">⌘K</kbd>
          </button>

          <div className="docs-header-right">
            <Link to="/docs" className="docs-header-link hidden sm:inline-flex">
              <BookOpen className="h-3.5 w-3.5" /> Docs
            </Link>
            <a
              href="https://www.npmjs.com/package/@obscura-fhe/sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="docs-header-link hidden md:inline-flex"
            >
              SDK <ExternalLink className="h-3 w-3 opacity-60" />
            </a>
            <Link to="/pay" className="docs-header-cta">
              Open app
            </Link>
          </div>
        </div>
      </header>

      <CommandDialog open={searchOpen} onOpenChange={setSearchOpen}>
        <div className="docs-command-chrome">
          <CommandInput placeholder="Search pages, APIs, concepts…" className="docs-command-input" />
          <CommandList className="docs-command-list">
            <CommandEmpty className="docs-command-empty">No matching documentation.</CommandEmpty>
            <div className="docs-command-hint px-4 py-2 text-xs text-[rgba(24,40,14,0.45)] border-b border-[rgba(24,40,14,0.06)]">
              Jump to a page · {SEARCH_INDEX.length} topics
            </div>
            {SEARCH_INDEX.reduce<{ category: string; items: typeof SEARCH_INDEX }[]>((acc, entry) => {
              const last = acc[acc.length - 1];
              if (last?.category === entry.category) last.items.push(entry);
              else acc.push({ category: entry.category, items: [entry] });
              return acc;
            }, []).map((group) => (
              <CommandGroup key={group.category} heading={group.category} className="docs-command-group">
                {group.items.map((entry) => (
                  <CommandItem
                    key={entry.slug}
                    value={`${entry.title} ${entry.description} ${entry.excerpt}`}
                    className="docs-command-item"
                    onSelect={() => {
                      navigate(entry.slug === "home" ? "/docs" : `/docs/${entry.slug}`);
                      setSearchOpen(false);
                    }}
                  >
                    <div className="flex flex-col gap-0.5 py-0.5">
                      <span className="font-medium text-[#18280e]">{entry.title}</span>
                      <span className="text-xs text-[rgba(24,40,14,0.5)] line-clamp-1">{entry.description}</span>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            ))}
          </CommandList>
        </div>
      </CommandDialog>
    </>
  );
}
