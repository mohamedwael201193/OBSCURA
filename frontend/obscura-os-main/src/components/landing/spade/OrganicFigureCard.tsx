import { useCallback, useEffect, useRef } from "react";
import { motion, useScroll, useTransform } from "framer-motion";
import { cn } from "@/lib/utils";
import { drawOrganicLayer } from "./organicLayerDraw";

type OrganicFigureVariant = "light" | "reference";

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

export default function OrganicFigureCard({
  variant = "light",
  className,
}: {
  variant?: OrganicFigureVariant;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const timeRef = useRef(0);
  const isReference = variant === "reference";

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });
  const tilt = useTransform(scrollYProgress, [0, 1], [-4, 5]);
  const lift = useTransform(scrollYProgress, [0, 0.5, 1], [14, 0, -12]);

  const draw = useCallback(() => {
    if (isReference) return;
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
    drawOrganicLayer(ctx, w, h, timeRef.current, "24, 40, 14");
  }, [isReference]);

  useEffect(() => {
    if (isReference) return;
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
  }, [draw, isReference]);

  const metaTop =
    variant === "reference" ? (
      <div className="absolute left-2 right-2 top-2 z-20 flex justify-between gap-3 font-mono text-[9px] uppercase tracking-[0.14em] text-forest/50 sm:left-3 sm:right-3 sm:top-3">
        <span className="shrink-0">&quot;TRANSACTION ID&quot;:</span>
        <span className="max-w-[48%] truncate blur-[3px] select-none text-forest/70">0x8a91f2c4…a0367</span>
      </div>
    ) : (
      <div className="absolute left-4 right-4 top-4 z-20 flex justify-between font-mono text-[9px] uppercase tracking-wider text-forest/45">
        <span>&quot;txId&quot;:</span>
        <span>0x8a91…f2c4</span>
      </div>
    );

  const metaBottom =
    variant === "reference" ? (
      <p className="absolute bottom-2 left-2 right-2 z-20 text-left font-mono text-[7.5px] uppercase leading-[1.5] tracking-[0.1em] text-forest/38 sm:bottom-3 sm:left-3 sm:right-3 sm:text-[8px]">
        Obscura is audited for enterprise-grade privacy — designed for confidential finance —
        with no plaintext balances on public chains.
      </p>
    ) : (
      <p className="absolute bottom-4 left-4 right-4 z-20 font-mono text-[8px] uppercase leading-relaxed tracking-wide text-forest/40">
        FHE-sealed payloads · no plaintext onchain · permit-gated reveal only
      </p>
    );

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative mx-auto w-full shrink-0",
        isReference ? "w-[min(100%,420px)] max-w-[420px]" : "max-w-[280px]",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full overflow-hidden",
          isReference
            ? "aspect-[3/4] min-h-[340px] border border-forest/12 bg-white sm:min-h-[360px]"
            : "aspect-[4/5] border border-forest/12 bg-white",
        )}
      >
        <CornerMarks />
        {metaTop}
        <motion.div
          style={{ rotate: tilt, y: lift }}
          className={cn(
            "absolute z-10 flex items-center justify-center",
            isReference
              ? "inset-x-0 top-9 bottom-14 sm:top-10 sm:bottom-16"
              : "inset-x-4 top-14 bottom-[5.5rem]",
          )}
        >
          {isReference ? (
            <div className="organic-figure-shield-stage">
              <div
                role="img"
                aria-label="Obscura privacy shield wireframe"
                className="organic-figure-shield-mask"
              />
            </div>
          ) : (
            <>
              <img
                src="/images/docs-layer.png"
                alt=""
                aria-hidden
                className="absolute inset-0 h-full w-full object-contain opacity-[0.35] mix-blend-multiply"
              />
              <canvas ref={canvasRef} className="relative h-full w-full" />
            </>
          )}
        </motion.div>
        {metaBottom}
      </div>
    </div>
  );
}
