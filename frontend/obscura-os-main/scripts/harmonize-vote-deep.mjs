import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/components/vote");

const REPLACEMENTS = [
  ["text-white/", "text-muted-foreground/"],
  ["text-white ", "text-foreground "],
  ["text-white\"", "text-foreground\""],
  ["text-white'", "text-foreground'"],
  ["text-white\n", "text-foreground\n"],
  ["border-white/", "border-border/"],
  ["bg-white/[0.025]", "bg-card"],
  ["bg-white/[0.02]", "bg-muted/40"],
  ["bg-white/[0.03]", "bg-card"],
  ["bg-white/[0.04]", "bg-muted"],
  ["bg-white/10", "bg-muted"],
  ["bg-white/5", "bg-muted/60"],
  ["bg-black/30", "bg-background"],
  ["bg-black/20", "bg-muted/50"],
  ["rounded-lg border border-white/[0.06] bg-white/[0.025]", "rounded-xl hairline bg-card"],
  ["rounded-md border border-white/8 bg-white/[0.02]", "rounded-xl hairline bg-card"],
  ["rounded-xl border border-white/5 bg-white/[0.02]", "rounded-xl hairline bg-muted/40"],
  ["border border-white/10 bg-black/30 px-3 py-2", "pay-input"],
  ["border border-white/10 bg-black/30", "pay-input"],
  ["rounded-lg bg-violet-600", "btn-pay btn-pay-emerald"],
  ["rounded-lg bg-violet-600/80 hover:bg-violet-600", "btn-pay btn-pay-emerald"],
  ["rounded-lg bg-amber-600", "btn-pay btn-pay-emerald"],
  ["hover:bg-violet-700", ""],
  ["hover:bg-amber-700", ""],
  ["focus:border-violet-500/50", "focus:border-ring"],
  ["focus:border-amber-500/50", "focus:border-ring"],
  ["placeholder-white/25", "placeholder:text-muted-foreground"],
  ["placeholder-white/30", "placeholder:text-muted-foreground"],
  ["bg-violet-600/80 hover:bg-violet-600 px-4", "btn-pay btn-pay-emerald px-4"],
  ["h-1 rounded-full bg-white/[0.06]", "h-1 rounded-full bg-muted"],
  ["border-white/[0.07] bg-white/[0.02]", "hairline bg-card"],
  ["border-white/[0.07] bg-white/[0.03]", "hairline bg-card"],
  ["bg-white/[0.04] border-white/[0.08]", "hairline bg-muted"],
  ["hover:bg-white/[0.02]", "hover:bg-muted/40"],
  ["w-px bg-white/[0.07]", "w-px bg-border"],
  ["decoration-white/20", "decoration-border"],
  ["font-bold text-white", "font-bold text-foreground"],
];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (name.endsWith(".tsx")) {
      let src = fs.readFileSync(p, "utf8");
      let n = 0;
      for (const [from, to] of REPLACEMENTS) {
        if (from !== to && src.includes(from)) {
          src = src.split(from).join(to);
          n++;
        }
      }
      if (n) {
        fs.writeFileSync(p, src);
        console.log("updated", name, `(${n} rules)`);
      }
    }
  }
}

walk(root);
console.log("done");
