import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import NavRightSlot from "@/components/elite/NavRightSlot";
import ObscuraLogo from "@/components/brand/ObscuraLogo";

const NAV_LINKS = [
  { label: "Pay", href: "/pay" },
  { label: "Credit", href: "/credit" },
  { label: "Vote", href: "/vote" },
  { label: "How it works", href: "#how", anchor: true },
  { label: "Docs", href: "/docs" },
] as const;

export default function SpadeLandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky inset-x-0 top-0 z-50 h-16 w-full bg-white transition-shadow duration-300",
        scrolled && "shadow-sm shadow-black/5",
      )}
    >
      <div className="mx-auto flex h-full max-w-[1400px] items-center justify-between px-5 lg:px-8">
        <Link to="/" className="transition-opacity hover:opacity-85" aria-label="Obscura home">
          <ObscuraLogo size="sm" tone="light" />
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) =>
            "anchor" in link && link.anchor ? (
              <a
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-forest/70 transition-colors hover:text-forest"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.href}
                to={link.href}
                className="text-sm font-medium text-forest/70 transition-colors hover:text-forest"
              >
                {link.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            to="/pay"
            className="hidden rounded-full bg-sage-2 px-4 py-2 text-sm font-medium text-forest transition-colors hover:bg-sage-3 sm:inline-block"
          >
            Launch App
          </Link>
          <NavRightSlot tone="light" />
        </div>
      </div>
    </header>
  );
}
