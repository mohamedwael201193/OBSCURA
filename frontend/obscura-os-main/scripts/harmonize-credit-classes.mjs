import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../src/components/credit");

const REPLACEMENTS = [
  [
    "w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0",
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline",
  ],
  ["text-emerald-400", "text-foreground"],
  ["text-emerald-300", "text-[hsl(var(--success))]"],
  ["text-emerald-200", "text-foreground"],
  ["text-emerald-100", "text-foreground"],
  ["rounded-lg bg-white/[0.025] border border-white/[0.06]", "rounded-xl hairline bg-card"],
  ["rounded-xl border border-white/[0.06] bg-white/[0.025] p-3", "rounded-xl hairline bg-card p-3"],
  ["bg-white/[0.03] border-white/[0.09]", "border-border bg-background"],
  ["bg-white/[0.03] border border-white/10", "border-border bg-background"],
  ["bg-white/[0.04] border border-white/10", "border-border bg-background"],
  [
    "flex items-center gap-2 px-3 py-2 rounded-lg bg-black/20 border border-white/[0.05]",
    "flex items-center gap-2 rounded-lg hairline bg-muted/50 px-3 py-2",
  ],
  [
    "rounded-2xl border border-white/8 bg-white/[0.02] backdrop-blur-xl p-5",
    "rounded-2xl hairline bg-card p-5",
  ],
  [
    "p-4 rounded-2xl border border-amber-500/15 bg-white/[0.02] backdrop-blur-xl",
    "rounded-2xl hairline bg-card p-4 border-amber-500/20",
  ],
  [
    "rounded-xl border border-white/10 bg-white/[0.02] p-4",
    "rounded-xl hairline bg-card p-4",
  ],
  ["w-full h-2 rounded-full bg-white/[0.06]", "w-full h-2 rounded-full bg-muted"],
  [
    "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.12]",
    "hairline bg-card hover:bg-muted/50",
  ],
  [
    "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50",
    "btn-pay btn-pay-emerald disabled:opacity-50",
  ],
  [
    "self-start inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50",
    "btn-pay btn-pay-emerald disabled:opacity-50",
  ],
  [
    "mt-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50",
    "btn-pay btn-pay-emerald disabled:opacity-50",
  ],
  [
    "w-full py-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 disabled:opacity-50",
    "btn-pay btn-pay-emerald w-full py-3 disabled:opacity-50",
  ],
  [
    "border-emerald-500/40 bg-emerald-500/10 text-emerald-200",
    "border-accent/40 bg-accent/15 text-foreground",
  ],
  [
    "border-white/10 bg-white/[0.03] text-white/60",
    "hairline bg-card text-muted-foreground",
  ],
  ["px-3 py-2 grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 text-[10px] tracking-[0.15em] uppercase text-white/45 font-mono bg-white/[0.02]",
   "px-3 py-2 grid grid-cols-[1.5fr_1fr_1fr_1fr] gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground bg-muted/40"],
  ["className=\"pay-card", "className=\"space-y-5"],
  ["rounded-2xl border border-white/[0.08] bg-white/[0.02]", "rounded-2xl hairline bg-card"],
  ["text-[10px] tracking-[0.15em] uppercase text-white/", "font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground"],
  ["hover:bg-white/[0.04]", "hover:bg-muted/50"],
  ["bg-violet-950/", "bg-muted/"],
  ["bg-emerald-950/", "bg-accent/10"],
];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".tsx")) {
      let src = fs.readFileSync(p, "utf8");
      let changed = false;
      for (const [from, to] of REPLACEMENTS) {
        if (from !== to && src.includes(from)) {
          src = src.split(from).join(to);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(p, src);
        console.log("updated", name);
      }
    }
  }
}

walk(root);
console.log("done");
