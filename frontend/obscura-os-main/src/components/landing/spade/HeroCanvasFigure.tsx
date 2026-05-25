import { useCallback, useEffect, useRef } from "react";
import { motion } from "framer-motion";

const LINE = "24, 40, 14";

interface Bounds {
  left: number;
  right: number;
}

interface Segment {
  x1: number;
  x2: number;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function gaussian(value: number, center: number, width: number) {
  const d = (value - center) / width;
  return Math.exp(-d * d);
}

function edgeBounds(y: number, cx: number, cy: number, rx: number, ry: number): Bounds | null {
  const ny = (y - cy) / ry;
  if (Math.abs(ny) > 1) return null;

  const width = rx * Math.sqrt(1 - ny * ny);
  let left = cx - width;
  let right = cx + width;
  const localY = y - cy;

  // Spade's hero coin has irregular bites rather than a clean ellipse.
  right -= gaussian(localY, 34, 40) * 46;
  right -= gaussian(localY, 135, 34) * 35;
  left += gaussian(localY, -132, 28) * 34;
  left += gaussian(localY, 150, 28) * 42;

  // Subtle stepped gear teeth around the visible outer rim.
  const tooth = Math.floor((localY + ry) / 12) % 2 === 0 ? 5 : -2;
  left += tooth * clamp(Math.abs(ny), 0.2, 1);
  right -= tooth * 0.35 * clamp(Math.abs(ny), 0.2, 1);

  if (right - left < 12) return null;
  return { left, right };
}

function inDollarMask(x: number, y: number, cx: number, cy: number, scale: number) {
  const dx = (x - cx) / scale;
  const dy = (y - cy) / (scale * 1.5);
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);

  // Vertical stroke.
  if (ax < 0.12 && ay < 0.82) return true;

  // Center bar.
  if (ay < 0.07 && ax > 0.07 && ax < 0.48) return true;

  // Upper S bowl.
  const upperLeft = Math.hypot(dx + 0.28, dy + 0.34);
  const upperRight = Math.hypot(dx - 0.28, dy + 0.18);
  if (dy < 0.1 && dy > -0.66) {
    if (upperLeft > 0.28 && upperLeft < 0.46 && dx < 0.05) return true;
    if (upperRight > 0.24 && upperRight < 0.42 && dx > -0.08) return true;
  }

  // Lower S bowl.
  const lowerLeft = Math.hypot(dx + 0.28, dy - 0.18);
  const lowerRight = Math.hypot(dx - 0.28, dy - 0.34);
  if (dy > -0.1 && dy < 0.68) {
    if (lowerLeft > 0.24 && lowerLeft < 0.42 && dx < 0.08) return true;
    if (lowerRight > 0.28 && lowerRight < 0.46 && dx > -0.05) return true;
  }

  return false;
}

function splitAroundDollar(
  x1: number,
  x2: number,
  y: number,
  cx: number,
  cy: number,
  dollarScale: number,
): Segment[] {
  const segments: Segment[] = [];
  const samples = 160;
  let open: number | null = null;

  for (let i = 0; i <= samples; i++) {
    const x = x1 + ((x2 - x1) * i) / samples;
    const blocked = inDollarMask(x, y, cx, cy, dollarScale);

    if (!blocked && open === null) open = x;
    if ((blocked || i === samples) && open !== null) {
      const end = blocked ? x : x2;
      if (end - open > 3) segments.push({ x1: open, x2: end });
      open = null;
    }
  }

  return segments;
}

function drawLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, alpha: number) {
  ctx.strokeStyle = `rgba(${LINE}, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawWireCoin(ctx: CanvasRenderingContext2D, w: number, h: number, t: number, mx: number, my: number) {
  const size = Math.min(w * 0.63, h * 1.22);
  const floatY = Math.sin(t * 0.55) * 8;
  const floatX = Math.sin(t * 0.28) * 4;
  const cx = w * 0.54 + mx * 14 + floatX;
  const cy = h * 0.5 + my * 9 + floatY;
  const rx = size * 0.33;
  const ry = size * 0.45;
  const depthX = -size * 0.18;
  const depthY = -size * 0.06;
  const dollarScale = size * 0.21;

  ctx.lineWidth = Math.max(1, size / 480);
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  // Left-side depth ribs: these are what make the reference coin read as thick.
  for (let y = cy - ry; y <= cy + ry; y += 6) {
    const bounds = edgeBounds(y, cx, cy, rx, ry);
    if (!bounds) continue;
    const local = (y - cy) / ry;
    const visible = local > -0.92 && local < 0.92;
    if (!visible) continue;

    const sideAlpha = 0.68 + (1 - Math.abs(local)) * 0.2;
    const sideStartX = bounds.left + depthX;
    const sideStartY = y + depthY;
    drawLine(ctx, sideStartX, sideStartY, bounds.left, y, sideAlpha);
  }

  // Back edge silhouettes.
  for (let y = cy - ry; y <= cy + ry; y += 10) {
    const bounds = edgeBounds(y, cx, cy, rx, ry);
    if (!bounds) continue;
    const width = Math.min(42, (bounds.right - bounds.left) * 0.28);
    drawLine(ctx, bounds.left + depthX, y + depthY, bounds.left + depthX + width, y + depthY, 0.55);
  }

  // Front face scanlines, split where the $ cutout passes through.
  for (let y = cy - ry; y <= cy + ry; y += 5) {
    const bounds = edgeBounds(y, cx, cy, rx, ry);
    if (!bounds) continue;

    const local = (y - cy) / ry;
    const perspectiveShift = local * size * 0.025;
    const left = bounds.left + perspectiveShift;
    const right = bounds.right + perspectiveShift;
    const alpha = 0.66 + (1 - Math.abs(local)) * 0.24;
    const segments = splitAroundDollar(left, right, y, cx + size * 0.02, cy + size * 0.02, dollarScale);

    for (const segment of segments) {
      drawLine(ctx, segment.x1, y, segment.x2, y + Math.sin(local * Math.PI) * 1.5, alpha);
    }
  }

  // Top rim notches, matching the stepped crown visible in the reference.
  for (let i = 0; i < 9; i++) {
    const y = cy - ry + 18 + i * 8;
    const bounds = edgeBounds(y, cx, cy, rx, ry);
    if (!bounds) continue;
    const x = bounds.left + 16 + i * 10;
    drawLine(ctx, x + depthX * 0.6, y + depthY * 0.75, x + 34, y + 4, 0.62);
  }

  // Knock out a clean dollar glyph so the figure reads like Spade's hero coin.
  ctx.save();
  ctx.font = `700 ${size * 0.54}px Georgia, serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#F7F9F2";
  ctx.lineWidth = Math.max(1.2, size * 0.008);
  ctx.strokeStyle = `rgba(${LINE}, 0.82)`;
  ctx.fillText("$", cx + size * 0.03, cy + size * 0.04);
  ctx.strokeText("$", cx + size * 0.03, cy + size * 0.04);
  ctx.restore();
}

export default function HeroCanvasFigure() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });
  const rafRef = useRef(0);
  const timeRef = useRef(0);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    drawWireCoin(ctx, w, h, timeRef.current, mouseRef.current.x, mouseRef.current.y);
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onMove = (e: MouseEvent) => {
      const rect = container.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) / rect.width - 0.5,
        y: (e.clientY - rect.top) / rect.height - 0.5,
      };
    };

    container.addEventListener("mousemove", onMove);

    const loop = () => {
      timeRef.current += 0.016;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    const ro = new ResizeObserver(draw);
    ro.observe(container);

    return () => {
      container.removeEventListener("mousemove", onMove);
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [draw]);

  return (
    <motion.div
      ref={containerRef}
      className="relative mx-auto aspect-[900/435] w-full max-w-[900px]"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: [0, -10, 0] }}
      transition={{
        opacity: { duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] },
        y: { duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 },
      }}
    >
      <canvas ref={canvasRef} className="h-full w-full" style={{ verticalAlign: "top" }} />
    </motion.div>
  );
}
