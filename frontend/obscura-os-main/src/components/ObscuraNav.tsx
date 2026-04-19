import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Lock } from "lucide-react";
import ObscuraLogo from "./ObscuraLogo";
import WalletConnect from "./wallet/WalletConnect";

const navItems = [
  { label: "Pay", path: "/pay", active: true },
  { label: "Vote", path: "/vote", active: true },
  { label: "Vault", locked: true },
  { label: "Trust", locked: true },
  { label: "Mind", locked: true },
  { label: "Privacy", path: "/privacy" },
  { label: "Docs", path: "/docs" },
];

const ObscuraNav = () => {
  const [hovered, setHovered] = useState<string | null>(null);
  const location = useLocation();

  return (
    <motion.nav
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-8 py-4 border-b border-border/50 backdrop-blur-sm bg-background/40"
    >
      <Link to="/" className="flex items-center gap-3 group">
        <ObscuraLogo size={28} className="group-hover:opacity-80 transition-opacity" />
        <span className="font-display text-base tracking-[0.3em] text-foreground">
          OBSCURA
        </span>
      </Link>

      <div className="hidden md:flex items-center gap-8">
        {navItems.map((item) => {
          const isCurrentPage = item.path && location.pathname === item.path;
          const Wrapper = item.path && !item.locked ? Link : "button" as any;

          return (
            <Wrapper
              key={item.label}
              to={item.path}
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}
              className={`relative text-xs tracking-[0.15em] uppercase transition-colors duration-300 font-mono ${
                isCurrentPage
                  ? "text-primary text-glow-sm"
                  : item.active && !isCurrentPage
                  ? "text-primary/70"
                  : item.locked
                  ? "text-muted-foreground/40 cursor-not-allowed"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.locked && <Lock className="w-2.5 h-2.5 inline mr-1 opacity-40" />}
              {item.label}
              {hovered === item.label && !item.locked && (
                <motion.div
                  layoutId="nav-underline"
                  className="absolute -bottom-1 left-0 right-0 h-px bg-primary"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </Wrapper>
          );
        })}
      </div>

      <WalletConnect />
    </motion.nav>
  );
};

export default ObscuraNav;
