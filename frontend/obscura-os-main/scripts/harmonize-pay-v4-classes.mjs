/**
 * One-off visual migration: replace legacy dark Pay form class strings.
 * Run: node scripts/harmonize-pay-v4-classes.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../src/components/pay-v4");

const REPLACEMENTS = [
  ['className="pay-card p-6 space-y-5"', 'className="space-y-5"'],
  ['className="pay-card p-5 space-y-5"', 'className="space-y-5"'],
  ['className="pay-card p-5 space-y-4"', 'className="space-y-4"'],
  ['className="pay-card p-6 space-y-4"', 'className="space-y-4"'],
  [
    "w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0",
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline",
  ],
  [
    "w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0",
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline",
  ],
  ["text-emerald-400", "text-foreground"],
  ["text-emerald-300", "text-[hsl(var(--success))]"],
  ["text-emerald-200", "text-foreground"],
  ["text-cyan-400", "text-foreground"],
  ["text-cyan-300", "text-foreground"],
  ["rounded-lg bg-white/[0.025] border border-white/[0.06]", "rounded-xl hairline bg-card"],
  ["rounded-lg bg-white/[0.02] border border-white/[0.05]", "rounded-xl hairline bg-muted/40"],
  ["rounded-lg bg-emerald-500/8 border border-emerald-500/20", "rounded-xl hairline bg-accent/10"],
  ["rounded-lg bg-emerald-500/[0.05] border border-emerald-500/20", "rounded-xl hairline bg-accent/10"],
  ["rounded-lg bg-emerald-950/40 border border-emerald-500/18", "rounded-xl hairline bg-muted/50"],
  ["bg-white/[0.03] border-white/[0.09]", "border-border bg-background"],
  ["border border-white/[0.08] hover:border-white/[0.16] bg-white/[0.015]", "hairline bg-card hover:bg-muted/50"],
  ["border-emerald-500/50 bg-emerald-500/[0.07]", "border-accent/40 bg-accent/15"],
  ["bg-emerald-500/15 border-emerald-500/30", "bg-accent/20 border-accent/35"],
  ["bg-white/[0.04] border-white/[0.08]", "bg-muted hairline"],
  ["hover:bg-white/[0.06]", "hover:bg-muted/60"],
  ["hover:bg-white/[0.03]", "hover:bg-muted/40"],
  ["text-[10px] tracking-[0.18em] uppercase text-muted-foreground/50", "font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"],
  ["text-[10px] tracking-[0.22em] uppercase text-muted-foreground/45", "font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"],
  ["text-[12px] text-muted-foreground/55", "text-sm text-muted-foreground"],
  ["text-[11px] text-muted-foreground/60", "text-sm text-muted-foreground"],
  ["font-display text-sm font-semibold", "font-display text-lg"],
  [
    "w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0",
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline",
  ],
  [
    "w-8 h-8 rounded-lg bg-white/[0.04] border border-white/[0.08] flex items-center justify-center shrink-0",
    "grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-muted hairline",
  ],
  ["rounded-xl bg-white/[0.025] border border-white/[0.07] p-3.5", "rounded-xl hairline bg-card p-3.5"],
  ["rounded-xl border border-white/[0.07] bg-white/[0.025] p-4", "rounded-xl hairline bg-card p-4"],
  ["rounded-md border border-white/[0.06] bg-white/[0.02]", "rounded-xl hairline bg-muted/40"],
  ["p-1.5 rounded-md bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.05]", "p-1.5 rounded-md hairline bg-muted hover:bg-muted/80"],
  ["bg-white/[0.03] border border-white/[0.06]", "hairline bg-card"],
  ["bg-white/[0.02] border border-white/[0.06]", "hairline bg-muted/40"],
  ["border border-white/[0.07] rounded-xl", "hairline rounded-xl"],
  ["border-t border-white/[0.04]", "border-t border-border"],
  ["border-t border-white/[0.05]", "border-t border-border"],
  ["h-px bg-white/[0.08]", "h-px bg-border"],
  [
    "w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-black font-display font-semibold text-[12px]",
    "btn-pay btn-pay-emerald w-full py-2.5 text-sm font-medium",
  ],
  [
    "bg-white/[0.025] border-white/[0.06] text-muted-foreground/65 hover:border-white/[0.12]",
    "hairline bg-card text-muted-foreground hover:bg-muted/50",
  ],
  [
    "bg-white/[0.025] border-white/[0.06] text-muted-foreground/70 hover:border-white/[0.12]",
    "hairline bg-card text-muted-foreground hover:bg-muted/50",
  ],
  [
    "bg-transparent border-white/[0.07] text-muted-foreground/50 hover:text-muted-foreground/80 hover:border-white/[0.12]",
    "bg-transparent hairline text-muted-foreground hover:text-foreground hover:bg-muted/40",
  ],
  [
    "bg-white/[0.03] text-muted-foreground/50 border-white/[0.07] hover:text-muted-foreground hover:border-white/[0.12]",
    "hairline bg-card text-muted-foreground hover:bg-muted/50",
  ],
  ["border border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.05]", "hairline bg-card hover:bg-muted/50"],
  ["w-full py-2 text-[11px] tracking-[0.15em] uppercase text-muted-foreground/40 border border-white/[0.07]", "w-full py-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground hairline"],
  ["flex items-start gap-2 px-3.5 py-3 rounded-xl bg-white/[0.02] border border-white/[0.06]", "flex items-start gap-2 rounded-xl hairline bg-muted/40 px-3.5 py-3"],
  ["rounded-xl bg-white/[0.025] border border-white/[0.07] p-4", "rounded-xl hairline bg-card p-4"],
  ["flex justify-between items-center py-2 px-3 rounded-lg bg-white/[0.025] border border-white/[0.07]", "flex justify-between items-center rounded-lg hairline bg-muted/40 py-2 px-3"],
  ["flex items-start gap-3 p-3 rounded-md border border-white/[0.06] bg-white/[0.02]", "flex items-start gap-3 rounded-xl hairline bg-muted/40 p-3"],
  ["mt-4 p-3 rounded-md border border-white/[0.06] bg-white/[0.02]", "mt-4 rounded-xl hairline bg-muted/40 p-3"],
];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".tsx")) {
      let src = fs.readFileSync(p, "utf8");
      let changed = false;
      for (const [from, to] of REPLACEMENTS) {
        if (src.includes(from)) {
          src = src.split(from).join(to);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(p, src);
        console.log("updated", path.relative(root, p));
      }
    }
  }
}

walk(root);
console.log("done");
