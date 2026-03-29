const ObscuraFooter = () => {
  return (
    <footer className="border-t border-border/30 py-8 px-8">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="font-display text-xs tracking-[0.3em] text-muted-foreground/50">
            OBSCURA
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/30">
            The Dark Operating System
          </span>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-[9px] font-mono text-muted-foreground/30">
            obscura.xyz
          </span>
          <span className="text-[9px] font-mono text-muted-foreground/30">
            @obscuraOS
          </span>
        </div>
      </div>
    </footer>
  );
};

export default ObscuraFooter;
