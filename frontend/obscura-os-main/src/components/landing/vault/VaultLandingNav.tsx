import { Link, NavLink } from "react-router-dom";
import NavRightSlot from "@/components/elite/NavRightSlot";
import ObscuraLogo from "@/components/brand/ObscuraLogo";

const NAV_LINKS = [
  { label: "Pay", href: "/pay" },
  { label: "Credit", href: "/credit" },
  { label: "Vote", href: "/vote" },
  { label: "How it works", href: "#how", anchor: true },
  { label: "Docs", href: "#docs", anchor: true },
];

export default function VaultLandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-subtle bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 py-3.5 md:px-8">
        <Link to="/" className="shrink-0 transition-opacity hover:opacity-85" aria-label="Obscura home">
          <ObscuraLogo size="sm" tone="light" />
        </Link>

        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex" aria-label="Main navigation">
          {NAV_LINKS.map((link) =>
            link.anchor ? (
              <a key={link.href} href={link.href} className="transition hover:text-foreground">
                {link.label}
              </a>
            ) : (
              <NavLink
                key={link.href}
                to={link.href}
                className={({ isActive }) =>
                  isActive ? "text-foreground transition" : "transition hover:text-foreground"
                }
              >
                {link.label}
              </NavLink>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated px-3 py-1.5 text-xs text-muted-foreground sm:inline-flex">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
            </span>
            <span className="font-mono uppercase tracking-wider">Arbitrum · Live</span>
          </span>
          <Link
            to="/pay"
            className="rounded-full bg-brand-ink px-5 py-2 text-sm text-brand-soft transition hover:opacity-90"
          >
            Launch app
          </Link>
          <NavRightSlot />
        </div>
      </div>
    </header>
  );
}
