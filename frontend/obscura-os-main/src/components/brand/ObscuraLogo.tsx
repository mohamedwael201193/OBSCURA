import { cn } from "@/lib/utils";

/** Tight-crop full O mark — transparent PNG. */
export const OBSCURA_LOGO_SRC = "/brand/obscura-o-mark.png";
export const OBSCURA_LOGO_RATIO = 399 / 480;

type ObscuraLogoTone = "light" | "dark" | "mono";
type ObscuraLogoSize = "sm" | "md" | "lg" | "nav";

const markSize = (heightClass: string) =>
  `${heightClass} w-auto aspect-[399/480] max-w-none`;

const sizeMap: Record<
  ObscuraLogoSize,
  { mark: string; markOnly: string; word: string; gap: string }
> = {
  /** Landing / app nav — compact lockup for h-16 bar. */
  nav: {
    mark: markSize("h-9"),
    markOnly: markSize("h-9"),
    word: "text-[1.35rem]",
    gap: "gap-3.5",
  },
  sm: {
    mark: markSize("h-9"),
    markOnly: markSize("h-9"),
    word: "text-[1.3rem]",
    gap: "gap-3",
  },
  md: {
    mark: markSize("h-10"),
    markOnly: markSize("h-10"),
    word: "text-[1.45rem]",
    gap: "gap-3.5",
  },
  lg: {
    mark: markSize("h-12"),
    markOnly: markSize("h-12"),
    word: "text-[1.65rem]",
    gap: "gap-4",
  },
};

const toneMap: Record<ObscuraLogoTone, { word: string }> = {
  light: { word: "text-forest" },
  dark: { word: "text-sage-1" },
  mono: { word: "text-current" },
};

/** Sora — matches Spade-style headline / logotype weight. */
const WORDMARK_TEXT =
  "font-spadeDisplay font-semibold leading-none tracking-[-0.04em] uppercase antialiased";

const MARK_HOVER =
  "transition-transform duration-500 ease-out will-change-transform group-hover:scale-[1.08] group-hover:-rotate-[3deg]";

const WORD_HOVER =
  "transition-[opacity,letter-spacing] duration-300 ease-out group-hover:opacity-90 group-hover:tracking-[0.07em]";

export function ObscuraMark({
  className,
  tone = "light",
  title = "",
  alt = "Obscura",
  interactive = true,
}: {
  className?: string;
  tone?: ObscuraLogoTone;
  title?: string;
  alt?: string;
  interactive?: boolean;
}) {
  return (
    <img
      src={OBSCURA_LOGO_SRC}
      alt={alt}
      title={title || undefined}
      role={alt ? "img" : "presentation"}
      aria-hidden={alt ? undefined : true}
      draggable={false}
      className={cn(
        "shrink-0 bg-transparent object-contain",
        interactive && MARK_HOVER,
        className,
      )}
    />
  );
}

export default function ObscuraLogo({
  className,
  markClassName,
  showWordmark = true,
  size = "md",
  tone = "light",
  interactive = true,
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  size?: ObscuraLogoSize;
  tone?: ObscuraLogoTone;
  interactive?: boolean;
}) {
  const sizing = sizeMap[size];
  const colors = toneMap[tone];
  const groupClass = interactive ? "group cursor-pointer" : "";

  if (!showWordmark) {
    return (
      <span className={cn("inline-flex", groupClass, className)}>
        <ObscuraMark
          tone={tone}
          interactive={interactive}
          className={cn(sizing.markOnly, markClassName)}
        />
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap",
        sizing.gap,
        groupClass,
        className,
      )}
      aria-label="Obscura"
    >
      <ObscuraMark
        tone={tone}
        alt=""
        interactive={interactive}
        className={cn(sizing.mark, markClassName)}
      />
      <span
        className={cn(
          WORDMARK_TEXT,
          sizing.word,
          colors.word,
          interactive && WORD_HOVER,
        )}
      >
        OBSCURA
      </span>
    </span>
  );
}
