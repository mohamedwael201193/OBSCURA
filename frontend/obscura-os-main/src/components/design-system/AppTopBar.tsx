import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Moon, Plus, Search } from "lucide-react";
import NavRightSlot from "@/components/elite/NavRightSlot";
import { cn } from "@/lib/utils";
import ObscuraLogo from "@/components/brand/ObscuraLogo";

export default function AppTopBar({
  searchPlaceholder = "Search…",
}: {
  searchPlaceholder?: string;
  productLabel?: string;
}) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 shrink-0 items-center gap-4 border-b border-forest/10 bg-sage-1 px-4 sm:px-6",
        scrolled && "border-forest/12",
      )}
    >
      <Link to="/" className="flex shrink-0 items-center sm:hidden" aria-label="Obscura home">
        <ObscuraLogo showWordmark={false} size="sm" tone="light" markClassName="h-7 w-7" />
      </Link>
      <div className="relative hidden max-w-sm flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest/35" />
        <input
          type="search"
          readOnly
          placeholder={searchPlaceholder}
          className="premium-focus h-9 w-full rounded-full border border-forest/10 bg-white pl-9 pr-3 text-sm text-forest placeholder:text-forest/35"
          aria-label={searchPlaceholder}
        />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <Link
          to="/pay"
          className="hidden items-center gap-1 rounded-full border border-forest/12 bg-white px-3 py-1.5 text-xs font-medium text-forest sm:inline-flex"
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </Link>
        <button
          type="button"
          className="flex h-9 w-9 items-center justify-center rounded-full border border-forest/10 bg-white text-forest/45"
          aria-label="Theme"
        >
          <Moon className="h-4 w-4" />
        </button>
        <div className="app-wallet-slot">
          <NavRightSlot />
        </div>
      </div>
    </header>
  );
}
