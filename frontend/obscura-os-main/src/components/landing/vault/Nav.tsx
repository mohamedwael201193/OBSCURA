import { Link } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";
import { ObscuraLogo } from "./Logo";

export function Nav() {
  const { theme, toggle } = useTheme();
  return (
    <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/70 border-b border-border-subtle">
      <div className="mx-auto flex max-w-[1400px] items-center justify-between px-6 md:px-8 py-3.5">
        <Link to="/" className="shrink-0">
          <ObscuraLogo size="nav" tone="light" />
        </Link>

        <nav className="hidden md:flex items-center gap-7 font-mono text-xs uppercase tracking-[0.14em] text-muted-foreground">
          <Link to="/pay" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Pay</Link>
          <Link to="/credit" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Credit</Link>
          <Link to="/vote" className="hover:text-foreground transition" activeProps={{ className: "text-foreground" }}>Vote</Link>
          <a href="#how" className="hover:text-foreground transition">How it works</a>
          <a href="#docs" className="hover:text-foreground transition">Docs</a>
        </nav>

        <div className="flex items-center gap-2">
          <span className="hidden sm:inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated px-3 py-1.5 text-xs text-muted-foreground">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-brand" />
            </span>
            <span className="font-mono uppercase tracking-wider">Arbitrum · Live</span>
          </span>
          <button
            onClick={toggle}
            aria-label="Toggle theme"
            className="size-9 rounded-full border border-border-subtle bg-surface-elevated flex items-center justify-center text-muted-foreground hover:text-foreground transition"
          >
            {theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
          <Link to="/pay" className="rounded-full bg-brand-ink px-5 py-2 font-mono text-xs uppercase tracking-[0.14em] text-brand-soft hover:opacity-90 transition">
            Launch app
          </Link>
        </div>
      </div>
    </header>
  );
}
