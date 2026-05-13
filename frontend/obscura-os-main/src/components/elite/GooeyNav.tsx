/**
 * GooeyNav — unified sticky nav for ALL pages.
 *
 * Two-layer gooey technique:
 *   Layer 1 (abs, SVG filter): emerald active blob + white hover blob — merge/morph effect
 *   Layer 2 (rel, z-10):       crisp text links — fully clickable, no filter distortion
 *
 * Glass behaviour:
 *   scrollY = 0       → transparent, no blur
 *   scrollY > 24      → frosted glass: backdrop-blur-2xl, bg-[#06090c]/75, emerald accent line
 *
 * Blob position = measured via getBoundingClientRect after mount + ResizeObserver.
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import ObscuraLogo from "@/components/ObscuraLogo";
import { cn } from "@/lib/utils";

// ── Types ──────────────────────────────────────────────────────────────────

export type NavItem = {
  key: string;
  label: string;
  href?: string;
  soon?: boolean;
};

interface GooeyNavProps {
  /** Override the auto-detected active item */
  activeKey?: string;
  onSelect?: (key: string) => void;
  rightSlot?: React.ReactNode;
  /** Set false to hide logo (e.g. dashboard pages where sidebar already shows it) */
  showLogo?: boolean;
}

interface BlobRect { left: number; width: number }

// ── Nav items (single source of truth) ────────────────────────────────────

export const NAV_ITEMS: NavItem[] = [
  { key: "pay",   label: "Pay",   href: "/pay" },
  { key: "vote",  label: "Vote",  href: "/vote" },
  { key: "credit",label: "Credit",href: "/credit" },
  { key: "vault", label: "Vault", soon: true },
  { key: "trust", label: "Trust", soon: true },
  { key: "mind",  label: "Mind",  soon: true },
  { key: "docs",  label: "Docs",  href: "/docs" },
];

/** Map pathname → navItem key */
const pathToKey: Record<string, string> = {
  "/pay":  "pay",
  "/vote": "vote",
  "/credit": "credit",
  "/docs": "docs",
};

// ── Spring ─────────────────────────────────────────────────────────────────

const SPRING = { type: "spring" as const, stiffness: 440, damping: 38, mass: 0.75 };

// ── Component ──────────────────────────────────────────────────────────────

export default function GooeyNav({ activeKey: activeKeyProp, onSelect, rightSlot, showLogo = true }: GooeyNavProps) {
  const location  = useLocation();
  const activeKey = activeKeyProp ?? pathToKey[location.pathname] ?? "";

  const wrapRef  = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  const [activeRect, setActiveRect] = useState<BlobRect | null>(null);
  const [hoverKey,   setHoverKey]   = useState<string | null>(null);
  const [hoverRect,  setHoverRect]  = useState<BlobRect | null>(null);
  const [scrolled,   setScrolled]   = useState(false);

  // Track scroll for glass effect
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Measure an item relative to the wrapper div
  const measure = (key: string): BlobRect | null => {
    const wrap = wrapRef.current;
    const el   = itemRefs.current.get(key);
    if (!wrap || !el) return null;
    const wR = wrap.getBoundingClientRect();
    const eR = el.getBoundingClientRect();
    return { left: eR.left - wR.left, width: eR.width };
  };

  // Sync active blob on route / mount — always update (even to null) so stale highlight clears
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      setActiveRect(measure(activeKey));
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  // Re-measure on resize
  useEffect(() => {
    const obs = new ResizeObserver(() => {
      const r = measure(activeKey);
      if (r) setActiveRect(r);
    });
    if (wrapRef.current) obs.observe(wrapRef.current);
    return () => obs.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey]);

  const handleEnter = (key: string) => {
    if (NAV_ITEMS.find((i) => i.key === key)?.soon) return;
    const r = measure(key);
    if (r) { setHoverKey(key); setHoverRect(r); }
  };
  const handleLeave = () => { setHoverKey(null); setHoverRect(null); };

  return (
    <header
      className={cn(
        "nav-glass sticky top-0 z-50 w-full",
        scrolled
          ? "scrolled bg-[#06090c]/75 shadow-[0_8px_40px_rgba(0,0,0,0.55)]"
          : "bg-[#06090c]/0"
      )}
    >
      {/* Offscreen SVG gooey filter */}
      <svg
        aria-hidden={true}
        focusable="false"
        style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      >
        <defs>
          <filter id="gooey-nav" x="-30%" y="-100%" width="160%" height="300%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 22 -10"
            />
          </filter>
        </defs>
      </svg>

      {/* Noise texture overlay — adds depth/grain to glass */}
      <div
        aria-hidden={true}
        className="absolute inset-0 pointer-events-none transition-opacity duration-500"
        style={{
          opacity: scrolled ? 0.025 : 0,
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='n' x='0' y='0'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: "repeat",
          backgroundSize: "200px 200px",
        }}
      />

      {/* Top-edge gradient shimmer — tint from emerald on scroll */}
      <motion.div
        aria-hidden={true}
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        animate={{
          opacity: scrolled ? 1 : 0,
          background: "linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.12) 15%, rgba(52,211,153,0.45) 50%, rgba(52,211,153,0.12) 85%, transparent 100%)",
        }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />

      {/* Bottom border — dim line at top, emerald glow line when scrolled */}
      <motion.div
        aria-hidden={true}
        className="absolute inset-x-0 bottom-0 pointer-events-none"
        animate={{
          opacity: scrolled ? 1 : 0.4,
          height: scrolled ? "1px" : "1px",
          background: scrolled
            ? "linear-gradient(90deg, transparent 0%, rgba(52,211,153,0.08) 10%, rgba(52,211,153,0.4) 50%, rgba(52,211,153,0.08) 90%, transparent 100%)"
            : "rgba(255,255,255,0.04)",
        }}
        transition={{ duration: 0.6, ease: "easeInOut" }}
      />

      {/* Ambient green glow beneath header — visible only on scroll */}
      <motion.div
        aria-hidden={true}
        className="absolute inset-x-0 -bottom-6 h-6 pointer-events-none"
        animate={{ opacity: scrolled ? 1 : 0 }}
        transition={{ duration: 0.7 }}
        style={{
          background: "radial-gradient(ellipse 60% 100% at 50% 0%, rgba(52,211,153,0.06) 0%, transparent 100%)",
        }}
      />

      {/* Bar */}
      <div className="relative flex items-center h-14 px-6 lg:px-8">

        {/* Logo / home link — left */}
        {showLogo && (
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <div className="relative flex items-center justify-center">
              {/* Pulse ring — only active when scrolled */}
              <motion.span
                aria-hidden={true}
                className="absolute rounded-full border border-emerald-400/30"
                style={{ width: 36, height: 36 }}
                animate={scrolled
                  ? { scale: [1, 1.45, 1], opacity: [0.35, 0, 0.35] }
                  : { scale: 1, opacity: 0 }
                }
                transition={{ duration: 2.8, repeat: Infinity, ease: "easeOut", repeatDelay: 0.5 }}
              />
              <ObscuraLogo size={26} className="relative z-10 group-hover:opacity-80 transition-opacity" />
            </div>
            <span className="hidden sm:block font-display text-[13px] tracking-[0.3em] text-foreground/90 group-hover:text-foreground transition-colors">
              OBSCURA
            </span>
          </Link>
        )}

        {/* Nav pill wrapper — absolute center of the bar */}
        <div
          ref={wrapRef}
          className={cn(
            "absolute left-1/2 -translate-x-1/2 flex items-center py-1",
            "transition-all duration-500 ease-out",
            scrolled && [
              "rounded-full",
              "bg-white/[0.035]",
              "border border-white/[0.09]",
              "shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_4px_24px_rgba(0,0,0,0.35),0_0_0_1px_rgba(52,211,153,0.05)]",
              "px-1",
            ],
          )}
        >

          {/* Layer 1: gooey blobs (no pointer events, SVG filter) */}
          <div
            aria-hidden={true}
            className="absolute inset-0 pointer-events-none overflow-visible"
            style={{ filter: "url(#gooey-nav)" }}
          >
            {activeRect && (
              <motion.div
                key="active-blob"
                className="absolute rounded-full bg-emerald-400"
                animate={{ left: activeRect.left, width: activeRect.width }}
                initial={false}
                transition={SPRING}
                style={{ top: 3, bottom: 3 }}
              />
            )}
            <AnimatePresence>
              {hoverRect && hoverKey !== activeKey && (
                <motion.div
                  key="hover-blob"
                  className="absolute rounded-full bg-white/[0.08]"
                  initial={{ opacity: 0, left: hoverRect.left, width: hoverRect.width }}
                  animate={{ opacity: 1, left: hoverRect.left, width: hoverRect.width }}
                  exit={{ opacity: 0 }}
                  transition={{ ...SPRING, opacity: { duration: 0.15 } }}
                  style={{ top: 3, bottom: 3 }}
                />
              )}
            </AnimatePresence>
          </div>

          {/* Layer 2: text labels (z-10, no filter — stays crisp & clickable) */}
          {NAV_ITEMS.map((item) => {
            const isActive = item.key === activeKey;
            const labelContent = (
              <span className={cn(
                "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium leading-none select-none",
                "transition-colors duration-150",
                isActive
                  ? "text-[#06090c]"
                  : item.soon
                  ? "text-white/25 cursor-not-allowed"
                  : "text-white/55 hover:text-white/90",
              )}>
                {item.label}
                {item.soon && (
                  <span className="text-[8px] tracking-[0.2em] uppercase font-mono opacity-60">
                    soon
                  </span>
                )}
              </span>
            );

            return (
              <div
                key={item.key}
                ref={(el) => {
                  if (el) itemRefs.current.set(item.key, el);
                  else    itemRefs.current.delete(item.key);
                }}
                className="relative z-10"
                onMouseEnter={() => handleEnter(item.key)}
                onMouseLeave={handleLeave}
              >
                {item.soon ? (
                  <span>{labelContent}</span>
                ) : item.href ? (
                  <Link to={item.href} onClick={() => onSelect?.(item.key)}>
                    {labelContent}
                  </Link>
                ) : (
                  <button type="button" onClick={() => onSelect?.(item.key)}>
                    {labelContent}
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* Right slot — pinned to far right */}
        {rightSlot && (
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {rightSlot}
          </div>
        )}
      </div>
    </header>
  );
}
