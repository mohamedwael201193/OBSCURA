import { useCallback, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";

const LINE = "24, 40, 14";

interface Bounds {
  left: number;
  right: number;
}

function gaussian(value: number, center: number, width: number) {
  const d = (value - center) / width;
  return Math.exp(-d * d);
}

/** Irregular “privacy layer” silhouette — Spade docs wireframe, no $ cutout */
function edgeBounds(y: number, cx: number, cy: number, rx: number, ry: number): Bounds | null {
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
) {
  ctx.strokeStyle = `rgba(${LINE}, ${alpha})`;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawOrganicLayer(ctx: CanvasRenderingContext2D, w: number, h: number, t: number) {
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
    drawLine(ctx, bounds.left + depthX, y + depthY, bounds.left, y, alpha);
  }

  for (let y = cy - ry; y <= cy + ry; y += 5) {
    const bounds = edgeBounds(y, cx, cy, rx, ry);
    if (!bounds) continue;
    const local = (y - cy) / ry;
    const shift = local * size * 0.02;
    const alpha = 0.62 + (1 - Math.abs(local)) * 0.28;
    drawLine(ctx, bounds.left + shift, y, bounds.right + shift, y + Math.sin(local * Math.PI) * 1.2, alpha);
  }
}

function CornerMarks() {
  return (
    <>
      <span className="absolute left-3 top-3 h-3 w-3 border-l border-t border-forest/30" />
      <span className="absolute right-3 top-3 h-3 w-3 border-r border-t border-forest/30" />
      <span className="absolute bottom-3 left-3 h-3 w-3 border-b border-l border-forest/30" />
      <span className="absolute bottom-3 right-3 h-3 w-3 border-b border-r border-forest/30" />
    </>
  );
}

export default function OrganicLayerCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const timeRef = useRef(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const tilt = useTransform(scrollYProgress, [0, 1], [-5, 6]);
  const lift = useTransform(scrollYProgress, [0, 0.5, 1], [18, 0, -14]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w < 2 || h < 2) return;

    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    drawOrganicLayer(ctx, w, h, timeRef.current);
  }, []);

  useEffect(() => {
    const loop = () => {
      timeRef.current += 0.014;
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    const ro = new ResizeObserver(draw);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      cancelAnimationFrame(rafRef.current);
      ro.disconnect();
    };
  }, [draw]);

  return (
    <div ref={containerRef} className="relative aspect-[4/5] w-full max-w-[280px]">
      <div className="relative h-full w-full border border-forest/12 bg-white">
        <CornerMarks />
        <motion.div style={{ rotate: tilt, y: lift }} className="absolute inset-4">
          <img
            src="/images/docs-layer.png"
            alt=""
            aria-hidden
            className="absolute inset-0 h-full w-full object-contain opacity-[0.35] mix-blend-multiply"
          />
          <canvas ref={canvasRef} className="relative h-full w-full" />
        </motion.div>
        <div className="absolute left-4 right-4 top-4 flex justify-between font-mono text-[9px] uppercase tracking-wider text-forest/45">
          <span>&quot;txId&quot;:</span>
          <span>0x8a91…f2c4</span>
        </div>
        <p className="absolute bottom-4 left-4 right-4 font-mono text-[8px] uppercase leading-relaxed tracking-wide text-forest/40">
          FHE-sealed payloads · no plaintext onchain · permit-gated reveal only
        </p>
      </div>
    </div>
  );
}
