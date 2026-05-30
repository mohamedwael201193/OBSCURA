import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPage } from "@docs/index";
import { DocHeader } from "./DocHeader";
import { DocSidebar } from "./DocSidebar";
import { DocContent } from "./DocContent";
import { DocsHome } from "./DocsHome";
import "./docs-portal.css";

function DocBreadcrumb({ slug, title }: { slug: string; title: string }) {
  return (
    <nav className="docs-breadcrumb" aria-label="Breadcrumb">
      <Link to="/docs">Docs</Link>
      <span aria-hidden>/</span>
      <span aria-current="page">{slug === "ecosystem" ? title : title}</span>
    </nav>
  );
}

export default function DeveloperPortal() {
  const { slug } = useParams<{ slug?: string }>();
  const [searchOpen, setSearchOpen] = useState(false);
  const isHome = !slug;
  const page = slug ? getPage(slug) : null;

  return (
    <div className="docs-portal">
      <DocHeader searchOpen={searchOpen} onSearchOpenChange={setSearchOpen} />
      <div className="docs-portal-layout">
        <DocSidebar className="hidden lg:block" isHome={isHome} activeSlug={slug} />
        <main className="docs-portal-main" id="docs-main">
          {isHome ? (
            <DocsHome onOpenSearch={() => setSearchOpen(true)} />
          ) : !page ? (
            <div className="docs-not-found">
              <h1>Page not found</h1>
              <p>The documentation page you requested does not exist.</p>
              <Link to="/docs">Back to Developer Portal</Link>
            </div>
          ) : (
            <>
              <DocBreadcrumb slug={page.slug} title={page.title} />
              <header className="docs-page-header">
                <h1 className="docs-page-title">{page.title}</h1>
                <p className="docs-portal-lead">{page.description}</p>
              </header>
              <DocContent blocks={page.blocks} />
              <footer className="docs-page-footer">
                <span>Obscura Developer Portal · Arbitrum Sepolia</span>
                <a
                  href="https://github.com/mohamedwael201193/OBSCURA/tree/main/docs/portal"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Edit on GitHub
                </a>
              </footer>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
