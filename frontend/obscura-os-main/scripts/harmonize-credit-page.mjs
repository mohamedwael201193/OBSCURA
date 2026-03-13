/**
 * Light-theme class migration for CreditPage.tsx inline tab UI.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "../src/pages/CreditPage.tsx");
let src = fs.readFileSync(file, "utf8");

const REPLACEMENTS = [
  // StatChip — remove old component body via class swaps applied globally below
  ['className="flex flex-col gap-0.5 px-4 py-3 rounded-xl bg-white/[0.03] border border-white/[0.06]"',
   'className="flex flex-col gap-0.5 rounded-xl hairline bg-card px-4 py-3"'],
  ['text-[9px] tracking-[0.18em] uppercase text-white/35 font-mono', 'font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'],
  ['text-lg font-mono font-semibold text-white/90', 'font-mono text-lg font-semibold tabular-nums text-foreground'],
  ['text-[11px] tracking-[0.18em] uppercase text-white/40 font-mono', 'font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'],
  ['text-[10px] text-white/40 hover:text-white/70', 'text-sm text-muted-foreground hover:text-foreground'],
  ['text-[11px] text-white/30', 'text-sm text-muted-foreground'],
  ['rounded-2xl border border-white/[0.06] bg-white/[0.015] overflow-hidden', 'overflow-hidden rounded-2xl hairline bg-card'],
  ['border-t border-white/[0.06]', 'border-t border-border'],
  ['text-[11px] text-violet-300/80 hover:bg-violet-500/[0.06] hover:text-violet-200', 'text-sm text-foreground hover:bg-muted/60'],
  ['border-r border-white/[0.06]', 'border-r border-border'],
  ['text-[11px] text-emerald-300/80 hover:bg-emerald-500/[0.06] hover:text-emerald-200', 'text-sm text-[hsl(var(--success))] hover:bg-accent/10'],
  ['rounded-2xl border border-violet-500/15 bg-violet-950/20 p-5', 'rounded-2xl hairline bg-accent/10 p-5'],
  ['text-violet-400/70', 'text-accent'],
  ['text-[12px] font-medium text-white/80', 'text-sm font-medium text-foreground'],
  ['text-[10.5px] text-white/45', 'text-sm text-muted-foreground'],
  ['w-8 h-8 text-white/25', 'h-8 w-8 text-muted-foreground'],
  ['text-sm text-white/50', 'text-sm text-muted-foreground'],
  ['border-violet-500/40 bg-violet-500/15 text-violet-200', 'border-accent/40 bg-accent/15 text-foreground'],
  ['border-white/10 bg-white/[0.03] text-white/50 hover:text-white/80', 'hairline bg-card text-muted-foreground hover:text-foreground'],
  ['text-[10px] tracking-[0.15em] uppercase text-white/35 font-mono', 'font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'],
  ['text-[10px] text-white/45 hover:text-white/80', 'text-sm text-muted-foreground hover:text-foreground'],
  ['border-white/[0.08] bg-white/[0.03] text-white/60 hover:text-white/90 hover:border-white/20',
   'hairline bg-card text-muted-foreground hover:text-foreground hover:bg-muted/50'],
  ['rounded-2xl border border-white/[0.08] bg-white/[0.02] p-4', 'rounded-2xl hairline bg-card p-4'],
  ['text-[11px] tracking-[0.15em] uppercase text-white/40 font-mono', 'font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'],
  ['text-white/30 hover:text-white/60', 'text-muted-foreground hover:text-foreground'],
  ['text-[10px] text-white/30 hover:text-white/60', 'text-sm text-muted-foreground hover:text-foreground'],
  ['rounded-xl border border-white/[0.06] overflow-hidden group', 'group overflow-hidden rounded-xl hairline bg-card'],
  ['text-[11px] text-white/50 hover:text-white/80', 'text-sm text-muted-foreground hover:text-foreground'],
  ['text-[11px] text-white/60', 'text-sm text-muted-foreground'],
  ['text-[10.5px] text-white/50', 'text-sm text-muted-foreground'],
  ['text-violet-400 mt-0.5', 'text-accent mt-0.5'],
  ['text-white/70', 'text-foreground'],
  ['rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 space-y-4', 'space-y-4 rounded-2xl hairline bg-card p-5'],
  ['text-sm font-medium text-white/80', 'text-sm font-medium text-foreground'],
  ['text-[10px] text-white/40 font-mono', 'font-mono text-[10px] text-muted-foreground'],
  ['rounded-xl border border-violet-500/20 bg-violet-950/20 p-3', 'rounded-xl hairline bg-muted/50 p-3'],
  ['text-[9px] uppercase tracking-wider text-white/35 mb-1 font-mono', 'mb-1 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'],
  ['text-[14px] font-mono font-semibold text-violet-300', 'font-mono text-sm font-semibold text-foreground'],
  ['rounded-xl border border-emerald-500/20 bg-emerald-950/20 p-3', 'rounded-xl hairline bg-accent/10 p-3'],
  ['text-[14px] font-mono text-emerald-300', 'font-mono text-sm text-[hsl(var(--success))]'],
  ['flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-emerald-500/40',
   'pay-input flex-1'],
  ['px-4 py-2.5 rounded-lg text-sm bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 hover:bg-emerald-500/20 disabled:opacity-50',
   'btn-pay btn-pay-emerald disabled:opacity-50'],
  ['px-4 py-2.5 rounded-lg text-sm bg-white/[0.04] border border-white/10 text-white/80 hover:bg-white/[0.07] disabled:opacity-50',
   'btn-pay btn-pay-ghost disabled:opacity-50'],
  ['text-xs text-white/60', 'text-xs text-muted-foreground'],
  ['text-sm font-medium text-white/80', 'text-sm font-medium text-foreground'],
  ['text-[10.5px] text-white/40 mt-0.5', 'mt-0.5 text-sm text-muted-foreground'],
  ['rounded-2xl border border-white/[0.06] bg-white/[0.015] p-8', 'rounded-2xl hairline bg-card p-8'],
  ['w-8 h-8 text-white/20', 'h-8 w-8 text-muted-foreground'],
  ['text-sm text-white/40', 'text-sm text-muted-foreground'],
  ['text-[10.5px] text-white/30 text-center', 'text-center text-sm text-muted-foreground'],
  ['fixed inset-0 z-40 bg-black/50 backdrop-blur-sm', 'fixed inset-0 z-40 bg-foreground/20 backdrop-blur-sm'],
  ['fixed right-0 top-0 bottom-0 z-50 w-full sm:w-[420px] border-l border-white/[0.08] bg-[#0c0f14] shadow-2xl overflow-y-auto',
   'fixed right-0 top-0 bottom-0 z-50 w-full overflow-y-auto border-l hairline bg-card shadow-2xl sm:w-[420px]'],
  ['sticky top-0 bg-[#0c0f14]/95 backdrop-blur border-b border-white/[0.06] px-5 py-4',
   'sticky top-0 z-10 border-b border-border bg-card/95 px-5 py-4 backdrop-blur'],
  ['text-sm font-medium text-white/80', 'text-sm font-medium text-foreground'],
  ['text-white/40 hover:text-white/80', 'text-muted-foreground hover:text-foreground'],
  ['text-[9px] tracking-[0.2em] uppercase text-white/30 font-mono mb-3', 'mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground'],
];

for (const [from, to] of REPLACEMENTS) {
  if (src.includes(from)) src = src.split(from).join(to);
}

fs.writeFileSync(file, src);
console.log("CreditPage.tsx harmonized");
