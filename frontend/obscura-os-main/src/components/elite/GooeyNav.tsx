/**
 * GooeyNav — unified sticky nav for ALL pages.
 *
 * Two-layer gooey technique:
 *   Layer 1 (abs, SVG filter): emerald active blob + white hover blob — merge/morph effect
 *   Layer 2 (rel, z-10):       crisp text links — fully clickable, no filter distortion
 *
 * Blob position = measured via getBoundingClientRect after mount + ResizeObserver.
 *
 * Usage:
 *   <GooeyNav rightSlot={<WalletConnect />} />                  ← auto-detects active route
 *   <GooeyNav activeKey="pay" rightSlot={<WalletConnect />} />  ← override active
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import ObscuraLogo from "@/components/ObscuraLogo";

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
  { key: "vault", label: "Vault", soon: true },
  { key: "trust", label: "Trust", soon: true },
  { key: "mind",  label: "Mind",  soon: true },
  { key: "docs",  label: "Docs",  href: "/docs" },
];

/** Map pathname → navItem key */
const pathToKey: Record<string, string> = {
  "/pay":  "pay",
  "/vote": "vote",
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
    <header className="sticky top-0 z-50 w-full">
      {/* Offscreen SVG gooey filter */}
      <svg
        aria-hidden="true"
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

      {/* Bar */}
      <div className="relative flex items-center h-14 px-6 lg:px-8
                      backdrop-blur-xl bg-[#06090c]/90 border-b border-white/[0.05]">

        {/* Logo / home link — left */}
        {showLogo && (
          <Link
            to="/"
            className="flex items-center gap-2.5 shrink-0 group"
          >
            <ObscuraLogo size={26} className="group-hover:opacity-80 transition-opacity" />
            <span className="hidden sm:block font-display text-[13px] tracking-[0.3em] text-foreground/90 group-hover:text-foreground transition-colors">
              OBSCURA
            </span>
          </Link>
        )}

        {/* Nav pill wrapper — absolute center of the bar */}
        <div
          ref={wrapRef}
          className="absolute left-1/2 -translate-x-1/2 flex items-center py-1"
        >

          {/* Layer 1: gooey blobs (no pointer events, SVG filter) */}
          <div
            aria-hidden="true"
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
              <span className={[
                "flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium leading-none select-none",
                "transition-colors duration-150",
                isActive
                  ? "text-[#06090c]"
                  : item.soon
                  ? "text-white/25 cursor-not-allowed"
                  : "text-white/55 hover:text-white/90",
              ].join(" ")}>
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
