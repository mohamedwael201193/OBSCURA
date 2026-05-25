/**
 * Obscura mark — a sealed aperture / encrypted iris.
 * - Outer ring = public chain (visible)
 * - Inner blades = encryption layers folding inward
 * - Center dot = the unrevealed value
 * Renders crisply at any size, theme-aware via currentColor.
 */
export function ObscuraMark({
  size = 28,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <defs>
        <linearGradient id="obs-g" x1="0" y1="0" x2="40" y2="40" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="1" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0.55" />
        </linearGradient>
        <radialGradient id="obs-c" cx="20" cy="20" r="9" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.95" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </radialGradient>
      </defs>
      {/* outer ring */}
      <circle cx="20" cy="20" r="18.25" stroke="url(#obs-g)" strokeWidth="1.5" />
      {/* aperture blades */}
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.92">
        <path d="M20 6.5 L28.5 13 L26.5 23" />
        <path d="M33.5 20 L29 28.5 L19 30.5" />
        <path d="M20 33.5 L11.5 27 L13.5 17" />
        <path d="M6.5 20 L11 11.5 L21 9.5" />
      </g>
      {/* center sealed value */}
      <circle cx="20" cy="20" r="8.5" fill="url(#obs-c)" opacity="0.4" />
      <circle cx="20" cy="20" r="2.6" fill="currentColor" />
    </svg>
  );
}

export function ObscuraLogo({
  className,
  size = 28,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span className={`inline-flex items-center gap-2.5 text-foreground ${className ?? ""}`}>
      <ObscuraMark size={size} className="text-brand" />
      <span className="font-display text-[22px] leading-none tracking-tight">
        Obscura
      </span>
    </span>
  );
}
