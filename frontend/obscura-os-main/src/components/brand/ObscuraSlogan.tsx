import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import EncryptedRevealWord from "./EncryptedRevealWord";

type ObscuraSloganProps = {
  className?: string;
  centered?: boolean;
  size?: "hero" | "page";
};

export default function ObscuraSlogan({
  className,
  centered = false,
  size = "hero",
}: ObscuraSloganProps) {
  const sizeClass = size === "hero" ? "obscura-slogan--hero" : "obscura-slogan--page";
  const animateWord = size === "hero";

  return (
    <h1
      className={cn(
        "obscura-slogan",
        sizeClass,
        centered && "mx-auto text-center",
        className,
      )}
    >
      <motion.span
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
        className="obscura-slogan-line1 relative z-[2] block"
      >
        Private money,
      </motion.span>
      <motion.span
        initial={{ opacity: 0, y: 28 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.95, delay: 0.07, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "obscura-slogan-line2 mt-0.5 block sm:mt-1",
          size === "hero" && "obscura-slogan-line2-wrap",
        )}
      >
        {animateWord ? (
          <>
            <EncryptedRevealWord word="computed" />
            <span className="obscura-slogan-word-open"> in the open.</span>
          </>
        ) : (
          <span className="obscura-slogan-line2-text">computed in the open.</span>
        )}
      </motion.span>
    </h1>
  );
}
