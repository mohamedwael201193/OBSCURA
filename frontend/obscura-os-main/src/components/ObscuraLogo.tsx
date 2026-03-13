import { OBSCURA_LOGO_RATIO, OBSCURA_LOGO_SRC } from "@/components/brand/ObscuraLogo";

export type ObscuraLogoVariant = "default" | "onDark" | "mono";

export type ObscuraLogoProps = {
  /** Mark height in px; width follows logo aspect ratio. */
  size?: number;
  className?: string;
  variant?: ObscuraLogoVariant;
};

/** Backwards-compatible symbol-only mark used by older nav components. */
export default function ObscuraLogo({
  size = 36,
  className,
}: ObscuraLogoProps) {
  const height = size;
  const width = Math.round(size * OBSCURA_LOGO_RATIO);

  return (
    <img
      src={OBSCURA_LOGO_SRC}
      alt="Obscura"
      width={width}
      height={height}
      className={className}
      style={{ width, height }}
    />
  );
}
