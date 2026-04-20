import { useState } from "react";
import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import ObscuraLogo from "./ObscuraLogo";
import WalletConnect from "./wallet/WalletConnect";

const navItems = [
  { label: "Pay", path: "/pay", active: true },
  { label: "Vote", path: "/vote", active: true },
  { label: "Vault", path: undefined, active: false, soon: true },
  { label: "Trust", path: undefined, active: false, soon: true },
  { label: "Mind", path: undefined, active: false, soon: true },
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
          const Wrapper = item.path ? Link : "button" as any;

          return (
            <Wrapper
              key={item.label}
              to={item.path}
              onMouseEnter={() => setHovered(item.label)}
              onMouseLeave={() => setHovered(null)}
              className={`relative text-sm tracking-wide transition-colors duration-300 flex items-center ${
                isCurrentPage
                  ? "text-primary text-glow-sm"
                  : (item as any).soon
                  ? "text-muted-foreground/30 cursor-default"
                  : item.active && !isCurrentPage
                  ? "text-primary/70 hover:text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {item.label}
              {(item as any).soon && (
                <span className="ml-1 text-[9px] tracking-wider uppercase text-muted-foreground/40 bg-white/[0.04] px-1.5 py-0.5 rounded">soon</span>
              )}
              {hovered === item.label && !((item as any).soon) && (
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
