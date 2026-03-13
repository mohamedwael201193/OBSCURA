export interface LayerBounds {
  left: number;
  right: number;
}

function gaussian(value: number, center: number, width: number) {
  const d = (value - center) / width;
  return Math.exp(-d * d);
}

/** Irregular “privacy layer” silhouette — topographic wireframe */
export function edgeBounds(
  y: number,
  cx: number,
  cy: number,
  rx: number,
  ry: number,
): LayerBounds | null {
  const ny = (y - cy) / ry;
  if (Math.abs(ny) > 1) return null;

  let left = cx - rx * Math.sqrt(1 - ny * ny);
  let right = cx + rx * Math.sqrt(1 - ny * ny);
  const localY = y - cy;

  right -= gaussian(localY, 28, 38) * 52;
  right -= gaussian(localY, 120, 32) * 38;
  left += gaussian(localY, -118, 30) * 40;
  left += gaussian(localY, 145, 26) * 36;

  const tooth = Math.floor((localY + ry) / 11) % 2 === 0 ? 4 : -3;
  left += tooth * 0.4;
  right -= tooth * 0.25;

  if (right - left < 10) return null;
  return { left, right };
}

function drawLine(
  ctx: CanvasRenderingContext2D,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  alpha: number,
  lineRgb: string,
) {
  ctx.strokeStyle = `rgba(${lineRgb}, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

export function drawOrganicLayer(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  t: number,
  lineRgb = "24, 40, 14",
) {
  const size = Math.min(w * 0.72, h * 0.95);
  const cx = w * 0.5 + Math.sin(t * 0.35) * 5;
  const cy = h * 0.52 + Math.sin(t * 0.5) * 6;
  const rx = size * 0.36;
  const ry = size * 0.48;
  const depthX = -size * 0.14;
  const depthY = -size * 0.05;

  ctx.lineWidth = Math.max(0.9, size / 520);
  ctx.lineCap = "round";

  for (let y = cy - ry; y <= cy + ry; y += 6) {
    const bounds = edgeBounds(y, cx, cy, rx, ry);
    if (!bounds) continue;
    const local = (y - cy) / ry;
    const alpha = 0.55 + (1 - Math.abs(local)) * 0.35;
    drawLine(ctx, bounds.left + depthX, y + depthY, bounds.left, y, alpha, lineRgb);
  }

  for (let y = cy - ry; y <= cy + ry; y += 5) {
    const bounds = edgeBounds(y, cx, cy, rx, ry);
    if (!bounds) continue;
    const local = (y - cy) / ry;
    const shift = local * size * 0.02;
    const alpha = 0.62 + (1 - Math.abs(local)) * 0.28;
    drawLine(
      ctx,
      bounds.left + shift,
      y,
      bounds.right + shift,
      y + Math.sin(local * Math.PI) * 1.2,
      alpha,
      lineRgb,
    );
  }
}
