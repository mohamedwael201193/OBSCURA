import { Link } from "react-router-dom";
import { ArrowRight, Search, BookOpen, Terminal, Shield } from "lucide-react";
import { DocVisual } from "./DocVisuals";

interface DocsHomeProps {
  onOpenSearch: () => void;
}

export function DocsHome({ onOpenSearch }: DocsHomeProps) {
  return (
    <div className="docs-home">
      <section className="docs-hero">
        <div className="docs-hero-badge">Developer Platform · Arbitrum Sepolia</div>
        <h1 className="docs-hero-title">
          Build privacy-first DeFi with Obscura
        </h1>
        <p className="docs-hero-lead">
          Obscura is encrypted finance on Arbitrum Sepolia — private payments (Pay), lending (Credit),
          and governance (Vote) unified under one SDK, one asset (ocUSDC_Pay), and shared reputation,
          activity, and notification services.
        </p>
        <div className="docs-hero-actions">
          <Link to="/docs/quick-start" className="docs-btn docs-btn--primary">
            Quick start <ArrowRight className="h-4 w-4" />
          </Link>
          <button type="button" className="docs-btn docs-btn--secondary" onClick={onOpenSearch}>
            <Search className="h-4 w-4" /> Search docs
          </button>
          <a
            href="https://www.npmjs.com/package/@obscura-fhe/sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="docs-btn docs-btn--ghost"
          >
            <Terminal className="h-4 w-4" /> @obscura-fhe/sdk
          </a>
        </div>
      </section>

      <section className="docs-home-section">
        <h2 className="docs-home-section-title">Ecosystem at a glance</h2>
        <DocVisual variant="ecosystem-map" />
      </section>

      <section className="docs-home-section">
        <h2 className="docs-home-section-title">Developer path</h2>
        <p className="docs-home-section-desc">
          From npm install to encrypted on-chain writes — follow this sequence.
        </p>
        <DocVisual variant="onboarding-path" />
      </section>

      <section className="docs-home-section">
        <h2 className="docs-home-section-title">Platform scale</h2>
        <DocVisual variant="scale-grid" />
      </section>

      <section className="docs-home-cards">
        <Link to="/docs/architecture" className="docs-home-card">
          <BookOpen className="h-5 w-5 text-[#2d8a5e]" />
          <span className="docs-home-card-title">Architecture</span>
          <span className="docs-home-card-desc">Five-tier system design & data flows</span>
        </Link>
        <Link to="/docs/privacy" className="docs-home-card">
          <Shield className="h-5 w-5 text-[#2d8a5e]" />
          <span className="docs-home-card-title">Privacy model</span>
          <span className="docs-home-card-desc">Encrypted vs public vs reveal boundaries</span>
        </Link>
        <Link to="/docs/sdk" className="docs-home-card">
          <Terminal className="h-5 w-5 text-[#2d8a5e]" />
          <span className="docs-home-card-title">SDK reference</span>
          <span className="docs-home-card-desc">All six modules, types & patterns</span>
        </Link>
      </section>
    </div>
  );
}
