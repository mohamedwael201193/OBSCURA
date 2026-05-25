import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "../src/components/vote");

const REPLACEMENTS = [
  [
    "w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25 flex items-center justify-center shrink-0",
    "grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted hairline",
  ],
  ["text-emerald-400", "text-foreground"],
  ["text-emerald-300", "text-[hsl(var(--success))]"],
  ["text-emerald-200", "text-foreground"],
  ["text-cyan-400", "text-foreground"],
  ["text-cyan-300", "text-foreground"],
  ["rounded-lg bg-white/[0.025] border border-white/[0.06]", "rounded-xl hairline bg-card"],
  ["rounded-xl bg-white/[0.025] border border-white/[0.07]", "rounded-xl hairline bg-card"],
  ["rounded-xl border border-white/[0.07] bg-white/[0.025]", "rounded-xl hairline bg-card"],
  ["bg-white/[0.03] border-white/[0.09]", "border-border bg-background"],
  ["bg-white/[0.03] border border-white/10", "border-border bg-background"],
  ["bg-white/[0.04] border border-white/10", "border-border bg-background"],
  [
    "rounded-2xl border border-white/8 bg-white/[0.02] backdrop-blur-xl p-5",
    "rounded-2xl hairline bg-card p-5",
  ],
  [
    "rounded-2xl border border-white/[0.08] bg-white/[0.02] backdrop-blur-xl",
    "rounded-2xl hairline bg-card",
  ],
  ["pay-card p-6 space-y-5", "space-y-5"],
  ["pay-card p-5 space-y-5", "space-y-5"],
  ["pay-card p-5 space-y-4", "space-y-4"],
  [
    "inline-flex items-center gap-2 px-4 py-2 rounded-md text-sm bg-emerald-500/15 border border-emerald-500/40 text-emerald-100 hover:bg-emerald-500/25 disabled:opacity-50",
    "btn-pay btn-pay-emerald disabled:opacity-50",
  ],
  [
    "w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-400 text-black font-display font-semibold",
    "btn-pay btn-pay-emerald w-full py-2.5 font-medium",
  ],
  ["border-t border-white/[0.06]", "border-t border-border"],
  ["h-px bg-white/[0.08]", "h-px bg-border"],
  ["className=\"pay-card", "className=\"space-y-5"],
  ["bg-gradient-to-br from-emerald-500/20 to-emerald-700/10 border border-emerald-500/25", "bg-muted hairline"],
  ["text-emerald-400", "text-foreground"],
  ["hover:bg-white/[0.04]", "hover:bg-muted/50"],
  ["bg-emerald-500/15 text-emerald-300 border border-emerald-500/20", "bg-card text-foreground hairline shadow-sm"],
  ["rounded-lg bg-white/[0.03] border border-white/[0.06]", "rounded-full hairline bg-muted/60 p-1"],
  ["font-editorial text-lg text-forest", "font-display text-lg text-foreground"],
  ["text-[12px] text-forest/", "text-sm text-muted-foreground"],
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
