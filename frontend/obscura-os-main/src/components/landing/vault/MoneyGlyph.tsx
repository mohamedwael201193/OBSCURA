// 3D contour-stripe "$" glyph — sculptural, topographic, premium fintech.
export function MoneyGlyph({ className }: { className?: string }) {
  return (
    <img
      src="/images/money-glyph-3d.png"
      width={1024}
      height={1024}
      alt=""
      aria-hidden
      className={`${className ?? ""} object-contain select-none pointer-events-none`}
      draggable={false}
    />
  );
}
