import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

export function HarmonyEncryptedValue({
  value,
  symbol = "USDC",
  defaultRevealed = false,
  size = "md",
  className,
}: {
  value: string;
  symbol?: string;
  defaultRevealed?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const [revealed, setRevealed] = useState(defaultRevealed);
  const sizes = {
    sm: "text-base",
    md: "text-2xl",
    lg: "text-5xl md:text-6xl",
  } as const;

  return (
    <div className={cn("flex items-baseline gap-3", className)}>
      <span className={cn("font-display tabular-nums", sizes[size])}>
        {revealed ? (
          value
        ) : (
          <span className="cipher-shimmer text-muted-foreground">••••••</span>
        )}
      </span>
      <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">{symbol}</span>
      <button
        type="button"
        onClick={() => setRevealed((r) => !r)}
        className="ml-1 grid h-6 w-6 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        aria-label={revealed ? "Hide value" : "Reveal value"}
      >
        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
      </button>
    </div>
  );
}
