import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const PLACEHOLDER = "·";

function veilSlice(text: string) {
  return text
    .split("")
    .map(() => (Math.random() > 0.4 ? PLACEHOLDER : "•"))
    .join("");
}

type EncryptedRevealWordProps = {
  word: string;
  className?: string;
};

/** Slow, light reveal — one letter at a time from dotted veil to final word */
export default function EncryptedRevealWord({
  word,
  className,
}: EncryptedRevealWordProps) {
  const [display, setDisplay] = useState(() => veilSlice(word));
  const [sealing, setSealing] = useState(true);

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setDisplay(word);
      setSealing(false);
      return;
    }

    setSealing(true);
    setDisplay(veilSlice(word));
    let revealed = 0;
    let tickId: ReturnType<typeof window.setInterval> | undefined;
    const letterMs = 200;
    const startDelayMs = 280;

    const startId = window.setTimeout(() => {
      tickId = window.setInterval(() => {
        revealed += 1;
        if (revealed >= word.length) {
          setDisplay(word);
          setSealing(false);
          if (tickId) window.clearInterval(tickId);
          return;
        }

        setDisplay(
          word.slice(0, revealed) + veilSlice(word.slice(revealed)),
        );
      }, letterMs);
    }, startDelayMs);

    return () => {
      window.clearTimeout(startId);
      if (tickId) window.clearInterval(tickId);
    };
  }, [word]);

  return (
    <span
      className={cn(
        "obscura-slogan-word-computed",
        sealing && "obscura-slogan-word-computed--sealing",
        className,
      )}
      aria-label={word}
    >
      {display}
    </span>
  );
}
