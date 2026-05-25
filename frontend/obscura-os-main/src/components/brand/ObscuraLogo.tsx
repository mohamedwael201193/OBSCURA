import { cn } from "@/lib/utils";

type ObscuraLogoTone = "light" | "dark" | "mono";
type ObscuraLogoSize = "sm" | "md" | "lg";

const sizeMap: Record<ObscuraLogoSize, { mark: string; word: string; gap: string }> = {
  sm: { mark: "h-7 w-7", word: "text-[1.05rem]", gap: "gap-2" },
  md: { mark: "h-9 w-9", word: "text-[1.35rem]", gap: "gap-2.5" },
  lg: { mark: "h-12 w-12", word: "text-3xl", gap: "gap-3" },
};

const toneMap: Record<ObscuraLogoTone, { fg: string; muted: string; glow: string; word: string }> = {
  light: {
    fg: "#18280E",
    muted: "#2D6B45",
    glow: "#B2EB76",
    word: "text-forest",
  },
  dark: {
    fg: "#F7F9F2",
    muted: "#B2EB76",
    glow: "#5ECF8A",
    word: "text-sage-1",
  },
  mono: {
    fg: "currentColor",
    muted: "currentColor",
    glow: "currentColor",
    word: "text-current",
  },
};

export function ObscuraMark({
  className,
  tone = "light",
  title = "Obscura",
}: {
  className?: string;
  tone?: ObscuraLogoTone;
  title?: string;
}) {
  const colors = toneMap[tone];
  const gradientId = `obscura-mark-gradient-${tone}`;
  const glowId = `obscura-mark-glow-${tone}`;

  return (
    <svg
      viewBox="0 0 64 64"
      role="img"
      aria-label={title}
      className={cn("shrink-0 overflow-visible", className)}
      fill="none"
    >
      <defs>
        <linearGradient id={gradientId} x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={colors.fg} />
          <stop offset="0.54" stopColor={colors.muted} />
          <stop offset="1" stopColor={colors.fg} />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(33 31) rotate(90) scale(24)">
          <stop offset="0" stopColor={colors.glow} stopOpacity="0.42" />
          <stop offset="1" stopColor={colors.glow} stopOpacity="0" />
        </radialGradient>
      </defs>

      <path
        d="M32 5.5C47.1 5.5 58.5 16.9 58.5 32S47.1 58.5 32 58.5 5.5 47.1 5.5 32 16.9 5.5 32 5.5Z"
        fill={`url(#${glowId})`}
      />
      <path
        d="M32 8.5c12.9 0 23.5 10.6 23.5 23.5S44.9 55.5 32 55.5 8.5 44.9 8.5 32 19.1 8.5 32 8.5Z"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
      />
      <path
        d="M32 17.5c8.5 0 14.5 6 14.5 14.5S40.5 46.5 32 46.5 17.5 40.5 17.5 32 23.5 17.5 32 17.5Z"
        stroke={colors.fg}
        strokeWidth="1.35"
        strokeDasharray="2.4 4.2"
        opacity="0.5"
      />
      <path
        d="M32 21.5c3.7 0 7 1.7 9.1 4.4l-8.8 5.3H21.7C22.1 25.8 26.5 21.5 32 21.5Z"
        fill={colors.fg}
        opacity="0.9"
      />
      <path
        d="M42.2 28.3c.5 1.2.8 2.5.8 3.9 0 5.7-4.6 10.3-10.3 10.3-2.4 0-4.5-.8-6.2-2.1l8.8-5.4h8.6c-.1-2.4-.7-4.6-1.7-6.7Z"
        fill={colors.fg}
        opacity="0.72"
      />
      <path
        d="M21.7 31.2h10.6l-8.8 5.4a10.2 10.2 0 0 1-1.8-5.4Z"
        fill={colors.muted}
        opacity="0.95"
      />
      <path
        d="M24.8 13.7 20.4 9.3M43.6 54.7l-4.4-4.4M50.3 20.4l4.4-4.4M9.3 43.6l4.4-4.4"
        stroke={colors.muted}
        strokeWidth="1.5"
        strokeLinecap="round"
        opacity="0.7"
      />
    </svg>
  );
}

export default function ObscuraLogo({
  className,
  markClassName,
  showWordmark = true,
  size = "md",
  tone = "light",
}: {
  className?: string;
  markClassName?: string;
  showWordmark?: boolean;
  size?: ObscuraLogoSize;
  tone?: ObscuraLogoTone;
}) {
  const sizing = sizeMap[size];
  const colors = toneMap[tone];

  return (
    <span className={cn("inline-flex items-center", sizing.gap, className)}>
      <ObscuraMark tone={tone} className={cn(sizing.mark, markClassName)} />
      {showWordmark ? (
        <span className={cn("font-display font-bold leading-none tracking-[-0.045em]", sizing.word, colors.word)}>
          OBSCURA
        </span>
      ) : null}
    </span>
  );
}
