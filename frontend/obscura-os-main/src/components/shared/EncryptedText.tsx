/**
 * EncryptedText — letter-scramble hero text animation.
 * On mount (and on every `trigger` change) cycles through random glyphs
 * then resolves to the final `children` string.
 *
 * Usage:
 *   <EncryptedText className="text-4xl font-bold text-white">
 *     ObscuraCredit
 *   </EncryptedText>
 */
import { useEffect, useRef, useState } from "react";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";

function scramble(target: string): string {
  return target
    .split("")
    .map((ch) => (ch === " " ? " " : CHARSET[Math.floor(Math.random() * CHARSET.length)]))
    .join("");
}

interface Props {
  children: string;
  className?: string;
  /** Retrigger animation when this value changes */
  trigger?: unknown;
  /** Duration in ms (default 900) */
  duration?: number;
}

export default function EncryptedText({ children, className = "", trigger, duration = 900 }: Props) {
  const [display, setDisplay] = useState(children);
  const raf = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const target = children;
    const startTime = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Reveal characters from left to right based on progress
      const revealedCount = Math.floor(progress * target.length);
      const partial =
        target.slice(0, revealedCount) +
        scramble(target.slice(revealedCount));
      setDisplay(partial);

      if (progress < 1) {
        raf.current = setTimeout(tick, 40);
      } else {
        setDisplay(target);
      }
    };

    raf.current = setTimeout(tick, 0);
    return () => { if (raf.current) clearTimeout(raf.current); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [children, trigger, duration]);

  return <span className={className}>{display}</span>;
}
