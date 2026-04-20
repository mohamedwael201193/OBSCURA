import { Link } from "react-router-dom";

const ObscuraFooter = () => {
  return (
    <footer className="border-t border-white/[0.04] py-8 px-8">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-display text-sm tracking-[0.2em] text-muted-foreground/50">
            OBSCURA
          </span>
          <span className="text-xs text-muted-foreground/30">
            The Dark Operating System for Onchain Privacy
          </span>
        </div>
        <div className="flex items-center gap-6">
          <Link to="/privacy" className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            Privacy
          </Link>
          <Link to="/docs" className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors">
            Docs
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default ObscuraFooter;
