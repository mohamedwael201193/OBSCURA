import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  // Safelist dynamic classes used by elite/* components (accent={emerald|cyan|violet}).
  safelist: [
    // Text colors
    "text-emerald-400", "text-cyan-400", "text-violet-400",
    // Backgrounds (10-15-20 alpha)
    "bg-emerald-500/5", "bg-emerald-500/10", "bg-emerald-500/15", "bg-emerald-500/20",
    "bg-cyan-500/5", "bg-cyan-500/10", "bg-cyan-500/15", "bg-cyan-500/20",
    "bg-violet-500/5", "bg-violet-500/10", "bg-violet-500/15", "bg-violet-500/20",
    // Borders
    "border-emerald-500/20", "border-emerald-500/30", "border-emerald-500/40",
    "border-cyan-500/20", "border-cyan-500/30", "border-cyan-500/40",
    "border-violet-500/20", "border-violet-500/30", "border-violet-500/40",
    // Hover borders
    "hover:border-emerald-500/30", "hover:border-cyan-500/30", "hover:border-violet-500/30",
    // Sidebar dot
    "bg-emerald-400", "bg-cyan-400", "bg-violet-400",
    // Gradient via classes used in DashboardShell
    "via-emerald-500/60", "via-cyan-500/60", "via-violet-500/60",
    // Glow shadows
    "shadow-[0_0_20px_rgba(34,197,94,0.25)]",
    "shadow-[0_0_20px_rgba(6,182,212,0.25)]",
    "shadow-[0_0_20px_rgba(139,92,246,0.25)]",
  ],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
        body: ['"DM Sans"', 'sans-serif'],
      },
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        glow: {
          green: "hsl(var(--glow-green))",
        },
        terminal: {
          green: "hsl(var(--terminal-green))",
        },
        surface: {
          glass: "hsl(var(--surface-glass))",
        },
        cyan: {
          accent: "hsl(var(--accent-cyan))",
        },
        amber: {
          accent: "hsl(var(--accent-amber))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "fade-in": "fade-in 0.3s ease-out",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
