import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

/**
 * Spotlight cursor — premium dark luxury vibe.
 * Two layers: soft outer glow (lazy spring) + tight inner dot (fast spring).
 * Hides on touch devices automatically (no hover capability).
 */
export const SpotlightCursor = () => {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);

  const softX = useSpring(x, { stiffness: 120, damping: 18, mass: 0.6 });
  const softY = useSpring(y, { stiffness: 120, damping: 18, mass: 0.6 });
  const dotX = useSpring(x, { stiffness: 600, damping: 28 });
  const dotY = useSpring(y, { stiffness: 600, damping: 28 });

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Only enable on devices with fine pointers (mouse / trackpad)
    const mq = window.matchMedia("(hover: hover) and (pointer: fine)");
    if (!mq.matches) return;
    setEnabled(true);

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const enter = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest("button, a, [role=button], input, textarea, [data-cursor-hover]")) {
        setHovering(true);
      }
    };
    const leave = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.closest("button, a, [role=button], input, textarea, [data-cursor-hover]")) {
        setHovering(false);
      }
    };

    window.addEventListener("mousemove", move);
    document.addEventListener("mouseover", enter, true);
    document.addEventListener("mouseout", leave, true);
    return () => {
      window.removeEventListener("mousemove", move);
      document.removeEventListener("mouseover", enter, true);
      document.removeEventListener("mouseout", leave, true);
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      <motion.div
        aria-hidden
        className="fixed top-0 left-0 pointer-events-none z-[9998] rounded-full"
        style={{
          x: softX,
          y: softY,
          translateX: "-50%",
          translateY: "-50%",
          width: hovering ? 70 : 40,
          height: hovering ? 70 : 40,
          background: hovering
            ? "radial-gradient(circle, rgba(34,197,94,0.25) 0%, rgba(6,182,212,0.15) 50%, transparent 75%)"
            : "radial-gradient(circle, rgba(34,197,94,0.18) 0%, transparent 70%)",
          filter: "blur(2px)",
          transition: "width 0.25s ease, height 0.25s ease, background 0.25s ease",
        }}
      />
      <motion.div
        aria-hidden
        className="fixed top-0 left-0 pointer-events-none z-[9999] rounded-full"
        style={{
          x: dotX,
          y: dotY,
          translateX: "-50%",
          translateY: "-50%",
          width: hovering ? 10 : 6,
          height: hovering ? 10 : 6,
          background: hovering ? "rgb(34,197,94)" : "rgba(255,255,255,0.85)",
          boxShadow: hovering ? "0 0 14px rgba(34,197,94,0.8)" : "0 0 8px rgba(255,255,255,0.4)",
          transition: "width 0.2s ease, height 0.2s ease, background 0.2s ease",
        }}
      />
    </>
  );
};

export default SpotlightCursor;
