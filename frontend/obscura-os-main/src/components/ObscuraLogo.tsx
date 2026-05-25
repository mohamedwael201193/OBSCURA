export type ObscuraLogoVariant = "default" | "onDark" | "mono";

export type ObscuraLogoProps = {
  size?: number;
  className?: string;
  variant?: ObscuraLogoVariant;
};

const PALETTE = {
  default: { fg: "#18280E", muted: "#2D6B45", glow: "#B2EB76" },
  onDark: { fg: "#F7F9F2", muted: "#B2EB76", glow: "#5ECF8A" },
  mono: { fg: "currentColor", muted: "currentColor", glow: "currentColor" },
} as const;

/** Backwards-compatible symbol-only mark used by older nav components. */
export default function ObscuraLogo({
  size = 32,
  className,
  variant = "default",
}: ObscuraLogoProps) {
  const c = PALETTE[variant];
  const gradientId = `legacy-obscura-gradient-${variant}`;
  const glowId = `legacy-obscura-glow-${variant}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id={gradientId} x1="12" y1="8" x2="52" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={c.fg} />
          <stop offset="0.54" stopColor={c.muted} />
          <stop offset="1" stopColor={c.fg} />
        </linearGradient>
        <radialGradient id={glowId} cx="0" cy="0" r="1" gradientUnits="userSpaceOnUse" gradientTransform="translate(33 31) rotate(90) scale(24)">
          <stop offset="0" stopColor={c.glow} stopOpacity="0.42" />
          <stop offset="1" stopColor={c.glow} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M32 5.5C47.1 5.5 58.5 16.9 58.5 32S47.1 58.5 32 58.5 5.5 47.1 5.5 32 16.9 5.5 32 5.5Z" fill={`url(#${glowId})`} />
      <path d="M32 8.5c12.9 0 23.5 10.6 23.5 23.5S44.9 55.5 32 55.5 8.5 44.9 8.5 32 19.1 8.5 32 8.5Z" stroke={`url(#${gradientId})`} strokeWidth="3" />
      <path d="M32 17.5c8.5 0 14.5 6 14.5 14.5S40.5 46.5 32 46.5 17.5 40.5 17.5 32 23.5 17.5 32 17.5Z" stroke={c.fg} strokeWidth="1.35" strokeDasharray="2.4 4.2" opacity="0.5" />
      <path d="M32 21.5c3.7 0 7 1.7 9.1 4.4l-8.8 5.3H21.7C22.1 25.8 26.5 21.5 32 21.5Z" fill={c.fg} opacity="0.9" />
      <path d="M42.2 28.3c.5 1.2.8 2.5.8 3.9 0 5.7-4.6 10.3-10.3 10.3-2.4 0-4.5-.8-6.2-2.1l8.8-5.4h8.6c-.1-2.4-.7-4.6-1.7-6.7Z" fill={c.fg} opacity="0.72" />
      <path d="M21.7 31.2h10.6l-8.8 5.4a10.2 10.2 0 0 1-1.8-5.4Z" fill={c.muted} opacity="0.95" />
      <path d="M24.8 13.7 20.4 9.3M43.6 54.7l-4.4-4.4M50.3 20.4l4.4-4.4M9.3 43.6l4.4-4.4" stroke={c.muted} strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
    </svg>
  );
}
