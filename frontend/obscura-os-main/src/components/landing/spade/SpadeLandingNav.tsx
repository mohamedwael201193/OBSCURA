import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import NavRightSlot from "@/components/elite/NavRightSlot";
import ObscuraLogo from "@/components/brand/ObscuraLogo";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Privacy", href: "/privacy" },
  { label: "Docs", href: "/docs" },
] as const;

const navLinkClass =
  "font-mono text-xs font-semibold uppercase tracking-[0.16em] text-[#0a0f08] transition-opacity hover:opacity-70";

const launchAppClass =
  "hidden inline-flex items-center justify-center rounded-full bg-forest px-6 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.14em] text-lime-accent transition-opacity hover:opacity-90 sm:inline-flex";

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
        <Link to="/" className="inline-flex" aria-label="Obscura home">
          <ObscuraLogo size="nav" tone="light" />
        </Link>

        <nav className="flex items-center gap-6 sm:gap-8" aria-label="Main navigation">
          {NAV_LINKS.map((link) => (
            <Link key={link.href} to={link.href} className={navLinkClass}>
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-3">
          <Link to="/pay" className={launchAppClass}>
            Launch App
          </Link>
          <NavRightSlot tone="light" />
        </div>
      </div>
    </header>
  );
}
