import { Link } from "react-router-dom";
import { ObscuraMark } from "./Logo";

export function Footer() {
  return (
    <footer id="docs" className="border-t border-border-subtle bg-background">
      <div className="mx-auto max-w-[1400px] px-6 md:px-8 py-20">
        <div className="grid gap-12 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div>
            <div className="flex items-center gap-2.5">
              <ObscuraMark size={28} className="text-brand" />
              <span className="font-display text-2xl tracking-tight text-foreground">Obscura</span>
            </div>
            <p className="mt-4 max-w-sm text-sm text-muted-foreground leading-relaxed">
              The encrypted operating system for onchain privacy. Pay, Credit,
              and Vote — unified by one FHE engine, settled on Arbitrum.
            </p>
            <div className="mt-6 inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface-elevated px-3 py-1.5 text-xs text-muted-foreground">
              <span className="size-1.5 rounded-full bg-brand" />
              <span className="font-mono uppercase tracking-wider">All systems operational</span>
            </div>
          </div>

          <FooterCol
            title="Products"
            links={[
              { to: "/pay", label: "Obscura Pay" },
              { to: "/credit", label: "Obscura Credit" },
              { to: "/vote", label: "Obscura Vote" },
            ]}
          />
          <FooterCol
            title="Resources"
            links={[
              { to: "/", label: "Documentation" },
              { to: "/", label: "Whitepaper" },
              { to: "/", label: "Security & Audits" },
              { to: "/", label: "Brand kit" },
            ]}
          />
          <FooterCol
            title="Company"
            links={[
              { to: "/", label: "About Obscura" },
              { to: "/", label: "Careers" },
              { to: "/", label: "Press" },
              { to: "/", label: "Contact" },
            ]}
          />
        </div>

        <div className="mt-16 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pt-8 border-t border-border-subtle">
          <div className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
            © {new Date().getFullYear()} Obscura Labs · Encrypted by mathematics
          </div>
          <div className="flex items-center gap-6 text-xs text-muted-foreground">
            <a href="#" className="hover:text-foreground transition">Privacy</a>
            <a href="#" className="hover:text-foreground transition">Terms</a>
            <a href="#" className="hover:text-foreground transition">Status</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({
  title,
  links,
}: {
  title: string;
  links: { to: string; label: string }[];
}) {
  return (
    <div>
      <div className="tag-bracket mb-4">▸ {title}</div>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            <Link to={l.to} className="text-foreground hover:text-brand transition">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
